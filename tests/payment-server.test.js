import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ||= 'postgresql://unused/unused';
process.env.JWT_SECRET ||= '12345678901234567890123456789012';
process.env.TOKEN_ENCRYPTION_KEY ||= 'a'.repeat(64);
process.env.FAWRY_MERCHANT_CODE ||= 'merchant';
process.env.FAWRY_SECURE_KEY ||= 'secret';
process.env.PAYMOB_HMAC_SECRET ||= 'hmac-secret';

const security = await import('../server/security.js');
const fawry = await import('../server/providers/fawry.js');

test('card token encryption uses authenticated encryption', () => {
  const value = 'tok_test_sensitive_123';
  const envelope = security.encryptToken(value);
  assert.notEqual(envelope, value);
  assert.equal(envelope.split('.').length, 3);
  assert.equal(security.decryptToken(envelope), value);
});

test('safeEqualHex rejects malformed signatures', () => {
  assert.equal(security.safeEqualHex('aa', 'ab'), false);
  assert.equal(security.safeEqualHex('aa', 'aa'), true);
  assert.equal(security.safeEqualHex('', 'aa'), false);
});

test('Fawry request signature follows documented canonical order', () => {
  const got = fawry.fawryRequestSignature({merchantReference:'ref1',customerProfileId:'u1',paymentMethod:'PayAtFawry',amountCents:4900});
  const expected = security.sha256('merchant'+'ref1'+'u1'+'PayAtFawry'+'49.00'+'secret');
  assert.equal(got, expected);
});
