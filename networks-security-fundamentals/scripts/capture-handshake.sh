#!/usr/bin/env bash
set -euo pipefail

PORT=9999
DUMP_LOG="/tmp/tcp_handshake.log"
RST_LOG="/tmp/tcp_rst.log"

echo "=================================================="
echo "      Hafta 2: TCP Handshake & RST Analizörü      "
echo "=================================================="

# 1. 3-Way Handshake Testi
echo -e "\n[*] 1. Dinleyen Portta 3-Way Handshake Yakalanıyor (Port: ${PORT})..."
tcpdump -i lo -nn "tcp port ${PORT}" -c 5 > "${DUMP_LOG}" 2>&1 &
DUMP_PID=$!
sleep 1

nc -l 127.0.0.1 "${PORT}" > /dev/null &
NC_PID=$!
sleep 1

echo "TEST_PAYLOAD" | nc -N 127.0.0.1 "${PORT}"
wait "${DUMP_PID}" 2>/dev/null || true

echo "[+] Yakalanan Paketler:"
cat "${DUMP_LOG}"

# 2. Closed Port RST Testi
CLOSED_PORT=8888
echo -e "\n[*] 2. Kapalı Porta Bağlantı Denemesi ve Kernel RST Tepkisi (Port: ${CLOSED_PORT})..."
tcpdump -i lo -nn "tcp port ${CLOSED_PORT}" -c 2 > "${RST_LOG}" 2>&1 &
DUMP_RST_PID=$!
sleep 1

nc -z -v -w 1 127.0.0.1 "${CLOSED_PORT}" 2>/dev/null || true
wait "${DUMP_RST_PID}" 2>/dev/null || true

echo "[+] Yakalanan RST Paketi:"
cat "${RST_LOG}"

# Temizlik
rm -f "${DUMP_LOG}" "${RST_LOG}"
echo -e "\n[✓] Handshake ve RST testleri tamamlandı."