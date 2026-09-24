#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 3: CORS Güvenlik ve Whitelist Doğrulama Testi"

# Test API'sini arka planda başlat (Fixed versiyon)
node fixed/server.cors-hardened.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://localhost:4000/api/secret"

echo "[*] 1. Test: Yetkili Origin (http://localhost:3000)..."
RESP_VALID=$(curl -s -I -H "Origin: http://localhost:3000" "$API_URL" | tr -d '\r')
if echo "$RESP_VALID" | grep -q "Access-Control-Allow-Origin: http://localhost:3000"; then
    echo "[+] BAŞARILI: Yetkili origin doğru şekilde kabul edildi."
else
    echo "[-] HATA: Yetkili origin reddedildi!"
    exit 1
fi

echo "[*] 2. Test: Saldırgan Origin (https://evil-attacker.com)..."
RESP_EVIL=$(curl -s -I -H "Origin: https://evil-attacker.com" "$API_URL" | tr -d '\r')
if echo "$RESP_EVIL" | grep -q "Access-Control-Allow-Origin"; then
    echo "[-] KRİTİK GÜVENLİK AÇIĞI: Sunucu yabancı kökene izin başlığı döndü!"
    exit 1
else
    echo "[+] BAŞARILI: Saldırgan kökene CORS başlığı dönülmedi (Tarayıcı erişimi engellenecek)."
fi

echo "[+] Tüm CORS güvenlik kontrolleri başarıyla tamamlandı."
