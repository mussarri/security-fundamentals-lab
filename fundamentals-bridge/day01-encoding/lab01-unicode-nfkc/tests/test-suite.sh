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

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5010)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5011)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Temizlik yapılıyor, prosesler kapatılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda NFKC Collision Sömürüsü ===${NC}"
# Payload: adm\u2170n (Small Roman Numeral One -> 'i')
PAYLOAD="{\"username\": \"adm\u2170n\"}"

RESPONSE_VULN=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5010/register \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
HTTP_CODE_VULN=$(echo "$RESPONSE_VULN" | tail -n1)
BODY_VULN=$(echo "$RESPONSE_VULN" \vert{} sed '$d')

echo "HTTP Kodu: $HTTP_CODE_VULN"
echo "Yanıt Gövdesi: $BODY_VULN"

if [ "$HTTP_CODE_VULN" -eq 500 ] && echo "$BODY_VULN" | grep -q "DB_INTEGRITY_COLLISION"; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: adm\u2170n doğrulama ve müsaitlik filtresini atlatıp veritabanında 'admin' ile çakıştı.${NC}"
elif [ "$HTTP_CODE_VULN" -eq 201 ]; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: İkinci bir 'admin' hesabı oluşturuldu (Account Collision / Shadow Account).${NC}"
else
    echo -e "${GREEN}[+] Beklenmeyen sonuç / Tetiklenemedi.${NC}"
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Collision Girişiminin Reddi ===${NC}"
RESPONSE_FIXED=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5011/register \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
HTTP_CODE_FIXED=$(echo "$RESPONSE_FIXED" | tail -n1)
BODY_FIXED=$(echo "$RESPONSE_FIXED" \vert{} sed '$d')

echo "HTTP Kodu: $HTTP_CODE_FIXED"
echo "Yanıt Gövdesi: $BODY_FIXED"

if [ "$HTTP_CODE_FIXED" -eq 409 ]; then
    echo -e "${GREEN}[+] BAŞARILI: İstek kanonikleştirildikten sonra 'admin' ile çakıştığı tespit edildi ve 409 Conflict ile reddedildi.${NC}"
else
    echo -e "${RED}[!] REGRESYON: Beklenen 409 Conflict dönmedi! (Dönen: $HTTP_CODE_FIXED)${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 3: Meşru Kullanıcı Kaydı Doğrulaması ===${NC}"
LEGIT_PAYLOAD="{\"username\": \"bob_builder\"}"
RESPONSE_LEGIT=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5011/register \
    -H "Content-Type: application/json" \
    -d "$LEGIT_PAYLOAD")
HTTP_CODE_LEGIT=$(echo "$RESPONSE_LEGIT" | tail -n1)

if [ "$HTTP_CODE_LEGIT" -eq 201 ]; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru kayıt sorunsuz gerçekleşti.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru kayıt başarısız oldu! (Dönen: $HTTP_CODE_LEGIT)${NC}"
    exit 1
fi
