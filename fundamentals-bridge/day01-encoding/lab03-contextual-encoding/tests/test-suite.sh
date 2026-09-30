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

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5020)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5021)...${NC}"
python3 fixed/app.py &
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Temizlik yapılıyor, prosesler kapatılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo -e "\n${BLUE}=== TEST 1: HTML Entity Encoding ile Blacklist Filtresi Bypass (Zafiyetli) ===${NC}"
# Payload: &#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)
# Filtre "javascript:" aradığı için entity encode halini yakalayamaz.
PAYLOAD="&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)"

RESPONSE_VULN=$(curl -s "http://127.0.0.1:5020/profile?website=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("""'"$PAYLOAD"'"""))')")

echo "Sunucu Yanıtı:"
echo "$RESPONSE_VULN" | grep -o 'href="[^"]*"'

if echo "$RESPONSE_VULN" | grep -q "&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)"; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: HTML entity payload filtreden geçti ve href attribute'una enjekte edildi.${NC}"
    echo -e "${RED}    Tarayıcı bunu HTML Parser -> 'javascript:alert(1)' -> JS Engine akışıyla çalıştıracaktır.${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Çok Katmanlı Payload Engelleme ===${NC}"
RESPONSE_FIXED=$(curl -s "http://127.0.0.1:5021/profile?website=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("""'"$PAYLOAD"'"""))')")

echo "Sunucu Yanıtı:"
echo "$RESPONSE_FIXED" | grep -o 'href="[^"]*"'

if echo "$RESPONSE_FIXED" | grep -q 'href="#invalid-scheme"'; then
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış sunucu HTML entity'yi unescape etti, şemanın 'javascript:' olduğunu saptadı ve '#invalid-scheme' döndü.${NC}"
else
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucu atağı yakalayamadı!${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 3: Meşru URL Doğrulaması ===${NC}"
LEGIT_URL="https://example.com/user/alice?tab=info&lang=en"
RESPONSE_LEGIT=$(curl -s "http://127.0.0.1:5021/profile?website=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("""'"$LEGIT_URL"'"""))')")

if echo "$RESPONSE_LEGIT" | grep -q 'href="https://example.com/user/alice?tab=info&amp;lang=en"'; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru HTTPS URL doğru context encoding (& -> &amp;) ile kabul edildi.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru URL işlenirken hata oluştu!${NC}"
    exit 1
fi
