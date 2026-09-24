#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 3: Cookie Güvenlik Bayrakları Doğrulama Testi"

# Sunucuyu arka planda başlat
node labs/04-cookie-security/server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

HEADERS=$(curl -s -I http://localhost:3000/ | tr -d '\r')

echo "[*] HttpOnly bayrağı kontrol ediliyor..."
if echo "$HEADERS" | grep -i "Set-Cookie" | grep -qi "HttpOnly"; then
    echo "[+] BAŞARILI: En az bir çerez HttpOnly bayrağı ile korunuyor."
else
    echo "[-] HATA: HttpOnly bayrağı eksik!"
    exit 1
fi
