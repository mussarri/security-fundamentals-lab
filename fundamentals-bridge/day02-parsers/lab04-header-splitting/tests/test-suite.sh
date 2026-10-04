#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python ortamı hazırlanıyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate

echo -e "${BLUE}[*] Eski prosesler temizleniyor...${NC}"
pkill -f "vulnerable/app.py" 2>/dev/null || true
pkill -f "fixed/app.py" 2>/dev/null || true
sleep 1

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5060)...${NC}"
python3 vulnerable/app.py &
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5061)...${NC}"
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
# Geliştirici sadece CRLF (\r\n) filtrelediği için, saldırgan tekil LF (%0a) kullanır:
# lang=en%0aInjected-Header:attacker_controlled
# Toleranslı parser bu LF'i yeni satır kabul eder ve sahte başlığı HTTP yanıtına yerleştirir.
PAYLOAD="en%0aInjected-Header:pwned"

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda Bare LF ile Header Injection ===${NC}"
RESPONSE_VULN=$(curl -s -i "http://127.0.0.1:5060/set-pref?lang=${PAYLOAD}" || true)

echo "Sunucu Yanıt Başlıkları:"
echo "$RESPONSE_VULN" | head -n 10

if echo "$RESPONSE_VULN" | grep -qi "Injected-Header: pwned"; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: Tekil LF (\n) filtresi atlatıldı ve araya yeni HTTP başlığı enjekte edildi!${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda Delimiter Injection Reddi ===${NC}"
RESPONSE_FIXED=$(curl -s -i "http://127.0.0.1:5061/set-pref?lang=${PAYLOAD}" || true)

echo "Sunucu Yanıtı:"
echo "$RESPONSE_FIXED" | head -n 10

if echo "$RESPONSE_FIXED" | grep -q "SECURITY_REJECTION"; then
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış sunucu tekil kontrol karakterini yakaladı ve isteği 400 ile kesti.${NC}"
else
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucu enjeksiyonu engelleyemedi!${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 3: Meşru Başlık Değeri Doğrulaması ===${NC}"
LEGIT_RESPONSE=$(curl -s -i "http://127.0.0.1:5061/set-pref?lang=tr-TR" || true)

if echo "$LEGIT_RESPONSE" | grep -q "Set-Cookie: user_lang=tr-TR"; then
    echo -e "${GREEN}[+] BAŞARILI: Meşru başlık değeri sorunsuz işlendi.${NC}"
else
    echo -e "${RED}[!] HATA: Meşru istek başarısız oldu!${NC}"
    exit 1
fi
