#!/usr/bin/env bash
set -euo pipefail

PORT=8080
LOG_FILE="/tmp/http_sniff.log"

echo "=================================================="
echo "    Hafta 2: L7 Plaintext HTTP Sniffing PoC       "
echo "=================================================="

echo "[*] tcpdump dinlemede (-A ile ASCII decode)..."
tcpdump -i lo -nn -A -s 0 "tcp port ${PORT}" -c 7 > "${LOG_FILE}" 2>&1 &
sleep 1

# Sahte HTTP Sunucu
(echo -e "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK") | nc -l 127.0.0.1 "${PORT}" > /dev/null &
sleep 1

# İstemci İsteği
echo "[*] Hassas HTTP başlıkları ile istek gönderiliyor..."
curl -s -H "Authorization: Bearer TOP_SECRET_JWT_TOKEN" \
        -H "X-API-Key: SUPER_SECRET_KEY" \
        http://127.0.0.1:${PORT}/auth/verify > /dev/null || true

sleep 1

echo -e "\n[!] Paket Seviyesinde Yakalanan Hassas Başlıklar:"
grep -E "Authorization|X-API-Key|GET" "${LOG_FILE}" || cat "${LOG_FILE}"

rm -f "${LOG_FILE}"
echo -e "\n[✓] L7 Sniffing testi tamamlandı."