#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 7: Blind SQL Injection Çıkarım ve Savunma Testi"

# 1. Zafiyetli Sunucuyu Başlat
node labs/09-sqli-fundamentals/blind-server.js > /dev/null 2>&1 &
VULN_PID=$!

# 2. Sıkılaştırılmış Sunucuyu Başlat
node fixed/server.blind-sqli-hardened.js > /dev/null 2>&1 &
HARD_PID=$!

trap 'kill $VULN_PID $HARD_PID > /dev/null 2>&1 || true' EXIT
sleep 1

# Boolean Çıkarım Payload'u:
# admin kullanıcısının pin kodunun 1. karakteri '7' ise sorgu True döner.
PAYLOAD_TRUE="admin' AND SUBSTR(pin,1,1)='7'--"
PAYLOAD_FALSE="admin' AND SUBSTR(pin,1,1)='9'--"

URL_ENCODED_TRUE=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$PAYLOAD_TRUE")
URL_ENCODED_FALSE=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$PAYLOAD_FALSE")

echo "[*] 1. Test: Zafiyetli sunucuda ikili çıkarım doğrulanıyor..."
RESP_TRUE=$(curl -s "http://localhost:3012/api/user-exists?username=$URL_ENCODED_TRUE")
RESP_FALSE=$(curl -s "http://localhost:3012/api/user-exists?username=$URL_ENCODED_FALSE")

if echo "$RESP_TRUE" | grep -q '"exists":true' && echo "$RESP_FALSE" | grep -q '"exists":false'; then
    echo "[+] BAŞARILI: Boolean Oracle çalışıyor! Admin PIN'inin ilk hanesi ('7') sızdırıldı."
else
    echo "[-] HATA: Zafiyetli sunucu beklendiği gibi davranmadı!"
    exit 1
fi

echo "[*] 2. Test: Sıkılaştırılmış sunucuda Blind SQLi engellemesi test ediliyor..."
HARD_TRUE=$(curl -s "http://localhost:3013/api/user-exists?username=$URL_ENCODED_TRUE")

if echo "$HARD_TRUE" | grep -q '"exists":false'; then
    echo "[+] BAŞARILI: Parametreli sorgu mantıksal enjeksiyonu engelledi (exists: false döndü)."
else
    echo "[-] HATA: Sıkılaştırılmış sunucuda açık tespit edildi!"
    exit 1
fi

echo "[+] Tüm Blind SQLi testleri başarıyla tamamlandı."
