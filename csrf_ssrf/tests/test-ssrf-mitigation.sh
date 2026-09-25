#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 5: SSRF Güvenlik ve IP Karantina Testi"

node fixed/server.ssrf-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://localhost:3003/fetch-preview"

echo "[*] 1. Test: 127.0.0.1 (Localhost) erişim denemesi..."
STATUS_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL?url=http://127.0.0.1:8000/admin/debug")
if [ "$STATUS_LOCAL" -eq 403 ]; then
    echo "[+] BAŞARILI: Localhost isteği 403 Forbidden ile engellendi."
else
    echo "[-] HATA: Localhost erişimi engellenemedi! HTTP Code: $STATUS_LOCAL"
    exit 1
fi

echo "[*] 2. Test: 169.254.169.254 (Cloud Metadata) erişim denemesi..."
STATUS_META=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL?url=http://169.254.169.254/latest/meta-data")
if [ "$STATUS_META" -eq 403 ]; then
    echo "[+] BAŞARILI: Cloud Metadata IP'si 403 Forbidden ile engellendi."
else
    echo "[-] HATA: Cloud Metadata erişimi engellenemedi! HTTP Code: $STATUS_META"
    exit 1
fi

echo "[*] 3. Test: 0.0.0.0 Bypass denemesi..."
STATUS_ZERO=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL?url=http://0.0.0.0:8000/")
if [ "$STATUS_ZERO" -eq 403 ]; then
    echo "[+] BAŞARILI: 0.0.0.0 bypass tekniği başarıyla yakalandı ve engellendi."
else
    echo "[-] HATA: 0.0.0.0 engellenemedi! HTTP Code: $STATUS_ZERO"
    exit 1
fi

echo "[+] Tüm SSRF savunma testleri başarıyla geçti."
