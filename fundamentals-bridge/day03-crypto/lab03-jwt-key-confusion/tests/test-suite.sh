#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python ortamı hazırlanıyor ve PyJWT, cryptography yükleniyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet flask "pyjwt>=2.0.0" cryptography requests

echo -e "${BLUE}[*] Eski prosesler temizleniyor...${NC}"
pkill -f "vulnerable/app.py" 2>/dev/null || true
pkill -f "fixed/app.py" 2>/dev/null || true
sleep 1

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5080)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5081)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Prosesler sonlandırılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda JWT Key Confusion (RS256 -> HS256) ===${NC}"
if python3 tests/exploit_key_confusion.py 5080; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: Public Key simetrik HMAC anahtarı gibi kullanılarak admin olundu!${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Algoritma Sabitleme (RS256 Allowlist) ===${NC}"
if python3 tests/exploit_key_confusion.py 5081; then
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucu Key Confusion atağını engelleyemedi!${NC}"
    exit 1
else
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış sunucu HS256 talebini reddetti ve atağı kesti (403 Rejection).${NC}"
fi

echo -e "\n${BLUE}=== TEST 3: Meşru RS256 Token Doğrulaması ===${NC}"
LEGIT_LOGIN=$(curl -s -X POST "http://127.0.0.1:5081/api/login")
LEGIT_TOKEN=$(echo "$LEGIT_LOGIN" | python3 -c 'import sys, json; print(json.load(sys.stdin)["token"])')

LEGIT_STATUS=$(curl -s -o /tmp/resp_legit.txt -w "%{http_code}" "http://127.0.0.1:5081/api/admin-dashboard" \
    -H "Authorization: Bearer $LEGIT_TOKEN")

if [ "$LEGIT_STATUS" -eq 200 ]; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru RS256 token sorunsuz kabul edildi.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru token doğrulanamadı! (Kod: $LEGIT_STATUS)${NC}"
    exit 1
fi
