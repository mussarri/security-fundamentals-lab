#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python sanal ortamı aktif ediliyor...${NC}"
source .venv/bin/activate

echo -e "${BLUE}[*] Eski prosesler temizleniyor...${NC}"
pkill -f "vulnerable/app.py" 2>/dev/null || true
pkill -f "fixed/app.py" 2>/dev/null || true
sleep 1

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5040)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5041)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Prosesler sonlandırılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

# Payload Açıklaması:
# Girdi: %2527%20OR%20%25271%2527=%25271
# 1. Werkzeug açar: "%27 OR %271%27=%271"
# 2. WAF bakar: İçinde literal [', --, /*, union, select] YOKTUR -> GEÇİRİR (200 OK)
# 3. Backend unquote açar: "' OR '1'='1" -> SQL Injection gerçekleşir!
PAYLOAD="%2527%20OR%20%25271%2527=%25271"
# PAYLOAD="%2527%20OR%20%25271%2527=%25271" su anlamda: URL encode edilmiş bir SQL Injection payload'ıdır. İlk decode ile WAF tarafından atlatılır, ikinci decode ile backend'de SQL Injection gerçekleşir.

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda Double-Encoded SQL Injection ===${NC}"
HTTP_CODE_VULN=$(curl -s -o /tmp/resp_vuln.txt -w "%{http_code}" "http://127.0.0.1:5040/api/search?category=${PAYLOAD}")
BODY_VULN=$(cat /tmp/resp_vuln.txt)

echo "HTTP Durum Kodu: $HTTP_CODE_VULN"
echo "Yanıt: $BODY_VULN"

if [ "$HTTP_CODE_VULN" -eq 200 ] && echo "$BODY_VULN" | grep -q "Flag_Day2_Bypass"; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: WAF kara listesi tamamen atlatıldı, ikinci decode ile SQLi çalıştı!${NC}"
else
    echo -e "${RED}[-] Beklenen exploit gerçekleşmedi (Kod: $HTTP_CODE_VULN).${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Payload Reddi ===${NC}"
HTTP_CODE_FIXED=$(curl -s -o /tmp/resp_fixed.txt -w "%{http_code}" "http://127.0.0.1:5041/api/search?category=${PAYLOAD}")
BODY_FIXED=$(cat /tmp/resp_fixed.txt)

echo "HTTP Durum Kodu: $HTTP_CODE_FIXED"
echo "Yanıt: $BODY_FIXED"

if [ "$HTTP_CODE_FIXED" -eq 400 ] && echo "$BODY_FIXED" | grep -q "INVALID_INPUT"; then
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış sunucu decode edilmiş verideki karakterleri yakaladı ve reddetti (400 Bad Request).${NC}"
else
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucu beklenen şekilde reddetmedi! (Kod: $HTTP_CODE_FIXED)${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 3: Meşru Arama Doğrulaması ===${NC}"
HTTP_CODE_LEGIT=$(curl -s -o /tmp/resp_legit.txt -w "%{http_code}" "http://127.0.0.1:5041/api/search?category=electronics")
BODY_LEGIT=$(cat /tmp/resp_legit.txt)

if [ "$HTTP_CODE_LEGIT" -eq 200 ] && echo "$BODY_LEGIT" | grep -q "Laptop"; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru arama sorunsuz çalışıyor.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru arama başarısız oldu! (Kod: $HTTP_CODE_LEGIT)${NC}"
    exit 1
fi
