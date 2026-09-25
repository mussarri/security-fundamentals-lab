#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 6: JWT alg: none Savunma Doğrulama Testi"

node fixed/server.jwt-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

# Sahte alg: none token'ı oluştur
FORGED_TOKEN=$(node -e '
const h = Buffer.from(JSON.stringify({alg:"none",typ:"JWT"})).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const p = Buffer.from(JSON.stringify({user:"attacker",role:"admin"})).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
console.log(`${h}.${p}.`);
')

echo "[*] Sahte admin token'ı ile korumalı uç noktaya istek atılıyor..."
STATUS_CODE=$(curl -s -o /dev/null -w "\%{http_code}" -H "Authorization: Bearer $FORGED_TOKEN" http://localhost:3005/api/hardened/admin)

if [ "$STATUS_CODE" -eq 403 ]; then
    echo "[+] BAŞARILI: alg: none token'ı 403 Forbidden ile engellendi."
else
    echo "[-] HATA: Zafiyet devam ediyor! HTTP Kodu: $STATUS_CODE"
    exit 1
fi
