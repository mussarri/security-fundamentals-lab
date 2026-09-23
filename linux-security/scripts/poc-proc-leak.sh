#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 1: /proc Sızıntı Doğrulama Testi Başlıyor..."

# 1. appuser olarak hassas argüman ve env ile bir süreç başlat
FAKE_SECRET="SUPER_SECRET_API_TOKEN_12345"
su - appuser -c "TOKEN=${FAKE_SECRET} python3 -c 'import time; time.sleep(30)' --cli-secret=${FAKE_SECRET}" &
PID=$!
sleep 1

echo "[+] Süreç başlatıldı. PID: ${PID}"

# 2. cmdline kontrolü (World-readable test)
echo "[*] Test 1: /proc/${PID}/cmdline okunuyor (Beklenen: Başarılı - Zafiyet)..."
if grep -q "${FAKE_SECRET}" "/proc/${PID}/cmdline" 2>/dev/null; then
    echo -e "\033[0;31m[!] SIZINTI TESPIT EDILDI: CLI argümanı herkes tarafından okunabilir!\033[0m"
fi

# 3. environ kontrolü (DAC koruması test)
echo "[*] Test 2: 'attacker' kullanıcısı ile /proc/${PID}/environ okunuyor (Beklenen: Permission Denied)..."
if su - attacker -c "cat /proc/${PID}/environ" 2>/dev/null; then
    echo -e "\033[0;31m[!] BEKLENMEYEN DURUM: environ okunabildi!\033[0m"
else
    echo -e "\033[0;32m[✓] GÜVENLİ: Kernel DAC environ erişimini başarıyla engelledi.\033[0m"
fi

# Temizlik
kill -9 "${PID}" 2>/dev/null || true
echo "[*] Test tamamlandı."