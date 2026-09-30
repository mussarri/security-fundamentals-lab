#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  DAY 8: HTTP Desync Lab v2 - Verification Suite          "
echo "=========================================================="

echo "[*] Adım 1: Zafiyetli Ön Yüz / Arka Yüz Altyapısı Başlatılıyor..."
node gap-closure-v2/day-08-http-desync-v2/server.js > /dev/null 2>&1 &
LAB_PID=$!
sleep 1

echo "[*] Adım 2: Bağımsız Kurban Desync Exploit Senaryosu Çalıştırılıyor..."
node gap-closure-v2/day-08-http-desync-v2/exploit-desync.js
kill $LAB_PID > /dev/null 2>&1 || true
sleep 1

echo ""
echo "[*] Adım 3: Sıkılaştırılmış RFC 7230 Savunma Proxy'si Başlatılıyor..."
node gap-closure-v2/day-08-http-desync-v2/hardened-proxy.js > /dev/null 2>&1 &
HARD_PID=$!
trap 'kill $HARD_PID > /dev/null 2>&1 || true' EXIT
sleep 1

echo "[*] Adım 4: Saldırı Paketi Sıkılaştırılmış Proxy'ye Gönderiliyor..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Host: localhost" \
  -H "Transfer-Encoding: chunked" \
  -H "Content-Length: 10" \
  -d "0" "http://127.0.0.1:4010/") # -d "0" olunca chunked transfer encoding ile çelişki yaratıyor. Yani, hem Transfer-Encoding: chunked hem de Content-Length: 10 başlıkları var. Bu, HTTP Desync saldırısının tipik bir örneğidir. 

if [ "$STATUS" -eq 400 ]; then
    echo "[+] BAŞARILI: Çelişkili başlık taşıyan istek 400 Bad Request ile düşürüldü."
else
    echo "[-] HATA: Sıkılaştırılmış proxy atağı engellemedi! HTTP Kodu: $STATUS"
    exit 1
fi

echo ""
echo "=========================================================="
echo "[+] DAY 8: HTTP Desync Lab v2 TÜM TESTLERDEN GEÇTİ.       "
echo "=========================================================="
