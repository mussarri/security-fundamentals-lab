#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python ortamı hazırlanıyor ve requests yükleniyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet requests

echo -e "${BLUE}[*] Eski prosesler temizleniyor...${NC}"
pkill -f "vulnerable/app.py" 2>/dev/null || true
pkill -f "fixed/app.py" 2>/dev/null || true
sleep 1

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5070)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5071)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Prosesler sonlandırılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda Length Extension Attack ===${NC}"
if python3 tests/exploit_lea.py 5070; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: Gizli anahtar bilinmeden &role=admin eklendi ve geçerli imza üretildi!${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda HMAC Korumasının Doğrulanması ===${NC}"
if python3 tests/exploit_lea.py 5071; then
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucu saldırıyı engelleyemedi!${NC}"
    exit 1
else
    echo -e "${GREEN}[+] BAŞARILI: HMAC-SHA256 yapısı Merkle-Damgård genişletme girişimini engelledi (403 Rejection).${NC}"
fi

echo -e "\n${BLUE}=== TEST 3: Meşru HMAC Token Doğrulaması ===${NC}"
TOKEN_RES=$(curl -s "http://127.0.0.1:5071/api/issue-token")
PAYLOAD=$(echo "$TOKEN_RES" | python3 -c 'import sys, json; print(json.load(sys.stdin)["payload"])')
SIG=$(echo "$TOKEN_RES" | python3 -c 'import sys, json; print(json.load(sys.stdin)["signature"])')

LEGIT_STATUS=$(curl -s -o /tmp/resp_legit.txt -w "%{http_code}" -X POST "http://127.0.0.1:5071/api/admin-action" \
    -H "Content-Type: application/json" \
    -d "{\"payload\": \"$PAYLOAD\", \"signature\": \"$SIG\"}")

if [ "$LEGIT_STATUS" -eq 200 ]; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru token ve HMAC imzası sorunsuz doğrulandı.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru token reddedildi!${NC}"
    exit 1
fi
