import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  JWT_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  PAYMOB_BASE_URL: z.string().url().default('https://accept.paymob.com'),
  PAYMOB_API_KEY: z.string().optional().default(''),
  PAYMOB_SECRET_KEY: z.string().optional().default(''),
  PAYMOB_PUBLIC_KEY: z.string().optional().default(''),
  PAYMOB_HMAC_SECRET: z.string().optional().default(''),
  PAYMOB_CARD_3DS_INTEGRATION_ID: z.string().optional().default(''),
  PAYMOB_MOTO_INTEGRATION_ID: z.string().optional().default(''),
  PAYMOB_PLUS_MONTHLY_PLAN_ID: z.string().optional().default(''),
  PAYMOB_PLUS_ANNUAL_PLAN_ID: z.string().optional().default(''),
  FAWRY_BASE_URL: z.string().url().default('https://atfawry.fawrystaging.com'),
  FAWRY_MERCHANT_CODE: z.string().optional().default(''),
  FAWRY_SECURE_KEY: z.string().optional().default(''),
  FAWRY_WEBHOOK_URL: z.string().url().optional(),
  FAWRY_MOTO_ENABLED: z.enum(['true', 'false']).default('false'),
  FAWRY_MOTO_CHARGE_URL: z.string().url().optional()
});

export const config = envSchema.parse(process.env);
export const plans = Object.freeze({
  plus_monthly: {code: 'plus_monthly', cycle: 'monthly', amountCents: 4900, days: 30},
  plus_annual: {code: 'plus_annual', cycle: 'annual', amountCents: 41900, days: 360}
});
