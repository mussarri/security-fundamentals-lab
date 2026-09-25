#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 6: IDOR / BOLA Yetkilendirme Testi"

node fixed/server.idor-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://localhost:3007/api/invoices"

echo "[*] 1. Test: Ahmet kendi faturasını (#1) okuyor..."
STATUS_OWN=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer token_user_101" "$API_URL/1")
if [ "$STATUS_OWN" -eq 200 ]; then
    echo "[+] BAŞARILI: Kullanıcı kendi faturasına erişebildi (HTTP 200)."
else
    echo "[-] HATA: Kullanıcı kendi faturasına erişemedi! HTTP: $STATUS_OWN"
    exit 1
fi

echo "[*] 2. Test: Ahmet başka birinin faturasını (#2) okumaya çalışıyor (IDOR denemesi)..."
STATUS_FORBIDDEN=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer token_user_101" "$API_URL/2")
if [ "$STATUS_FORBIDDEN" -eq 403 ]; then
    echo "[+] BAŞARILI: Yetkisiz erişim 403 Forbidden ile engellendi."
else
    echo "[-] HATA: IDOR zafiyeti mevcut! HTTP: $STATUS_FORBIDDEN"
    exit 1
fi

echo "[*] 3. Test: Admin kullanıcısı Mehmet'in faturasına (#2) erişiyor..."
STATUS_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer token_admin_999" "$API_URL/2")
if [ "$STATUS_ADMIN" -eq 200 ]; then
    echo "[+] BAŞARILI: Admin rolü faturaya erişebildi (HTTP 200)."
else
    echo "[-] HATA: Admin faturaya erişemedi! HTTP: $STATUS_ADMIN"
    exit 1
fi

echo "[+] Tüm IDOR savunma testleri başarıyla geçti."
