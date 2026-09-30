#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  DAY 7: SSRF v3 Defense Pipeline - Verification Suite    "
echo "=========================================================="

node gap-closure-v2/day-07-ssrf-v3/server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:4007"

echo "[*] Adım 1: Zafiyetli Uç Noktada Yerel Metadata Sızıntısı..."
VULN_RESP=$(curl -s "$API_URL/api/vulnerable/fetch?url=http://127.0.0.1:4007/internal/metadata")

if echo "$VULN_RESP" | grep -q "FLAG{SECURE_INTERNAL_METADATA_SECRET}"; then
    echo "[!] ZAFİYET ONAYLANDI: Zafiyetli uç nokta iç ağdaki hassas veriyi getirdi!"
else
    echo "[-] HATA: Zafiyet tetiklenemedi."
    exit 1
fi

echo ""
echo "[*] Adım 2: Sıkılaştırılmış Boru Hattı - Protokol Şema Kısıtı (file://)..."
CODE_FILE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/fetch?url=file:///etc/passwd")

if [ "$CODE_FILE" -eq 403 ]; then
    echo "[+] BAŞARILI: file:// şeması 403 ile engellendi."
else
    echo "[-] HATA: Şema kontrolü başarısız! HTTP Kodu: $CODE_FILE"
    exit 1
fi

echo ""
echo "[*] Adım 3: Sıkılaştırılmış Boru Hattı - IPv4 Loopback Engeli (127.0.0.1)..."
CODE_IPV4=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/fetch?url=http://127.0.0.1:4007/internal/metadata")

if [ "$CODE_IPV4" -eq 403 ]; then
    echo "[+] BAŞARILI: IPv4 Loopback (127.0.0.1) erişimi 403 ile engellendi."
else
    echo "[-] HATA: IPv4 engeli başarısız! HTTP Kodu: $CODE_IPV4"
    exit 1
fi

echo ""
echo "[*] Adım 4: Sıkılaştırılmış Boru Hattı - IPv6 Loopback Engeli ([::1])..."
CODE_IPV6=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/fetch?url=http://[::1]:4007/internal/metadata")

if [ "$CODE_IPV6" -eq 403 ]; then
    echo "[+] BAŞARILI: IPv6 Loopback ([::1]) erişimi 403 ile engellendi."
else
    echo "[-] HATA: IPv6 engeli başarısız! HTTP Kodu: $CODE_IPV6"
    exit 1
fi

echo ""
echo "[*] Adım 5: Sıkılaştırılmış Boru Hattı - Yönlendirme (Redirect) Yeniden Doğrulama Testi..."
CODE_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/fetch?url=http://127.0.0.1:4007/redirect-trap")

if [ "$CODE_REDIRECT" -eq 403 ]; then
    echo "[+] BAŞARILI: 302 yönlendirmesiyle iç ağa atlama girişimi yeniden doğrulamada engellendi (403)."
else
    echo "[-] HATA: Yönlendirme zinciri atlatıldı! HTTP Kodu: $CODE_REDIRECT"
    exit 1
fi

echo ""
echo "=========================================================="
echo "[+] DAY 7: SSRF v3 Defense Pipeline TÜM TESTLERDEN GEÇTİ. "
echo "=========================================================="
