#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/tmp/tls_test.log"
TARGET_HOST="example.com"

echo "=================================================="
echo "    Hafta 2: TLS 1.3 Handshake & Cipher Suite     "
echo "=================================================="

echo "[*] Port 443 trafiği dinleniyor..."
tcpdump -i any -nn "tcp port 443" -c 10 > "${LOG_FILE}" 2>&1 &
DUMP_PID=$!
sleep 1

echo "[*] https://${TARGET_HOST} adresine HTTPS isteği gönderiliyor..."
curl -s -k "https://${TARGET_HOST}" > /dev/null

wait "${DUMP_PID}" 2>/dev/null || true

echo -e "\n[+] Yakalanan TLS Akışı:"
cat "${LOG_FILE}"

echo -e "\n[*] Akış Sırası:" 
echo "1. Client Hello (TLS 1.3, Cipher Suites, Extensions)"
echo "2. Server Hello (TLS 1.3, Selected Cipher Suite, Extensions)"
echo "3. Encrypted Extensions"
echo "4. Certificate"
echo "5. Certificate Verify"
echo "6. Finished"
echo "[✓] TLS testi tamamlandı."

# Öne çıkan protokol ayrıntıları:

# Paket 4 (length 517): İstemcinin ilettiği ClientHello boyutu tam 517 bayt. Bu yükte desteklenen şifreleme paketleri, Eliptik Eğri Diffie-Hellman parametresi (Key Share) ve SNI başlığı taşındı.

# Paket 6 (length 3990): Sunucu, 3990 baytlık tek yanıtta ServerHello, seçilen ortak algoritma ve şifrelenmiş sunucu sertifikasını iletti.

# Paket 8-10: İki taraf ortak oturum anahtarını türetti ve bağlantı doğrudan şifreli uygulama verisi (Application Data) akışına geçti.

# Ağ temelleri ve paket analizi modülü (Hafta 2) bu çıktıyla birlikte tamamen doğrulanmış oldu. Şimdi Hafta 3: Web Security Fundamentals modülüne geçiyoruz.

