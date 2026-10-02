import { config } from '../config.js';
import { sha256, safeEqualHex } from '../security.js';
import { requestJson } from './http.js';

const amount = cents => (cents / 100).toFixed(2);
export function fawryRequestSignature({merchantReference, customerProfileId, paymentMethod, amountCents, cardToken = '', cvv = ''}) {
  return sha256(config.FAWRY_MERCHANT_CODE + merchantReference + (customerProfileId || '') + paymentMethod + amount(amountCents) + cardToken + cvv + config.FAWRY_SECURE_KEY);
}
export async function createFawryReference({user, subscription, merchantReference}) {
  if (!config.FAWRY_MERCHANT_CODE || !config.FAWRY_SECURE_KEY) throw new Error('FawryPay is not configured');
  const paymentMethod = 'PayAtFawry';
  const body = {
    merchantCode: config.FAWRY_MERCHANT_CODE,
    merchantRefNum: merchantReference,
    customerProfileId: user.fawry_customer_id || user.id,
    customerName: user.full_name, customerMobile: user.phone, customerEmail: user.email,
    paymentMethod, amount: amount(subscription.amount_cents), currencyCode: 'EGP', language: 'ar-eg',
    paymentExpiry: Date.now() + 72 * 60 * 60 * 1000,
    description: 'SOUQI Plus subscription', orderWebHookUrl: config.FAWRY_WEBHOOK_URL,
    chargeItems: [{itemId: subscription.plan_code, description: 'SOUQI Plus', price: amount(subscription.amount_cents), quantity: 1}],
    signature: fawryRequestSignature({merchantReference, customerProfileId: user.fawry_customer_id || user.id, paymentMethod, amountCents: subscription.amount_cents})
  };
  return requestJson(`${config.FAWRY_BASE_URL}/ECommerceWeb/Fawry/payments/charge`, {method: 'POST', body: JSON.stringify(body)});
}
export function verifyFawryWebhook(body) {
  if (!config.FAWRY_SECURE_KEY || !body.messageSignature) return false;
  const canonical = String(body.fawryRefNumber || '') + String(body.merchantRefNumber || '') + amount(Math.round(Number(body.paymentAmount || 0) * 100)) + amount(Math.round(Number(body.orderAmount || 0) * 100)) + String(body.orderStatus || '') + String(body.paymentMethod || '') + String(body.paymentRefrenceNumber || '') + config.FAWRY_SECURE_KEY;
  return safeEqualHex(sha256(canonical), String(body.messageSignature).toLowerCase());
}
