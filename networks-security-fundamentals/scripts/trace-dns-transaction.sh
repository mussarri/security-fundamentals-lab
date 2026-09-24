#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/tmp/dns_test.log"
TARGET_DOMAIN="example.com"
DNS_SERVER="8.8.8.8"

echo "=================================================="
echo "    Hafta 2: DNS (UDP 53) & Transaction ID PoC    "
echo "=================================================="

echo "[*] UDP 53 trafiği dinleniyor..."
tcpdump -i any -nn -vv "udp port 53" -c 2 > "${LOG_FILE}" 2>&1 &
DUMP_PID=$!
sleep 1

echo "[*] ${DNS_SERVER} üzerinden ${TARGET_DOMAIN} A kaydı sorgulanıyor..."
dig @"${DNS_SERVER}" "${TARGET_DOMAIN}" +short > /dev/null

wait "${DUMP_PID}" 2>/dev/null || true

echo -e "\n[+] Yakalanan DNS Paketleri:"
cat "${LOG_FILE}"

echo -e "\n[*] Güvenlik Analizi: Sorgu ve yanıttaki Transaction ID (sayı+) eşleşmesi."
rm -f "${LOG_FILE}"
echo "[✓] DNS testi tamamlandı."

# 1. Transaction ID Değişimi & EntropiID: 21721 (Bir önceki testte 19491 idi).İstemci her bağımsız sorgu için 16-bitlik uzaydan ($0 - 65535$) rastgele yeni bir Transaction ID üretmiştir.Yanıtta 21721$ olarak dönmesi, sunucunun doğru sorguya yanıt verdiğini doğrular.

# 2. İstemci Kaynak Portu (Source Port Randomization)İstemci portu: 44656 (Bir önceki testte 45138 idi).Güvenlik Savunması: Kaminsky tarzı DNS Spoofing saldırılarına karşı çekirdek sadece Transaction ID'yi değil, UDP kaynak portunu da ephemeral aralıktan ($32768 - 60999$) rastgele seçer. Böylece saldırganın tahmin etmesi gereken uzay:$$65536 \text{ (ID)} \times \approx 28000 \text{ (Port)} \approx 1.8 \times 10^9 \text{ kombinasyon}$$

#3. EDNS0 Cookie Farkıİstemci sorgusundaki cookie: [COOKIE 4567983123c960e7].Her sorgu oturumunda istemci tarafında yenilenen bu token, resolver (8.8.8.8) ile istemci arasındaki tek seferlik doğrulama sağlar.

#4. RTT (Gecikme Süresi)Sorgu çıkış: 04:27:26.964983Yanıt varış: 04:27:27.014726RTT: $\approx 49.7 \text{ ms}$ (UDP'nin tek gidiş-dönüşte çözümü tamamlama hızı).Bu döküm, scriptin ve UDP 53 izleme mantığının beklendiği gibi çalıştığını teyit ediyor.