#!/usr/bin/env bash
set -uo pipefail

echo "=================================================="
echo "      Hafta 1: Linux Mini Security Auditor        "
echo "=================================================="

# 1. Ağ Arayüzü Kontrolü (0.0.0.0 vs 127.0.0.1)
echo -e "\n[*] 1. Dinlenen Soketler ve IP Binding Analizi:"
ss -tlpn | awk 'NR>1 {print $4, $6}' | while read -r addr proc; do
    if [[ "$addr" =~ 0\.0\.0\.0.* ]] || [[ "$addr" =~ \[::\].* ]]; then
        echo -e "  \033[0;31m[UYARI - PUBLIC]\033[0m Dinleyici tüm ağa açık: $addr ($proc)"
    else
        echo -e "  \033[0;32m[LOCAL]\033[0m Loopback veya kısıtlı: $addr ($proc)"
    fi
done

# 2. SUID Biti Kontrolü
echo -e "\n[*] 2. Standart Dışı SUID Binary'leri Aranıyor:"
find / -perm -4000 -type f 2>/dev/null | grep -E '/tmp|/home|/var' || echo "  [✓] Geçici/kullanıcı dizinlerinde şüpheli SUID binary bulunamadı."

# 3. Tanımlı Linux Capabilities Kontrolü
echo -e "\n[*] 3. Atanmış Linux Capabilities Listesi:"
getcap -r / 2>/dev/null || echo "  [✓] Dosya sisteminde özel capability bulunamadı."

# 4. Privileged Port Ayarı
echo -e "\n[*] 4. Düşük Port Dinleme Sınırı:"
PORT_START=$(cat /proc/sys/net/ipv4/ip_unprivileged_port_start 2>/dev/null || echo "1024")
echo "  ip_unprivileged_port_start: $PORT_START"
if [ "$PORT_START" -eq 0 ]; then
    echo -e "  \033[0;33m[NOT]\033[0m Düşük port sınırı 0 (Container/Docker ortamı varsayılanı).\033[0m"
fi

echo -e "\n=================================================="