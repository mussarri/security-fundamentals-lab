#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 7: UNION-based SQL Injection Savunma Doğrulama Testi"

node fixed/server.union-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://localhost:3011/api/products"

echo "[*] 1. Test: Meşru kategori araması..."
MESRU_RESP=$(curl -s "$API_URL?category=elektronik")
if echo "$MESRU_RESP" | grep -q "MacBook Pro M3"; then
    echo "[+] BAŞARILI: Meşru arama doğru ürünleri listeledi."
else
    echo "[-] HATA: Meşru arama çalışmadı!"
    exit 1
fi

echo "[*] 2. Test: UNION SQLi saldırı denemesi (Kredi kartı sızdırma)..."
EXPLOIT_PAYLOAD="nonexistent' UNION SELECT id, username, credit_card FROM users--;"
ENCODED_PAYLOAD=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$EXPLOIT_PAYLOAD")

SALDIRI_RESP=$(curl -s "$API_URL?category=$ENCODED_PAYLOAD")

if echo "$SALDIRI_RESP" | grep -q "4111-2222-3333-4444"; then
    echo "[-] HATA: UNION SQLi zafiyeti devam ediyor! Kredi kartı sızdırıldı."
    exit 1
else
    echo "[+] BAŞARILI: UNION payload'u veri sızdırmadı (Parametreli sorgu koruması devrede)."
fi

echo "[+] Tüm UNION-based SQLi savunma testleri başarıyla geçti."
