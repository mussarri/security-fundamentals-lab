#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python sanal ortamı kuruluyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet flask requests

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5030)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5031)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Prosesler sonlandırılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda Duplicate Key ile Yetki Yükseltme ===${NC}"
# Payload: İlk 'role' değeri 'user' (Gateway görür), ikinci 'role' değeri 'admin' (Backend çalıştırır).
PAYLOAD='{"username": "attacker", "role": "user", "role": "admin"}'

# Test 1: Zafiyetli Sunucu
# Bu test, zafiyetli sunucunun duplicate key ile yetki yükseltmeye izin verip vermediğini kontrol eder.
RESPONSE_VULN=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5030/api/users \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
HTTP_CODE_VULN=$(echo "$RESPONSE_VULN" | tail -n1)
BODY_VULN=$(echo "$RESPONSE_VULN" \vert{} sed '$d')

echo "HTTP Durum Kodu: $HTTP_CODE_VULN"
echo "Yanıt: $BODY_VULN"

# Test 1 Sonucu
# Eğer HTTP kodu 201 ise ve yanıt gövdesinde "effective_role":"admin" geçiyorsa, bu zafiyetin başarılı bir şekilde tetiklendiğini gösterir.
if [ "$HTTP_CODE_VULN" -eq 201 ] && echo "$BODY_VULN" | grep -q '"effective_role":"admin"'; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: Gateway 'user' sandı, Backend 'admin' olarak kaydetti!${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
fi

# Test 2: Sıkılaştırılmış Sunucu
# Bu test, sıkılaştırılmış sunucunun duplicate key ile yetki yükseltmeye izin verip vermediğini kontrol eder. Beklenen sonuç, duplicate key tespit edilirse 400 Bad Request döndürülmesidir.
echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Duplicate Key Reddi ===${NC}"
RESPONSE_FIXED=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5031/api/users \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
HTTP_CODE_FIXED=$(echo "$RESPONSE_FIXED" | tail -n1)
BODY_FIXED=$(echo "$RESPONSE_FIXED" \vert{} sed '$d')

echo "HTTP Durum Kodu: $HTTP_CODE_FIXED"
echo "Yanıt: $BODY_FIXED"

if [ "$HTTP_CODE_FIXED" -eq 400 ] && echo "$BODY_FIXED" | grep -q "DUPLICATE_KEY_DETECTED"; then
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış parser belirsizliği reddetti (400 Bad Request).${NC}"
else
    echo -e "${RED}[!] REGRESYON: Yinelenen anahtar engellenemedi!${NC}"
    exit 1
fi

# Test 3: Meşru İstek Doğrulaması
# Bu test, sıkılaştırılmış sunucunun meşru JSON isteklerini hatasız işleyip işlemediğini kontrol eder. Beklenen sonuç, 201 Created döndürülmesidir.
echo -e "\n${BLUE}=== TEST 3: Meşru İstek Doğrulaması ===${NC}"
LEGIT_PAYLOAD='{"username": "alice", "role": "user"}'
RESPONSE_LEGIT=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:5031/api/users \
    -H "Content-Type: application/json" \
    -d "$LEGIT_PAYLOAD")
HTTP_CODE_LEGIT=$(echo "$RESPONSE_LEGIT" | tail -n1)

if [ "$HTTP_CODE_LEGIT" -eq 201 ]; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru JSON isteği hatasız işlendi.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru istek reddedildi!${NC}"
    exit 1
fi
