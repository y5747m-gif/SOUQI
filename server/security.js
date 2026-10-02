import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

const encryptionKey = Buffer.from(config.TOKEN_ENCRYPTION_KEY, 'hex');
export function encryptToken(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}
export function decryptToken(envelope) {
  const [iv, tag, ciphertext] = String(envelope).split('.').map(x => Buffer.from(x, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
export function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
export function hmacSha512(value, secret) { return crypto.createHmac('sha512', secret).update(String(value)).digest('hex'); }
export function safeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length || !/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b) || a.length % 2) return false;
  const left = Buffer.from(a, 'hex'), right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
export function authenticate(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const payload = jwt.verify(token, config.JWT_SECRET, {algorithms: ['HS256']});
    req.auth = {userId: payload.sub};
    if (!req.auth.userId) throw new Error('missing subject');
    next();
  } catch {
    res.status(401).json({error: 'unauthorized'});
  }
}
