#!/usr/bin/env bash
set -e

RED='\033[031m'
GREEN='\033[032m'
BLUE='\033[034m'
NC='\033[0m'

echo -e "${BLUE}[*] Python sanal ortamı hazırlanıyor ve pytest çalıştırılıyor...${NC}"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet pytest

echo -e "${BLUE}[*] Birim testleri icra ediliyor...${NC}"
pytest -q tests/test_resolvers.py

echo -e "${GREEN}[+] Tüm kontroller başarıyla tamamlandı: Savunma mekanizması doğrulandı.${NC}"
