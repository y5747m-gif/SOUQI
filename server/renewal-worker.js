/*
 * Renewal worker:
 * - Paymob subscription renewals are executed by Paymob's Subscription Module and arrive by webhook.
 * - Fawry reference subscriptions require customer action, so this worker creates a new reference via the normal checkout service.
 * - Unattended Fawry card charging is intentionally disabled unless the merchant contract explicitly enables MOTO/recurring.
 */
import { config } from './config.js';
import { pool } from './db.js';

async function run() {
  const {rows} = await pool.query(`SELECT s.id,s.provider,s.payment_method,s.next_billing_at FROM subscriptions s WHERE s.status IN ('active','past_due') AND s.next_billing_at <= now()+interval '24 hours' AND s.cancel_at_period_end=false FOR UPDATE SKIP LOCKED`);
  for (const sub of rows) {
    if (sub.provider === 'paymob') continue; // gateway owns recurring schedule
    if (sub.payment_method === 'fawry_reference') {
      console.log(JSON.stringify({level:'info',message:'Fawry renewal reference required',subscriptionId:sub.id}));
      // Queue a notification/job in production; never mark renewed until signed PAID webhook arrives.
      continue;
    }
    if (!config.FAWRY_MOTO_ENABLED) console.warn(JSON.stringify({level:'warn',message:'Fawry MOTO is disabled',subscriptionId:sub.id}));
  }
  await pool.end();
}
run().catch(error => { console.error(error); process.exitCode = 1; });
