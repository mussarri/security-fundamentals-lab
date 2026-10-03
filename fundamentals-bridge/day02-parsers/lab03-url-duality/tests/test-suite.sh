#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python sanal ortamı hazırlanıyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet flask requests

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5050)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5051)...${NC}"
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
# Girdi: https://trusted-partner.com\attacker.com
# RFC 3986 (urllib.parse): hostname = "trusted-partner.com\attacker.com" veya Python sürümüne göre "trusted-partner.com"
# urllib.parse bazı Python sürümlerinde backslash'i host parçası sayabilir veya port öncesi kesebilir.
# İkinci etkili payload: https://trusted-partner.com\@attacker.com
# RFC 3986: host = trusted-partner.com (userinfo ayrışımı hatası)
# WHATWG: host = attacker.com
PAYLOAD='{"url": "https://trusted-partner.com\\attacker.com"}'

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda URL Parser Duality Bypass ===${NC}"
HTTP_CODE_VULN=$(curl -s -o /tmp/resp_vuln.txt -w "%{http_code}" -X POST http://127.0.0.1:5050/api/webhook \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
BODY_VULN=$(cat /tmp/resp_vuln.txt)

echo "HTTP Durum Kodu: $HTTP_CODE_VULN"
echo "Yanıt: $BODY_VULN"

if [ "$HTTP_CODE_VULN" -eq 200 ] && echo "$BODY_VULN" | grep -q "SSRF_TRIGGERED"; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: RFC 3986 doğrulayıcısı kandırıldı, WHATWG tüketicisi saldırgan hosta gitti!${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Belirsiz URL'nin Reddi ===${NC}"
HTTP_CODE_FIXED=$(curl -s -o /tmp/resp_fixed.txt -w "%{http_code}" -X POST http://127.0.0.1:5051/api/webhook \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
BODY_FIXED=$(cat /tmp/resp_fixed.txt)

echo "HTTP Durum Kodu: $HTTP_CODE_FIXED"
echo "Yanıt: $BODY_FIXED"

if [ "$HTTP_CODE_FIXED" -eq 400 ] && echo "$BODY_FIXED" | grep -q "PARSER_AMBIGUITY_DETECTED"; then
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış sunucu parser uyuşmazlığına yol açan karakteri yakaladı ve 400 ile reddetti.${NC}"
else
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucu beklenen reddi yapamadı! (Kod: $HTTP_CODE_FIXED)${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 3: Meşru URL Doğrulaması ===${NC}"
LEGIT_PAYLOAD='{"url": "https://api.trusted-partner.com/webhook/endpoint"}'
HTTP_CODE_LEGIT=$(curl -s -o /tmp/resp_legit.txt -w "%{http_code}" -X POST http://127.0.0.1:5051/api/webhook \
    -H "Content-Type: application/json" \
    -d "$LEGIT_PAYLOAD")
BODY_LEGIT=$(cat /tmp/resp_legit.txt)

if [ "$HTTP_CODE_LEGIT" -eq 200 ] && echo "$BODY_LEGIT" | grep -q "api.trusted-partner.com"; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru webhook hedefi hatasız onaylandı ve iletildi.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru hedef başarısız oldu! (Kod: $HTTP_CODE_LEGIT)${NC}"
    exit 1
fi
