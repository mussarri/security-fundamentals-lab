#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  DAY 1: Browser Security Lab v2 - Verification Suite    "
echo "=========================================================="

node gap-closure-v2/day-01-browser-lab-v2/server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

BANK_URL="http://127.0.0.1:4001"
ATTACKER_ORIGIN="http://127.0.0.1:4002"
LEGIT_ORIGIN="http://127.0.0.1:4001"

echo "[*] Adım 1: Oturum açılıyor ve çerezler alınıyor..."
LOGIN_HEADERS=$(curl -s -i "$BANK_URL/login")
STRICT_COOKIE=$(echo "$LOGIN_HEADERS" | grep -o 'strict_session=[^;]*')
LAX_COOKIE=$(echo "$LOGIN_HEADERS" | grep -o 'lax_session=[^;]*')
NONE_COOKIE=$(echo "$LOGIN_HEADERS" | grep -o 'none_session=[^;]*')
CSRF_TOKEN="token_alice_secret_123"

echo "[+] Alınan Çerezler: $STRICT_COOKIE | $LAX_COOKIE"

echo ""
echo "[*] Adım 2: Zafiyetli CORS İstismarı (Arbitrary Origin Reflection)..."
CORS_RESP=$(curl -s -I -H "Origin: $ATTACKER_ORIGIN" "$BANK_URL/api/sensitive-profile")
if echo "$CORS_RESP" | grep -qi "Access-Control-Allow-Origin: $ATTACKER_ORIGIN" && \
   echo "$CORS_RESP" | grep -qi "Access-Control-Allow-Credentials: true"; then
    echo "[!] ZAFİYET ONAYLANDI: Saldırgan kökenine kimlik doğrulamalı okuma izni verildi!"
else
    echo "[-] Hata: CORS açığı tetiklenemedi."
    exit 1
fi

echo ""
echo "[*] Adım 3: Zafiyetli Uç Noktaya Cross-Site CSRF Saldırısı (SameSite=Lax simülasyonu)..."
# Saldırgan sitesi üzerinden gelen POST isteği (Origin: 4002)
CSRF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Origin: $ATTACKER_ORIGIN" \
  --cookie "$LAX_COOKIE" \
  -d "to=attacker&amount=500" \
  "$BANK_URL/api/vulnerable-transfer")

if [ "$CSRF_STATUS" -eq 200 ]; then
    echo "[!] ZAFİYET ONAYLANDI: CSRF ile Alice'in hesabından 500 TL çalındı!"
else
    echo "[-] Hata: CSRF tetiklenemedi."
    exit 1
fi

echo ""
echo "[*] Adım 4: Sıkılaştırılmış Uç Noktada Savunma Katmanlarının Doğrulanması..."

echo "   [4.1] Saldırgan Origin Engeli Testi..."
CODE_ORIGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Origin: $ATTACKER_ORIGIN" \
  --cookie "$STRICT_COOKIE" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "to=attacker&amount=100" \
  "$BANK_URL/api/hardened-transfer")

if [ "$CODE_ORIGIN" -eq 403 ]; then
    echo "   [+] BAŞARILI: Cross-Site Origin 403 ile engellendi."
else
    echo "   [-] HATA: Origin denetimi başarısız! HTTP Kodu: $CODE_ORIGIN"
    exit 1
fi

echo "   [4.2] Eksik Anti-CSRF Token Testi..."
CODE_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Origin: $LEGIT_ORIGIN" \
  --cookie "$STRICT_COOKIE" \
  -d "to=attacker&amount=100" \
  "$BANK_URL/api/hardened-transfer")

if [ "$CODE_TOKEN" -eq 403 ]; then
    echo "   [+] BAŞARILI: CSRF Token taşımayan istek 403 ile reddedildi."
else
    echo "   [-] HATA: Token olmadan istek geçti! HTTP Kodu: $CODE_TOKEN"
    exit 1
fi

echo "   [4.3] Meşru İstek Testi (Doğru Origin + Strict Cookie + Geçerli Token)..."
CODE_VALID=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Origin: $LEGIT_ORIGIN" \
  --cookie "$STRICT_COOKIE" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "to=friend&amount=50" \
  "$BANK_URL/api/hardened-transfer")

if [ "$CODE_VALID" -eq 200 ]; then
    echo "   [+] BAŞARILI: Meşru işlem başarıyla onaylandı (HTTP 200)."
else
    echo "   [-] HATA: Meşru işlem reddedildi! HTTP Kodu: $CODE_VALID"
    exit 1
fi

echo ""
echo "=========================================================="
echo "[+] DAY 1: Browser Security Lab v2 TÜM TESTLERDEN GEÇTİ.   "
echo "=========================================================="
