# اشتراكات سوقي — Paymob وFawryPay

## التدفق الآمن

1. التطبيق يرسل `planCode/provider/paymentMethod` فقط إلى `POST /api/subscriptions/checkout` مع JWT.
2. السعر يُقرأ من الخادم (`plus_monthly=4900` قرش، `plus_annual=41900` قرش)، ولا يُقبل مبلغ من العميل.
3. **Paymob Card:** الخادم ينشئ Intention مع `subscription_plan_id` و3DS integration، ثم يعيد `checkoutUrl/clientSecret`. بيانات PAN/CVV تُدخل داخل Unified Checkout أو Mobile SDK الخاص بـ Paymob ولا تمر بسيرفر سوقي. بعد 3DS تنشئ Paymob التوكين وتجري الخصم الدوري عبر MOTO integration.
4. **Fawry reference:** الخادم يوقّع الطلب ويعيد `referenceCode`. الاشتراك لا يتفعّل إلا بعد Webhook موقّع بحالة `PAID`. المرجع النقدي ليس خصمًا تلقائيًا؛ كل دورة تحتاج مرجعًا جديدًا ودفع العميل.
5. **Fawry card tokenizer (Mobile SDK):** الـ SDK يتعامل مع بيانات البطاقة ويرجع `cardToken + last4`. يرسل التطبيق التوكين فقط إلى `POST /api/payment-methods/fawry-token`. يخزن الخادم التوكين مشفرًا AES-256-GCM، ولا يخزن CVV أو PAN أبدًا. الخصم غير الحاضر (MOTO) يحتاج تفعيلًا تعاقديًا صريحًا من Fawry؛ الكود لا يدّعي تفعيله افتراضيًا.
6. Webhooks هي مصدر الحقيقة. Redirect/SDK callback لتحسين الواجهة فقط.

## إعداد Paymob

- أنشئ 3DS Card Integration وMOTO Integration من لوحة Paymob.
- أنشئ خطتين في Subscription Module بتكرار `30` و`360` يومًا، وضع IDs في env.
- ضع webhook: `https://YOUR_DOMAIN/api/webhooks/paymob` وHMAC secret.
- Unified Checkout:
  `https://accept.paymob.com/unifiedcheckout/?publicKey=PUBLIC_KEY&clientSecret=CLIENT_SECRET`
- Mobile SDK: الخادم ينشئ Intention، والتطبيق يمرر `clientSecret` إلى SDK. لا ترسل secret key للتطبيق.

## إعداد FawryPay

- اطلب merchant code وsecure key وفعّل Server Notification V2.
- webhook: `https://YOUR_DOMAIN/api/webhooks/fawry`.
- للتوكين على Android/iOS استخدم CardTokenizer من SDK؛ أرسل الناتج فقط إلى API سوقي.
- لا تحفظ CVV. إن كانت اتفاقيتك لا تدعم MOTO، استخدم reference code أو recurring invoice لكل تجديد.

## التشغيل

```bash
cp .env.example .env
npm install
createdb souqi
npm run db:migrate
npm start
```

إنشاء JWT يتم من نظام تسجيل الدخول الحقيقي ويجب أن يحتوي `sub=user_uuid` وخوارزمية HS256. للاختبار أنشئ مستخدمًا في PostgreSQL ثم استخدم JWT صالحًا.

## نقاط الحماية المطبقة

- JWT، Zod validation، أسعار server-side، Helmet/CORS، مهلة لاتصالات البوابات.
- تشفير card token بـ AES-256-GCM ومفتاح خارج قاعدة البيانات.
- تحقق timing-safe من HMAC/signatures.
- Webhook idempotency عبر `webhook_events` وقيود فريدة.
- معاملات DB وقفل المستخدم لمنع اشتراكين نشطين.
- عدم تسجيل Authorization/cardToken/CVV في logs.
- لا توجد مفاتيح حقيقية داخل المستودع.

> قبل الإنتاج: أكمل مراجعة PCI DSS/SAQ المناسبة، استخدم KMS بدل مفتاح env، فعّل TLS، تدوير الأسرار، مراقبة webhooks، وراجع عينات payload النهائية مع مدير حساب كل بوابة.
