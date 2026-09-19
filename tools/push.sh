#!/usr/bin/env bash
# ============================================================
#  سوقي | SOUQI — سكربت الرفع على GitHub
#  الاستخدام:
#    SOUQI_REPO="https://github.com/USER/souqi.git" \
#    SOUQI_TOKEN="ghp_xxx" bash tools/push.sh
#
#  أو مع إنشاء المستودع تلقائيًا (يحتاج توكن بصلاحية Administration)؛
#    SOUQI_REPO="https://github.com/USER/souqi.git" \
#    SOUQI_TOKEN="ghp_xxx" bash tools/push.sh --create
#
#  ملاحظات أمان:
#   • التوكن يُستخدم في أمر الرفع فقط ولا يُخزَّن على القرص.
#   • بعد الرفع يرجع رابط الـ remote نضيفًا بدون توكن.
#   • أي خطأ يُطبع بعد إخفاء التوكن.
# ============================================================
set -u
set -o pipefail
cd "$(dirname "$0")/.."

REPO="${SOUQI_REPO:-}"
TOKEN="${SOUQI_TOKEN:-}"
CREATE="${1:-}"

if [ -z "$REPO" ] || [ -z "$TOKEN" ]; then
  echo "❌ ناقص بيانات. الصيغة:"
  echo '   SOUQI_REPO="https://github.com/USER/souqi.git" SOUQI_TOKEN="ghp_xxx" bash tools/push.sh'
  exit 1
fi

# ── تنظيف الرابط من أي توكن مضمّن فيه ──
CLEAN="$(printf '%s' "$REPO" | sed -E 's#https://[^@/]+@#https://#')"
AUTH="$CLEAN"
case "$CLEAN" in
  https://*) AUTH="$(printf '%s' "$CLEAN" | sed -E "s#https://#https://x-access-token:${TOKEN}@#")" ;;
esac

# ── إخفاء التوكن من أي مخرجات ──
mask() { sed -e "s#${TOKEN}#***#g" -e 's#x-access-token:[^@]*@#x-access-token:***@#g'; }

echo "▸ الفرع الحالي: $(git rev-parse --abbrev-ref HEAD)"
echo "▸ آخر التزام: $(git log --oneline -1)"
echo "▸ المستودع الهدف: $CLEAN"

# ── (اختياري) إنشاء المستودع عبر API ──
if [ "$CREATE" = "--create" ]; then
  NAME="$(printf '%s' "$CLEAN" | sed -E 's#.*/([^/]+)\.git$#\1#; s#.*/([^/]+)$#\1#')"
  echo "▸ بنحاول إنشاء المستودع «$NAME» إن لم يكن موجودًا…"
  CODE="$(curl -s -o /tmp/soq-create.json -w '%{http_code}' -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$NAME\",\"private\":true,\"description\":\"سوقي | SOUQI — منصة ذكية لاكتشاف المتاجر والمنتجات والعروض حولك\"}")"
  case "$CODE" in
    201) echo "  ✔ تم إنشاء المستودع (خاص)" ;;
    422) echo "  ℹ️ المستودع موجود بالفعل — أكمل الرفع" ;;
    401|403) echo "  ⚠️ التوكن ما عندهوش صلاحية إنشاء مستودعات (Administration: Read and write). اعمله من الموقع وكمّل." ;;
    *) echo "  ⚠️ رد غير متوقع من GitHub: HTTP $CODE (هنكمل الرفع على أي حال)" ;;
  esac
fi

# ── ضبط الـ remote والرفع ──
git remote remove origin 2>/dev/null || true
git remote add origin "$CLEAN"

echo "▸ جلب حالة الفرع البعيد أولًا (عشان force-with-lease يكون دقيق)…"
GIT_TERMINAL_PROMPT=0 git fetch "$AUTH" "+refs/heads/*:refs/remotes/origin/*" >/dev/null 2>&1 || true

echo "▸ جاري الرفع…"
PUSH_OUT="$(GIT_TERMINAL_PROMPT=0 git push "$AUTH" "HEAD:main" 2>&1)"; PUSH_RC=$?
printf '%s\n' "$PUSH_OUT" | mask
if [ "$PUSH_RC" -eq 0 ]; then
  git branch --set-upstream-to=origin/main main >/dev/null 2>&1 || true
  echo
  echo "✅ تم الرفع بنجاح إلى: $CLEAN"
  echo "   الفرع: main · الالتزام: $(git log --oneline -1)"
  echo "   افتح: $(printf '%s' "$CLEAN" | sed -E 's#\.git$##')"
else
  echo
  echo "❌ فشل الرفع. الأسباب الشائعة:"
  echo "   • التوكن غلط أو منتهي أو ممسوح"
  echo "   • المستودع ما عليه صلاحية Contents: Read and write"
  echo "   • المستودع فيه ملفات (README مثلاً) → نفّذ: git pull --rebase origin main ثم أعِد المحاولة"
  exit 1
fi
