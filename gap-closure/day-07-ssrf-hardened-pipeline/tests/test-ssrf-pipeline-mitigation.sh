#!/usr/bin/env bash
set -euo pipefail

echo "[*] Gün 7: Kapsamlı SSRF Boru Hattı Savunma Testi"

node server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:3022"

echo "[*] 1. Test: Zafiyetli uç noktada yerel metadata sızıntısı..."
VULN_RESP=$(curl -s "$API_URL/api/vulnerable/fetch?url=http://127.0.0.1:3022/internal/cloud-metadata")
if echo "$VULN_RESP" | grep -q "secret-vault-admin"; then
    echo "[!] ZAFİYET DOĞRULANDI: Zafiyetli uç nokta iç ağdaki metadata'yı sızdırdı!"
else
    echo "[-] Beklenen zafiyet davranışı alınamadı."
    exit 1
fi

echo "[*] 2. Test: Sıkılaştırılmış boru hattında doğrudan Loopback (127.0.0.1) engeli..."
CODE_IP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/fetch?url=http://127.0.0.1:3022/internal/cloud-metadata")
if [ "$CODE_IP" -eq 403 ]; then
    echo "[+] BAŞARILI: 127.0.0.1 erişimi HTTP 403 ile engellendi."
else
    echo "[-] HATA: Loopback engellenemedi! HTTP Kodu: $CODE_IP"
    exit 1
fi

echo "[*] 3. Test: IPv6 Loopback ([::1]) atlatma denemesi..."
CODE_IPV6=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/fetch?url=http://[::1]:3022/internal/cloud-metadata")
if [ "$CODE_IPV6" -eq 403 ]; then
    echo "[+] BAŞARILI: IPv6 Loopback [::1] erişimi HTTP 403 ile engellendi."
else
    echo "[-] HATA: IPv6 Loopback engellenemedi! HTTP Kodu: $CODE_IPV6"
    exit 1
fi

echo "[*] 4. Test: HTTP 302 Redirect ile iç ağa zıplama denemesi (Redirect Re-Validation)..."
CODE_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/fetch?url=http://127.0.0.1:3022/redirect-to-internal")
if [ "$CODE_REDIRECT" -eq 403 ]; then
    echo "[+] BAŞARILI: 302 Redirect sonrası iç ağa erişim boru hattı tarafından engellendi."
else
    echo "[-] HATA: Redirect üzerinden iç ağa sızıldı! HTTP Kodu: $CODE_REDIRECT"
    exit 1
fi

echo "[+] Gün 7 SSRF Boru Hattı testleri başarıyla geçti."
