#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  DAY 4: Command Injection Lab - Verification Suite       "
echo "=========================================================="

node gap-closure-v2/day-04-command-injection/server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:4004"

echo "[*] Adım 1: Zafiyetli Uç Noktada Komut Enjeksiyonu (127.0.0.1;id)..."
VULN_RESP=$(curl -s "$API_URL/api/vulnerable/ping?host=127.0.0.1%3Bid")

if echo "$VULN_RESP" | grep -q "uid="; then
    echo "[!] ZAFİYET ONAYLANDI: Sunucuda harici 'id' komutu çalıştırıldı!"
else
    echo "[-] HATA: Komut enjeksiyonu tetiklenemedi."
    exit 1
fi

echo ""
echo "[*] Adım 2: Hatalı Savunma (Blacklist) Atlatma Testi (127.0.0.1|id)..."
# ';' yasak ama '|' açık bırakılmış
FLAWED_RESP=$(curl -s "$API_URL/api/flawed/ping?host=127.0.0.1%7Cid")

if echo "$FLAWED_RESP" | grep -q "uid="; then
    echo "[!] ATLATMA BAŞARILI: Kara liste pipe (|) karakteri ile delindi!"
else
    echo "[-] HATA: Kara liste atlatılamadı."
    exit 1
fi

echo ""
echo "[*] Adım 3: Sıkılaştırılmış Uç Noktada Enjeksiyon Denemeleri..."

echo "   [3.1] Noktalı virgül enjeksiyon testi..."
CODE_SEMI=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/ping?host=127.0.0.1%3Bid")
if [ "$CODE_SEMI" -eq 400 ]; then
    echo "   [+] BAŞARILI: Noktalı virgül enjeksiyonu 400 Bad Request ile engellendi."
else
    echo "   [-] HATA: Giriş denetimi başarısız! HTTP Kodu: $CODE_SEMI"
    exit 1
fi

echo "   [3.2] Pipe (|) enjeksiyon testi..."
CODE_PIPE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/ping?host=127.0.0.1%7Cid")
if [ "$CODE_PIPE" -eq 400 ]; then
    echo "   [+] BAŞARILI: Pipe enjeksiyonu 400 Bad Request ile engellendi."
else
    echo "   [-] HATA: Pipe enjeksiyonu geçti! HTTP Kodu: $CODE_PIPE"
    exit 1
fi

echo "   [3.3] Meşru Host Testi (127.0.0.1)..."
LEGIT_RESP=$(curl -s "$API_URL/api/hardened/ping?host=127.0.0.1")
if echo "$LEGIT_RESP" | grep -q "SUCCESS"; then
    echo "   [+] BAŞARILI: Meşru ping isteği başarıyla sonuçlandı."
else
    echo "   [-] HATA: Meşru istek başarısız oldu!"
    exit 1
fi

echo ""
echo "=========================================================="
echo "[+] DAY 4: Command Injection Lab TÜM TESTLERDEN GEÇTİ.    "
echo "=========================================================="
