#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python ortamı hazırlanıyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet flask requests

echo -e "${BLUE}[*] Eski prosesler temizleniyor...${NC}"
pkill -f "vulnerable/app.py" 2>/dev/null || true
pkill -f "fixed/app.py" 2>/dev/null || true
sleep 1

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5100)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5101)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Prosesler sonlandırılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda Eşzamanlı Çifte Harcama (Race Condition) ===${NC}"
if python3 tests/race_attack.py 5100; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: İki işlem de 100 TL bakiyeden 80 TL çekti! Lost Update gerçekleşti.${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Atomik Koruma Doğrulaması ===${NC}"
if python3 tests/race_attack.py 5101; then
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucuda yarış durumu engellenemedi!${NC}"
    exit 1
else
    echo -e "${GREEN}[+] BAŞARILI: Veritabanı atomik güncellemesi yarış durumunu engelledi; ikinci istek 400 aldı.${NC}"
fi

echo -e "\n${BLUE}=== TEST 3: Meşru Bakiye Çekimi Doğrulaması ===${NC}"
# 20 TL kalan bakiyeden 10 TL çekmeyi dene
LEGIT_RES=$(curl -s -w "\n%{http_code}" -X POST "http://127.0.0.1:5101/api/withdraw" \
    -H "Content-Type: application/json" \
    -d '{"amount": 10}')
LEGIT_CODE=$(echo "$LEGIT_RES" | tail -n1)
LEGIT_BODY=$(echo "$LEGIT_RES" \vert{} sed '$d')

if [ "$LEGIT_CODE" -eq 200 ] && echo "$LEGIT_BODY" | grep -q '"remaining":10'; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru bakiye çekimi sorunsuz çalışıyor.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru işlem başarısız oldu! (Kod: $LEGIT_CODE)${NC}"
    exit 1
fi
