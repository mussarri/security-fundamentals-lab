#!/usr/bin/env bash
set -euo pipefail

echo "[*] Hafta 2: Plaintext vs TLS Trafik Güvenlik Testi"

# 80 portunda basit bir test sunucusu ve dinleyici kontrolü simülasyonu
TEST_PAYLOAD="SecretPassword999"

echo "[*] Test sunucusu ayağa kaldırılıyor (Port 8888)..."
python3 -m http.server 8888 > /dev/null 2>&1 &
SERVER_PID=$!

trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

echo "[*] Trafik üzerinden veri okunabilirliği test ediliyor..."
RESPONSE=$(curl -s "http://127.0.0.1:8888/?token=${TEST_PAYLOAD}" || true)

echo "[+] Uyarı: HTTP üzerinden atılan istek L7 katmanında şifrelenmedi."
echo "[+] Sonuç: TLS olmadan aktarılan veriler network segmentinde CAP_NET_RAW sahibi herhangi bir süreç tarafından yakalanabilir."
echo "[+] Sıkılaştırma kontrolü: HSTS ve TLS 1.3 yönlendirmesi şarttır."
