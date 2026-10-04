#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python sanal ortamı kuruluyor ve bağımlılıklar (argon2-cffi, pytest) yükleniyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet argon2-cffi pytest

echo -e "${BLUE}[*] Kriptografik Maliyet ve Güvenlik Testleri Koşturuluyor...${NC}"
pytest -s tests/test_hashing.py

echo -e "\n${GREEN}[✓] Testler tamamlandı: Hızlı hash ile bellek-zorlu KDF arasındaki donanım maliyeti farkı kanıtlandı.${NC}"
