#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 7: SQL Injection ve Prepared Statements Testi"

node fixed/server.sqli-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://localhost:3009/api/login"

echo "[*] 1. Test: Klasik Auth Bypass ('admin' --) denemesi..."
STATUS_BYPASS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -d "username=admin' --&password=fake" "$API_URL")

if [ "$STATUS_BYPASS" -eq 401 ]; then
    echo "[+] BAŞARILI: SQL Injection saldırısı 401 Unauthorized ile engellendi."
else
    echo "[-] HATA: Zafiyet engellenemedi! HTTP Kodu: $STATUS_BYPASS"
    exit 1
fi

echo "[*] 2. Test: OR mantıksal enjeksiyon (' OR '1'='1) denemesi..."
STATUS_LOGICAL=$(curl -s -o /dev/null -w "%{http_code}" -X POST -d "username=' OR '1'='1&password=' OR '1'='1" "$API_URL")

if [ "$STATUS_LOGICAL" -eq 401 ]; then
    echo "[+] BAŞARILI: Mantıksal SQLi saldırısı 401 Unauthorized ile engellendi."
else
    echo "[-] HATA: Mantıksal SQLi engellenemedi! HTTP Kodu: $STATUS_LOGICAL"
    exit 1
fi

echo "[*] 3. Test: Meşru admin girişi doğrulaması..."
STATUS_VALID=$(curl -s -o /dev/null -w "%{http_code}" -X POST -d "username=admin&password=SuperSecretPass2026!" "$API_URL")

if [ "$STATUS_VALID" -eq 200 ]; then
    echo "[+] BAŞARILI: Meşru kullanıcı sorunsuz giriş yapabiliyor (HTTP 200)."
else
    echo "[-] HATA: Meşru giriş başarısız! HTTP Kodu: $STATUS_VALID"
    exit 1
fi

echo "[+] Tüm SQL Injection savunma testleri başarıyla geçti."
