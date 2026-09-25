#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 4: Content Security Policy (CSP) Başlık Denetim Testi"

node fixed/xss-csp-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

HEADERS=$(curl -s -I "http://localhost:3002/?q=test" | tr -d '\r')

echo "[*] CSP Başlığı aranıyor..."
if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
    echo "[+] BAŞARILI: Content-Security-Policy başlığı yanıt içinde mevcut."
else
    echo "[-] HATA: CSP başlığı eksik!"
    exit 1
fi

echo "[*] 'unsafe-inline' kontrolü yapılıyor..."
if echo "$HEADERS" | grep -i "Content-Security-Policy" | grep -qi "'unsafe-inline'"; then
    echo "[-] TEHLİKE: CSP içinde 'unsafe-inline' tespit edildi!"
    exit 1
else
    echo "[+] BAŞARILI: 'unsafe-inline' kullanılmıyor (Katı politika devrede)."
fi
