#!/usr/bin/env bash
set -uo pipefail

PORT=8888
TIMEOUT=2

echo "=================================================="
echo "   Hafta 2: Firewall Davranış Analizi (DROP vs REJECT) "
echo "=================================================="

# Test Fonksiyonu
benchmark_action() {
    local target_action=$1
    local log_file="/tmp/${target_action}_test.log"

    echo -e "\n[*] Test Edilen Politika: ${target_action}"
    iptables -F
    if [ "${target_action}" == "REJECT" ]; then
        iptables -A INPUT -p tcp --dport "${PORT}" -j REJECT --reject-with tcp-reset
    else
        iptables -A INPUT -p tcp --dport "${PORT}" -j DROP
    fi

    tcpdump -i lo -nn "tcp port ${PORT}" -c 3 > "${log_file}" 2>&1 &
    DUMP_PID=$!
    sleep 1

    START=$(date +%s%N)
    nc -z -v -w "${TIMEOUT}" 127.0.0.1 "${PORT}" 2>/dev/null || true
    END=$(date +%s%N)
    
    DIFF_MS=$(( (END - START) / 1000000 ))
    echo "  [+] Yanıt Süresi: ${DIFF_MS} ms"

    sleep 1
    echo "  [+] Paket Dökümü:"
    sed 's/^/      /' "${log_file}"
    
    iptables -F
    rm -f "${log_file}"
}

# REJECT Testi
benchmark_action "REJECT"

# DROP Testi
benchmark_action "DROP"

echo -e "\n[✓] Firewall karşılaştırması tamamlandı."