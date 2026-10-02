import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { config, plans } from './config.js';
import { pool, withTransaction } from './db.js';
import { authenticate, encryptToken } from './security.js';
import { createPaymobSubscriptionIntention, cancelPaymobSubscription, verifyPaymobWebhook } from './providers/paymob.js';
import { createFawryReference, verifyFawryWebhook } from './providers/fawry.js';

function redactPaymentPayload(value) {
  if (Array.isArray(value)) return value.map(redactPaymentPayload);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, /token|client_secret|cvv|card_number|pan/i.test(key) ? '[REDACTED]' : redactPaymentPayload(child)]));
}

const app = express();
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors({origin: config.APP_URL, credentials: true}));
app.use(pinoHttp({redact: ['req.headers.authorization','req.body.cardToken','req.body.cvv']}));
app.use(express.json({limit: '128kb'}));
app.use(express.static(new URL('..', import.meta.url).pathname));

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1'); res.json({ok: true});
});

const checkoutSchema = z.object({
  planCode: z.enum(['plus_monthly','plus_annual']),
  provider: z.enum(['paymob','fawry']),
  paymentMethod: z.enum(['card','fawry_reference'])
}).superRefine((v, ctx) => {
  if (v.provider === 'paymob' && v.paymentMethod !== 'card') ctx.addIssue({code: 'custom', message: 'Paymob checkout requires card'});
  if (v.provider === 'fawry' && v.paymentMethod !== 'fawry_reference') ctx.addIssue({code: 'custom', message: 'Use Fawry reference checkout'});
});

