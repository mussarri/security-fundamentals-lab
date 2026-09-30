#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  DAY 2-3: Authentication Lifecycle Lab - Test Suite      "
echo "=========================================================="

node gap-closure-v2/day-02-03-auth-lifecycle/server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:4003"

echo "[*] Adım 1: Başarılı Giriş ve Session ID Üretimi..."
LOGIN_RES=$(curl -s -i -X POST "$API_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"CorrectPassword123!"}')

SID_COOKIE=$(echo "$LOGIN_RES" | grep -o 'sid=[a-f0-9]*' | head -n 1)
REFRESH_TOKEN_1=$(echo "$LOGIN_RES" | grep "{" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).refreshToken)')

if [ -n "$SID_COOKIE" ]; then
    echo "[+] Giriş başarılı. Çerez: $SID_COOKIE"
    echo "[+] İlk Refresh Token: $REFRESH_TOKEN_1"
else
    echo "[-] HATA: Giriş başarısız!"
    exit 1
fi

echo ""
echo "[*] Adım 2: Aktif Oturum ile Dashboard Erişimi..."
STATUS_OK=$(curl -s -o /dev/null -w "%{http_code}" --cookie "$SID_COOKIE" "$API_URL/api/dashboard")
if [ "$STATUS_OK" -eq 200 ]; then
    echo "[+] BAŞARILI: Oturum geçerli (HTTP 200)."
else
    echo "[-] HATA: Dashboard erişimi reddedildi!"
    exit 1
fi

echo ""
echo "[*] Adım 3: Idle Timeout (Hareketsizlik Zaman Aşımı) Doğrulanıyor (3.5 sn bekle)..."
sleep 3.5
STATUS_IDLE=$(curl -s -o /dev/null -w "%{http_code}" --cookie "$SID_COOKIE" "$API_URL/api/dashboard")
if [ "$STATUS_IDLE" -eq 401 ]; then
    echo "[+] BAŞARILI: Hareketsiz kalan oturum 401 ile sonlandırıldı."
else
    echo "[-] HATA: Idle Timeout çalışmadı! HTTP Kodu: $STATUS_IDLE"
    exit 1
fi

echo ""
echo "[*] Adım 4: Tekrar Giriş Yapılıyor ve Parola Değiştiriliyor..."
LOGIN_RES2=$(curl -s -i -X POST "$API_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"CorrectPassword123!"}')
SID_COOKIE2=$(echo "$LOGIN_RES2" | grep -o 'sid=[a-f0-9]*' | head -n 1)

# Parola değiştir
curl -s -X POST "$API_URL/api/change-password" \
  -H "Content-Type: application/json" \
  --cookie "$SID_COOKIE2" \
  -d '{"oldPassword":"CorrectPassword123!","newPassword":"BrandNewPassword2026!"}' > /dev/null

# Eski oturum ile dashboard dene (Düşmüş olmalı)
STATUS_REVOKED=$(curl -s -o /dev/null -w "%{http_code}" --cookie "$SID_COOKIE2" "$API_URL/api/dashboard")
if [ "$STATUS_REVOKED" -eq 401 ]; then
    echo "[+] BAŞARILI: Parola değişince eski oturum anında geçersiz kılındı (HTTP 401)."
else
    echo "[-] HATA: Parola değişimi sonrası oturum açık kaldı!"
    exit 1
fi

echo ""
echo "[*] Adım 5: Refresh Token Rotation (Meşru Yenileme)..."
LOGIN_RES3=$(curl -s -X POST "$API_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"BrandNewPassword2026!"}')
RT1=$(echo "$LOGIN_RES3" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).refreshToken)')

# RT1 kullanılarak RT2 alınır
ROTATE_RES=$(curl -s -X POST "$API_URL/api/token/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$RT1\"}")

RT2=$(echo "$ROTATE_RES" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).refreshToken)')

if [ "$RT1" != "$RT2" ]; then
    echo "[+] BAŞARILI: Refresh Token rotasyonu gerçekleşti. RT1 -> RT2"
else
    echo "[-] HATA: Token rotasyonu yapılmadı!"
    exit 1
fi

echo ""
echo "[*] Adım 6: REFRESH TOKEN REUSE DETECTION (Çalınma Tespiti)..."
echo "    [Senaryo: Saldırgan ele geçirdiği eski RT1 token'ını tekrar sunuyor]"
REUSE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -API_URL="$API_URL/api/token/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$RT1\"}" "$API_URL/api/token/refresh")

if [ "$REUSE_STATUS" -eq 403 ]; then
    echo "[+] BAŞARILI: Reuse teşhis edildi! HTTP 403 ile reddedildi."
else
    echo "[-] HATA: Çalınan token tespit edilemedi! HTTP Kodu: $REUSE_STATUS"
    exit 1
fi

echo "    [Meşru kullanıcının elindeki RT2 de güvenlik gereği iptal edilmiş olmalı]"
RT2_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$RT2\"}" "$API_URL/api/token/refresh")

if [ "$RT2_STATUS" -eq 403 ]; then
    echo "[+] BAŞARILI: Tüm token ailesi kilitlendi. Saldırgan ve kurbanın yetkisi kesildi."
else
    echo "[-] HATA: Aile iptali başarısız!"
    exit 1
fi

echo ""
echo "=========================================================="
echo "[+] DAY 2-3: Authentication Lifecycle Lab TÜM TESTLERDEN GEÇTİ."
echo "=========================================================="
