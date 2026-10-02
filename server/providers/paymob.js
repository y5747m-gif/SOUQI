import { config } from '../config.js';
import { hmacSha512, safeEqualHex } from '../security.js';
import { requestJson } from './http.js';

export function paymobPlanId(cycle) {
  return cycle === 'annual' ? config.PAYMOB_PLUS_ANNUAL_PLAN_ID : config.PAYMOB_PLUS_MONTHLY_PLAN_ID;
}
async function authToken() {
  if (!config.PAYMOB_API_KEY) throw new Error('Paymob API key is not configured');
  const response = await requestJson(`${config.PAYMOB_BASE_URL}/api/auth/tokens`, {method: 'POST', body: JSON.stringify({api_key: config.PAYMOB_API_KEY})});
  return response.token;
}
export async function cancelPaymobSubscription(providerSubscriptionId) {
  const token = await authToken();
  return requestJson(`${config.PAYMOB_BASE_URL}/api/acceptance/subscriptions/${encodeURIComponent(providerSubscriptionId)}/cancel`, {method: 'POST', headers: {Authorization: `Bearer ${token}`}, body: '{}'});
}
export async function createPaymobSubscriptionIntention({user, subscription, merchantReference}) {
  const planId = paymobPlanId(subscription.billing_cycle);
  if (!config.PAYMOB_SECRET_KEY || !config.PAYMOB_PUBLIC_KEY || !config.PAYMOB_CARD_3DS_INTEGRATION_ID || !planId) {
    throw new Error('Paymob is not configured');
  }
  const names = user.full_name.trim().split(/\s+/);
  const body = {
    amount: subscription.amount_cents,
    currency: 'EGP',
    payment_methods: [Number(config.PAYMOB_CARD_3DS_INTEGRATION_ID)],
    subscription_plan_id: Number(planId),
    items: [{name: subscription.plan_code, amount: subscription.amount_cents, description: 'SOUQI Plus subscription', quantity: 1}],
    billing_data: {
      first_name: names[0] || 'SOUQI', last_name: names.slice(1).join(' ') || 'User',
      phone_number: user.phone, email: user.email,
      apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA', city: 'Cairo', state: 'Cairo', country: 'EGY'
    },
    special_reference: merchantReference,
    extras: {subscription_id: subscription.id, user_id: user.id},
    notification_url: `${config.APP_URL}/api/webhooks/paymob`,
    redirection_url: `${config.APP_URL}/souqi.html#/plans?payment=return`
  };
  const result = await requestJson(`${config.PAYMOB_BASE_URL}/v1/intention/`, {
    method: 'POST', headers: {Authorization: `Token ${config.PAYMOB_SECRET_KEY}`}, body: JSON.stringify(body)
  });
  return {...result, checkoutUrl: `${config.PAYMOB_BASE_URL}/unifiedcheckout/?publicKey=${encodeURIComponent(config.PAYMOB_PUBLIC_KEY)}&clientSecret=${encodeURIComponent(result.client_secret)}`, planId};
}

const processedFields = ['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order.id','owner','pending','source_data.pan','source_data.sub_type','source_data.type','success'];
function get(object, path) { return path.split('.').reduce((v, k) => v == null ? '' : v[k], object) ?? ''; }
export function verifyPaymobWebhook(payload, suppliedHmac) {
  if (!config.PAYMOB_HMAC_SECRET || !suppliedHmac) return false;
  const object = payload.obj || payload;
  const canonical = processedFields.map(field => String(get(object, field))).join('');
  return safeEqualHex(hmacSha512(canonical, config.PAYMOB_HMAC_SECRET), String(suppliedHmac).toLowerCase());
}
