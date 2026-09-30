#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Sanal ortam hazırlanıyor ve bağımlılıklar yükleniyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet flask requests

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5000)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5001)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Temizlik yapılıyor, prosesler kapatılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucu Üzerinde Double-Encoding Bypass ===${NC}"
# Payload: %252e%252e%252fadmin -> Nginx 1 kez açar: %2e%2e%2fadmin (proxy /public zanneder) -> Backend 2. kez açar: ../admin
# Simülasyon: Flask endpointine gönderilen çift encode traversal
RESPONSE_VULN=$(curl -s -w "\n%{http_code}" "http://127.0.0.1:5000/public/%252e%252e%2fadmin")
HTTP_CODE_VULN=$(echo "$RESPONSE_VULN" | tail -n1)
BODY_VULN=$(echo "$RESPONSE_VULN" \vert{} sed '$d')

echo "HTTP Kodu: $HTTP_CODE_VULN"
echo "Yanıt Gövdesi: $BODY_VULN"

if [ "$HTTP_CODE_VULN" -eq 200 ] \vert{}\vert{} echo "$BODY_VULN" | grep -q "CRITICAL_ADMIN_ACCESS_GRANTED"; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: Çift decode ve yetersiz normalizasyon ile bypass yapıldı.${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucu Üzerinde Saldırı Engelleme ===${NC}"
RESPONSE_FIXED=$(curl -s -w "\n%{http_code}" "http://127.0.0.1:5001/public/%252e%252e%2fadmin")
HTTP_CODE_FIXED=$(echo "$RESPONSE_FIXED" | tail -n1)
BODY_FIXED=$(echo "$RESPONSE_FIXED" \vert{} sed '$d')

echo "HTTP Kodu: $HTTP_CODE_FIXED"
echo "Yanıt Gövdesi: $BODY_FIXED"

if [ "$HTTP_CODE_FIXED" -eq 200 ] && echo "$BODY_FIXED" | grep -q "AUTHORIZED_ADMIN_ACCESS"; then
    echo -e "${RED}[!] REGRESYON HATASI: Sıkılaştırılmış sunucu saldırıyı engelleyemedi!${NC}"
    exit 1
else
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış sunucu çift decode yapmadı ve yetkisiz erişimi engelledi (Kod: $HTTP_CODE_FIXED).${NC}"
fi

echo -e "\n${BLUE}=== TEST 3: Meşru İstek Doğrulaması ===${NC}"
LEGIT_RESPONSE=$(curl -s -w "\n%{http_code}" "http://127.0.0.1:5001/public/documents/report.pdf")
LEGIT_CODE=$(echo "$LEGIT_RESPONSE" | tail -n1)

if [ "$LEGIT_CODE" -eq 200 ]; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru istekler hatasız çalışıyor.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru istek reddedildi!${NC}"
    exit 1
fi
