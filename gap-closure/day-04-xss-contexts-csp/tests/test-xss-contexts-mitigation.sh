#!/usr/bin/env bash
set -euo pipefail

echo "[*] Gün 4: XSS Contexts, URL Scheming ve Strict CSP Testi"

node  server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

BASE_URL="http://127.0.0.1:3019"

echo "[*] 1. Test: URL bağlamında 'javascript:' şeması zafiyet kontrolü..."
VULN_URL_RESP=$(curl -s "$BASE_URL/vulnerable/url?q=javascript:alert(1)")
if echo "$VULN_URL_RESP" | grep -q 'href="javascript:alert(1)"'; then
    echo "[!] ZAFİYET TESPİT EDİLDİ: naiveHtmlEscape 'javascript:' protokolünü geçiriyor!"
else
    echo "[-] Beklenen zafiyet çıktısı alınamadı."
    exit 1
fi

echo "[*] 2. Test: Sıkılaştırılmış uç noktada şema filtresi doğrulanıyor..."
HARD_URL_RESP=$(curl -s "$BASE_URL/hardened?url=javascript:alert(1)")
if echo "$HARD_URL_RESP" | grep -q 'href="#"'; then
    echo "[+] BAŞARILI: 'javascript:' şeması engellendi ve güvenli '#' ile değiştirildi."
else
    echo "[-] HATA: URL şema denetimi başarısız oldu!"
    exit 1
fi

echo "[*] 3. Test: Sıkılaştırılmış uç noktada Strict Nonce-based CSP doğrulanıyor..."
CSP_HEADER=$(curl -s -I "$BASE_URL/hardened" | grep -i "Content-Security-Policy:" || true)

if echo "$CSP_HEADER" | grep -q "script-src 'nonce-" && \
   echo "$CSP_HEADER" | grep -q "object-src 'none'" && \
   echo "$CSP_HEADER" | grep -q "base-uri 'none'"; then
    echo "[+] BAŞARILI: Strict Nonce-based CSP başlığı eksiksiz tanımlı."
else
    echo "[-] HATA: CSP başlıkları standartlara uygun değil!"
    exit 1
fi

echo "[+] Gün 4 XSS Contexts ve CSP testleri başarıyla geçti."
