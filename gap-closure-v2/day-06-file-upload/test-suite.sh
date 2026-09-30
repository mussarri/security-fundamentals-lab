#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  DAY 6: File Upload Security Lab - Verification Suite    "
echo "=========================================================="

node gap-closure-v2/day-06-file-upload/server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:4006"

# Test Payloadları Hazırlığı
# 1. Sahte Resim (İçi PHP kodu dolu metin)
FAKE_PNG_FILE="/tmp/fake_shell.php"
echo "<?php system(\$_GET['cmd']); ?>" > "$FAKE_PNG_FILE"

# 2. Gerçek PNG (Geçerli 8 baytlık PNG imzası)
REAL_PNG_FILE="/tmp/real_image.png"
printf '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A\x00\x00\x00\x0D\x49\x48\x44\x52' > "$REAL_PNG_FILE"

echo "[*] Adım 1: Zafiyetli Uç Noktada Sahte Başlıkla PHP Shell Yükleme..."
VULN_RESP=$(curl -s -X POST "$API_URL/api/vulnerable/upload" \
  -H "Content-Type: image/png" \
  -H "X-File-Name: webshell.php" \
  --data-binary @"$FAKE_PNG_FILE")

if echo "$VULN_RESP" | grep -q "webshell.php"; then
    echo "[!] ZAFİYET ONAYLANDI: Sahte Content-Type ile PHP dosyası diske yazıldı!"
else
    echo "[-] HATA: Zafiyetli yükleme başarısız."
    exit 1
fi

echo ""
echo "[*] Adım 2: Sıkılaştırılmış Uç Noktada Sahte Resim Engeli (Magic Bytes Denetimi)..."
STATUS_FAKE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/hardened/upload" \
  -H "Content-Type: image/png" \
  --data-binary @"$FAKE_PNG_FILE")

if [ "$STATUS_FAKE" -eq 400 ]; then
    echo "[+] BAŞARILI: Sahte PNG Magic Bytes imzası uyuşmadığı için 400 ile reddedildi."
else
    echo "[-] HATA: Sahte dosya engellenemedi! HTTP Kodu: $STATUS_FAKE"
    exit 1
fi

echo ""
echo "[*] Adım 3: Meşru Dosya Yükleme (Gerçek PNG İmzası)..."
LEGIT_RESP=$(curl -s -X POST "$API_URL/api/hardened/upload" \
  -H "Content-Type: image/png" \
  --data-binary @"$REAL_PNG_FILE")

FILE_ID=$(echo "$LEGIT_RESP" | grep "{" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).fileId || "")')

if [ -n "$FILE_ID" ]; then
    echo "[+] BAŞARILI: Meşru resim güvenli UUID ile yüklendi: $FILE_ID.png"
else
    echo "[-] HATA: Meşru dosya yüklenemedi!"
    exit 1
fi

echo ""
echo "[*] Adım 4: Güvenli Dosya Sunumu (Serving Headers) Doğrulaması..."
DOWNLOAD_HEADERS=$(curl -s -I "$API_URL/api/files/download?id=$FILE_ID")

if echo "$DOWNLOAD_HEADERS" | grep -qi "X-Content-Type-Options: nosniff" && \
   echo "$DOWNLOAD_HEADERS" | grep -qi "Content-Disposition: attachment"; then
    echo "[+] BAŞARILI: nosniff ve attachment başlıkları ile XSS/Sniffing engellendi."
else
    echo "[-] HATA: Güvenli sunum başlıkları eksik!"
    exit 1
fi

rm -f "$FAKE_PNG_FILE" "$REAL_PNG_FILE"
echo ""
echo "=========================================================="
echo "[+] DAY 6: File Upload Security Lab TÜM TESTLERDEN GEÇTİ. "
echo "=========================================================="
