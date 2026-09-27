#!/usr/bin/env bash
set -euo pipefail

echo "[*] Gün 5: Session Lifecycle, Invalidation ve JWT Claims Doğrulama Testi"

node server.js > /dev/null 2>&1 &
SERVER_PID=$!
# trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT ile sunucu süreci otomatik olarak sonlandırılır. || su anlama gelir: eğer kill komutu başarısız olursa, hata vermeden devam et. true komutu ise her zaman başarılı döner ve böylece scriptin hata ile durmasını engeller.
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:3020"

echo "[*] 1. Test: Login yapılıyor ve session ID alınıyor..."
LOGIN_RESP=$(curl -s -X POST "$API_URL/api/login")
# Session ID JSON yanıtından ayrıştırılıyor, | su anlama gelir: pipe (boru) işleviyle komutların birbirine bağlanmasını sağlar. Yani LOGIN_RESP çıktısı node.js ile parse edilip sessionId alınır.
SID=$(echo "$LOGIN_RESP" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).sessionId)')

# Dashboard'a ilk erişim doğrulanıyor
INITIAL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --cookie "sid=$SID" "$API_URL/api/dashboard")
if [ "$INITIAL_CHECK" -eq 200 ]; then
    echo "[+] Başarılı: Giriş yapıldı ve Dashboard'a erişildi."
else
    echo "[-] Hata: İlk oturum açılamadı!"
    exit 1
fi

echo "[*] 2. Test: Şifre değiştiriliyor (Tüm oturumlar düşmeli)..."
curl -s -X POST "$API_URL/api/change-password" > /dev/null

POST_PW_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --cookie "sid=$SID" "$API_URL/api/dashboard")
if [ "$POST_PW_CHECK" -eq 401 ]; then
    echo "[+] BAŞARILI: Şifre değişimi sonrası eski session iptal edildi (HTTP 401)."
else
    echo "[-] HATA: Eski session iptal edilemedi! HTTP Kodu: $POST_PW_CHECK"
    exit 1
fi

echo "[*] 3. Test: JWT Audience (aud) uyuşmazlığı testi..."
TOKENS=$(curl -s "$API_URL/api/generate-tokens")
WRONG_AUD_TOKEN=$(echo "$TOKENS" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).wrongAudienceToken)')
EXPIRED_TOKEN=$(echo "$TOKENS" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).expiredToken)')
VALID_TOKEN=$(echo "$TOKENS" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).validToken)')

STATUS_AUD=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $WRONG_AUD_TOKEN" "$API_URL/api/billing")
if [ "$STATUS_AUD" -eq 403 ]; then
    echo "[+] BAŞARILI: Yanlış Audience (aud) taşıyan geçerli imzalı token reddedildi."
else
    echo "[-] HATA: Yanlış audience kabul edildi! HTTP Kodu: $STATUS_AUD"
    exit 1
fi

echo "[*] 4. Test: Süresi geçmiş (exp expired) JWT testi..."
STATUS_EXP=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $EXPIRED_TOKEN" "$API_URL/api/billing")
if [ "$STATUS_EXP" -eq 403 ]; then
    echo "[+] BAŞARILI: Süresi dolmuş token reddedildi (HTTP 403)."
else
    echo "[-] HATA: Süresi geçmiş token kabul edildi! HTTP Kodu: $STATUS_EXP"
    exit 1
fi

echo "[*] 5. Test: Tüm claims şartlarını sağlayan meşru token testi..."
STATUS_VALID=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $VALID_TOKEN" "$API_URL/api/billing")
if [ "$STATUS_VALID" -eq 200 ]; then
    echo "[+] BAŞARILI: Doğru claims içeren token onaylandı (HTTP 200)."
else
    echo "[-] HATA: Meşru token onaylanamadı! HTTP Kodu: $STATUS_VALID"
    exit 1
fi

echo "[+] Gün 5 testleri başarıyla geçti."
