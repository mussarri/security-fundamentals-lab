#!/usr/bin/env bash
set -euo pipefail

echo "[*] Gün 2: HTTP Parser & Interpretation Differential Testi"

node fixed/server.http-parser-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:3016"

echo "[*] 1. Test: Çelişkili başlıklar (CL + TE) gönderiliyor..."
# curl ile ham başlıkları yolla
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Transfer-Encoding: chunked" \
  -H "Content-Length: 10" \
  -d "0" "$API_URL" || true)

if [ "$STATUS" -eq 400 ]; then
    echo "[+] BAŞARILI: Çelişkili başlık taşıyan istek 400 Bad Request ile düşürüldü."
else
    echo "[-] HATA: Çelişkili istek kabul edildi! HTTP Kodu: $STATUS"
    exit 1
fi

echo "[+] Gün 2 savunma testi başarıyla geçti."