app.post('/api/subscriptions/checkout', authenticate, async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body), plan = plans[input.planCode];
    const record = await withTransaction(async db => {
      const {rows: [user]} = await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [req.auth.userId]);
      if (!user) { const error = new Error('User not found'); error.status = 404; throw error; }
      const existing = await db.query("SELECT id FROM subscriptions WHERE user_id=$1 AND status IN ('pending','active','past_due','suspended')", [user.id]);
      if (existing.rowCount) { const error = new Error('A live subscription already exists'); error.status = 409; throw error; }
      const providerPlanId = input.provider === 'paymob' ? (plan.cycle === 'annual' ? config.PAYMOB_PLUS_ANNUAL_PLAN_ID : config.PAYMOB_PLUS_MONTHLY_PLAN_ID) : null;
      const {rows: [subscription]} = await db.query(`INSERT INTO subscriptions(user_id,plan_code,billing_cycle,amount_cents,provider,payment_method,provider_plan_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [user.id, plan.code, plan.cycle, plan.amountCents, input.provider, input.paymentMethod, providerPlanId]);
      const merchantReference = `SQ-${Date.now()}-${randomUUID().slice(0,8)}`;
      const {rows: [transaction]} = await db.query(`INSERT INTO transactions(subscription_id,user_id,provider,type,amount_cents,merchant_reference,status) VALUES($1,$2,$3,'initial',$4,$5,'created') RETURNING *`, [subscription.id,user.id,input.provider,plan.amountCents,merchantReference]);
      return {user, subscription, transaction, merchantReference};
    });

    let gateway;
    try {
      if (input.provider === 'paymob') gateway = await createPaymobSubscriptionIntention(record);
      else gateway = await createFawryReference(record);
    } catch (gatewayError) {
      await withTransaction(async db => {
        await db.query(`UPDATE transactions SET status='failed',failure_message=$2,updated_at=now() WHERE id=$1`, [record.transaction.id, gatewayError.message]);
        await db.query(`UPDATE subscriptions SET status='expired',last_failure_reason=$2,updated_at=now() WHERE id=$1`, [record.subscription.id, gatewayError.message]);
      });
      throw gatewayError;
    }
    const gatewayAudit = {id: gateway.id || null, intentionOrderId: gateway.intention_order_id || null, merchantRefNumber: gateway.merchantRefNumber || null, referenceNumber: gateway.referenceNumber || null, orderStatus: gateway.orderStatus || null, statusCode: gateway.statusCode || null};
    await pool.query(`UPDATE transactions SET status='pending',provider_order_id=$2,provider_reference_code=$3,raw_response=$4,updated_at=now() WHERE id=$1`, [record.transaction.id, String(gateway.intention_order_id || gateway.merchantRefNumber || ''), String(gateway.referenceNumber || ''), JSON.stringify(gatewayAudit)]);
    res.status(201).json({subscriptionId: record.subscription.id, transactionId: record.transaction.id, provider: input.provider, checkoutUrl: gateway.checkoutUrl, clientSecret: gateway.client_secret, referenceCode: gateway.referenceNumber, expiresAt: gateway.paymentExpiry || null});
  } catch (error) { next(error); }
});

app.get('/api/subscriptions/me', authenticate, async (req, res, next) => {
  try {
    const {rows} = await pool.query(`SELECT s.*, COALESCE(json_agg(t ORDER BY t.created_at DESC) FILTER (WHERE t.id IS NOT NULL),'[]') transactions FROM subscriptions s LEFT JOIN transactions t ON t.subscription_id=s.id WHERE s.user_id=$1 GROUP BY s.id ORDER BY s.created_at DESC LIMIT 1`, [req.auth.userId]);
    res.json(rows[0] || null);
  } catch (error) { next(error); }
});

app.post('/api/payment-methods/fawry-token', authenticate, async (req, res, next) => {
  try {
    const input = z.object({cardToken: z.string().min(16).max(2048), last4: z.string().regex(/^\d{4}$/), brand: z.string().max(30).optional(), customerId: z.string().max(100)}).parse(req.body);
    await pool.query(`UPDATE users SET card_token=$2,card_provider='fawry',card_last4=$3,card_brand=$4,fawry_customer_id=$5,updated_at=now() WHERE id=$1`, [req.auth.userId, encryptToken(input.cardToken), input.last4, input.brand || null, input.customerId]);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.post('/api/subscriptions/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const {rows: [sub]} = await pool.query(`SELECT * FROM subscriptions WHERE id=$1 AND user_id=$2 AND status IN ('active','past_due')`, [req.params.id, req.auth.userId]);
    if (!sub) return res.status(404).json({error: 'subscription_not_found'});
    // Stop the gateway schedule before changing local state. Fawry references have no automatic schedule to cancel.
    if (sub.provider === 'paymob' && sub.provider_subscription_id) await cancelPaymobSubscription(sub.provider_subscription_id);
    await pool.query(`UPDATE subscriptions SET cancel_at_period_end=true,updated_at=now() WHERE id=$1`, [sub.id]);
    res.json({id: sub.id, cancelAtPeriodEnd: true, currentPeriodEnd: sub.current_period_end});
  } catch (error) { next(error); }
});

app.post('/api/webhooks/paymob', async (req, res, next) => {
  try {
    if (!verifyPaymobWebhook(req.body, req.query.hmac || req.headers['x-paymob-hmac'])) return res.status(401).json({error: 'invalid_signature'});
    const obj = req.body.obj || req.body, merchantRef = obj.order?.merchant_order_id || obj.merchant_order_id || obj.special_reference;
    const eventKey = String(obj.id || req.body.id || randomUUID());
    await withTransaction(async db => {
      const inserted = await db.query(`INSERT INTO webhook_events(provider,event_key,payload) VALUES('paymob',$1,$2) ON CONFLICT DO NOTHING RETURNING id`, [eventKey, JSON.stringify(redactPaymentPayload(req.body))]);
      if (!inserted.rowCount) return;
      const status = obj.success === true && obj.pending !== true ? 'paid' : (obj.pending ? 'pending' : 'failed');
      const {rows: [tx]} = await db.query(`UPDATE transactions SET status=$2,provider_transaction_id=$3,raw_response=$4,paid_at=CASE WHEN $2='paid' THEN now() ELSE paid_at END,failure_message=CASE WHEN $2='failed' THEN $5 ELSE NULL END,updated_at=now() WHERE merchant_reference=$1 RETURNING *`, [merchantRef,status,String(obj.id),JSON.stringify(redactPaymentPayload(req.body)),obj.data?.message || obj.error_occured || null]);
      if (tx) await applyTransactionState(db, tx, status, obj.subscription_id || obj.subscription?.id);
      await db.query('UPDATE webhook_events SET processed_at=now() WHERE id=$1', [inserted.rows[0].id]);
    });
    res.sendStatus(200);
  } catch (error) { next(error); }
});

app.post('/api/webhooks/fawry', async (req, res, next) => {
  try {
    if (!verifyFawryWebhook(req.body)) return res.status(401).json({error: 'invalid_signature'});
    const eventKey = `${req.body.merchantRefNumber}:${req.body.orderStatus}:${req.body.paymentTime || ''}`;
    await withTransaction(async db => {
      const inserted = await db.query(`INSERT INTO webhook_events(provider,event_key,payload) VALUES('fawry',$1,$2) ON CONFLICT DO NOTHING RETURNING id`, [eventKey, JSON.stringify(redactPaymentPayload(req.body))]);
      if (!inserted.rowCount) return;
      const map = {PAID:'paid',FAILED:'failed',CANCELED:'cancelled',EXPIRED:'expired',REFUNDED:'refunded',PARTIAL_REFUNDED:'refunded',NEW:'pending'};
      const status = map[req.body.orderStatus] || 'pending';
      const {rows: [tx]} = await db.query(`UPDATE transactions SET status=$2,provider_transaction_id=$3,provider_reference_code=$4,raw_response=$5,paid_at=CASE WHEN $2='paid' THEN now() ELSE paid_at END,failure_code=$6,failure_message=$7,updated_at=now() WHERE merchant_reference=$1 RETURNING *`, [req.body.merchantRefNumber,status,String(req.body.paymentRefrenceNumber || req.body.fawryRefNumber || ''),String(req.body.fawryRefNumber || ''),JSON.stringify(redactPaymentPayload(req.body)),String(req.body.failureErrorCode || ''),req.body.failureReason || null]);
      if (tx) await applyTransactionState(db, tx, status);
      await db.query('UPDATE webhook_events SET processed_at=now() WHERE id=$1', [inserted.rows[0].id]);
    });
    res.sendStatus(200);
  } catch (error) { next(error); }
});

async function applyTransactionState(db, tx, status, providerSubscriptionId = null) {
  if (status === 'paid') {
    const {rows: [sub]} = await db.query('SELECT * FROM subscriptions WHERE id=$1 FOR UPDATE', [tx.subscription_id]);
    const days = sub.billing_cycle === 'annual' ? 360 : 30;
    await db.query(`UPDATE subscriptions SET status='active',provider_subscription_id=COALESCE($2,provider_subscription_id),current_period_start=now(),current_period_end=now()+($3||' days')::interval,next_billing_at=now()+($3||' days')::interval,failure_count=0,last_failure_reason=NULL,updated_at=now() WHERE id=$1`, [sub.id, providerSubscriptionId ? String(providerSubscriptionId) : null, days]);
  } else if (['failed','expired','cancelled'].includes(status)) {
    await db.query(`UPDATE subscriptions SET status=CASE WHEN status='active' THEN 'past_due'::subscription_status ELSE status END,failure_count=failure_count+1,last_failure_reason=$2,updated_at=now() WHERE id=$1`, [tx.subscription_id, tx.failure_message || status]);
  }
}

app.use((error, _req, res, _next) => {
  const validation = error instanceof z.ZodError;
  const status = error.status || (validation ? 400 : 500);
  res.status(status).json({error: validation ? 'validation_error' : (status === 500 ? 'internal_error' : error.message), details: validation ? error.flatten() : undefined});
});

app.listen(config.PORT, '0.0.0.0', () => console.log(`SOUQI API listening on ${config.PORT}`));
