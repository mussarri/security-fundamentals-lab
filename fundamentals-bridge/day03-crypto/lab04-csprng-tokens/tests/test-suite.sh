#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python ortamı hazırlanıyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet flask requests "urllib3<2.0.0"

echo -e "${BLUE}[*] Eski prosesler temizleniyor...${NC}"
pkill -f "vulnerable/app.py" 2>/dev/null || true # Zafiyetli sunucu prosesini sonlandır
pkill -f "fixed/app.py" 2>/dev/null || true # Sıkılaştırılmış sunucu prosesini sonlandır
sleep 1

echo -e "${BLUE}[*] Zafiyetli Sunucu Başlatılıyor (Port 5090)...${NC}"
python3 vulnerable/app.py & # Zafiyetli sunucu başlatılıyor
PID_VULN=$!

echo -e "${BLUE}[*] Sıkılaştırılmış Sunucu Başlatılıyor (Port 5091)...${NC}"
python3 fixed/app.py & # Sıkılaştırılmış sunucu başlatılıyor
PID_FIXED=$!

cleanup() {
    echo -e "${BLUE}[*] Prosesler sonlandırılıyor...${NC}"
    kill $PID_VULN 2>/dev/null || true
    kill $PID_FIXED 2>/dev/null || true
}
trap cleanup EXIT # Çıkışta cleanup fonksiyonu çağrılır

sleep 2

echo -e "\n${BLUE}=== TEST 1: Zafiyetli Sunucuda PRNG Token Tahmini ===${NC}"
if python3 tests/exploit_prng.py 5090; then
    echo -e "${RED}[!] EXPLOIT BAŞARILI: Deterministik seed kullanılarak sıfırlama token'ı tahmin edildi!${NC}"
else
    echo -e "${GREEN}[+] Zafiyet tetiklenemedi.${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== TEST 2: Sıkılaştırılmış Sunucuda CSPRNG Tahmin Direnci ===${NC}"
if python3 tests/exploit_prng.py 5091; then
    echo -e "${RED}[!] REGRESYON: Sıkılaştırılmış sunucuda token tahmin edildi!${NC}"
    exit 1
else
    echo -e "${GREEN}[+] BAŞARILI: secrets modülü tahmin edilemez 256-bit entropi üretti.${NC}"
fi

echo -e "\n${BLUE}=== TEST 3: Meşru Sıfırlama Akışı Doğrulaması ===${NC}"
# Doğrudan bellek içi yapıdan değil, güvenli uç noktanın çalıştığını doğrula
STATUS_FIXED=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:5091/api/request-reset" \
    -H "Content-Type: application/json" \
    -d '{"email": "valid.user@internal.corp"}')

if [ "$STATUS_FIXED" -eq 200 ]; then
    echo -e "${GREEN}[+] BAŞARILI: Sıkılaştırılmış parola sıfırlama uç noktası devrede.${NC}"
else
    echo -e "${RED}[!] HATA: Sıkılaştırılmış uç nokta hata verdi! (Kod: $STATUS_FIXED)${NC}"
    exit 1
fi
