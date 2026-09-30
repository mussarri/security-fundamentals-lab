#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  DAY 5: Filesystem Security Lab - Verification Suite     "
echo "=========================================================="

node gap-closure-v2/day-05-filesystem-security/server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:4005"

echo "[*] Adım 1: Zafiyetli Uç Noktada Path Traversal (../../system_secret.txt)..."
VULN_RESP=$(curl -s "$API_URL/api/vulnerable/read?file=../../system_secret.txt")

if echo "$VULN_RESP" | grep -q "FLAG{SECRET_SYSTEM_CONFIG_SHADOW}"; then
    echo "[!] ZAFİYET ONAYLANDI: İzin verilen dizinin dışındaki gizli dosya okundu!"
else
    echo "[-] HATA: Traversal tetiklenemedi."
    exit 1
fi

echo ""
echo "[*] Adım 2: Hatalı Savunma (Naive Replace) Atlatma Testi (....//system_secret.txt)..."
FLAWED_RESP=$(curl -s "$API_URL/api/flawed/read?file=....//system_secret.txt")

if echo "$FLAWED_RESP" | grep -q "FLAG{SECRET_SYSTEM_CONFIG_SHADOW}"; then
    echo "[!] ATLATMA BAŞARILI: '....//' girdisi naive replace filtresini deldi!"
else
    echo "[-] HATA: Naive filtre atlatılamadı."
    exit 1
fi

echo ""
echo "[*] Adım 3: Sıkılaştırılmış Uç Noktada Doğrudan Traversal Engellemesi..."
HARD_RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/read?file=../../system_secret.txt")

if [ "$HARD_RESP_CODE" -eq 403 ] || [ "$HARD_RESP_CODE" -eq 404 ]; then
    echo "[+] BAŞARILI: Klasik Traversal engellendi (HTTP $HARD_RESP_CODE)."
else
    echo "[-] HATA: Sıkılaştırılmış uç noktada dizin kaçışı gerçekleşti! HTTP Kodu: $HARD_RESP_CODE"
    exit 1
fi

echo ""
echo "[*] Adım 4: SYMLINK KAÇIŞI TESTİ (leak_link.txt -> ../system_secret.txt)..."
SYMLINK_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/hardened/read?file=leak_link.txt")

if [ "$SYMLINK_CODE" -eq 403 ]; then
    echo "[+] BAŞARILI: Sembolik bağ (Symlink) çözümlendi ve kök dizin dışına çıktığı için 403 ile reddedildi!"
else
    echo "[-] HATA: Symlink kaçışı tespit edilemedi! HTTP Kodu: $SYMLINK_CODE"
    exit 1
fi

echo ""
echo "[*] Adım 5: Meşru Dosya Okuma Testi (welcome.txt)..."
LEGIT_CONTENT=$(curl -s "$API_URL/api/hardened/read?file=welcome.txt")

if echo "$LEGIT_CONTENT" | grep -q "Merhaba Dünya: Kamu Belgesi"; then
    echo "[+] BAŞARILI: İzin verilen dosya sorunsuz okundu."
else
    echo "[-] HATA: Meşru dosya okunamadı!"
    exit 1
fi

echo ""
echo "=========================================================="
echo "[+] DAY 5: Filesystem Security Lab TÜM TESTLERDEN GEÇTİ.  "
echo "=========================================================="
