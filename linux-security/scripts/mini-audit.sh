#!/usr/bin/env bash
set -uo pipefail

echo "=================================================="
echo "      Hafta 1: Linux Mini Security Auditor        "
echo "=================================================="

# 1. Ağ Arayüzü Kontrolü (0.0.0.0 vs 127.0.0.1)
echo -e "\n[*] 1. Dinlenen Soketler ve IP Binding Analizi:"
ss -tlpn | awk 'NR>1 {print $4, $6}' | while read -r addr proc; do # ss komutu ile dinlenen TCP soketlerini listeler ve awk ile IP adresi ve işlem bilgilerini alır. |while read -r addr proc; do # Her satırı okur ve IP adresi ile işlem bilgisini değişkenlere atar.
    if [[ "$addr" =~ 0\.0\.0\.0.* ]] || [[ "$addr" =~ \[::\].* ]]; then # Eğer IP adresi 0.0.0.0 veya [::] ise dinleyici tüm ağ arayüzlerinde açık demektir. Bu durumda uyarı verir.
        echo -e "  \033[0;31m[UYARI - PUBLIC]\033[0m Dinleyici tüm ağa açık: $addr ($proc)"
    else
        echo -e "  \033[0;32m[LOCAL]\033[0m Loopback veya kısıtlı: $addr ($proc)"
    fi
done

# 2. SUID Biti Kontrolü
echo -e "\n[*] 2. Standart Dışı SUID Binary'leri Aranıyor:"
find / -perm -4000 -type f 2>/dev/null | grep -E '/tmp|/home|/var' || echo "  [✓] Geçici/kullanıcı dizinlerinde şüpheli SUID binary bulunamadı."
# find komutu ile tüm dosya sisteminde SUID bitine sahip dosyaları arar ve grep ile /tmp, /home veya /var dizinlerinde bulunanları filtreler. Eğer bu dizinlerde SUID binary bulunmazsa güvenli olduğunu belirtir. SUID bitine sahip dosyalar, normal kullanıcılar tarafından root yetkisi ile çalıştırılabilir ve bu durum potansiyel bir güvenlik açığı oluşturabilir.

# 3. Tanımlı Linux Capabilities Kontrolü
echo -e "\n[*] 3. Atanmış Linux Capabilities Listesi:"
getcap -r / 2>/dev/null || echo "  [✓] Dosya sisteminde özel capability bulunamadı." # getcap komutu ile tüm dosya sisteminde atanmış Linux capabilities'leri listeler. Eğer özel capability bulunmazsa güvenli olduğunu belirtir. Linux capabilities, belirli işlemlere veya dosyalara özel yetkiler atayarak root yetkisi gerektirmeden belirli işlemleri gerçekleştirmeyi sağlar.

# 4. Privileged Port Ayarı
echo -e "\n[*] 4. Düşük Port Dinleme Sınırı:"
PORT_START=$(cat /proc/sys/net/ipv4/ip_unprivileged_port_start 2>/dev/null || echo "1024") # /proc/sys/net/ipv4/ip_unprivileged_port_start dosyasından düşük port dinleme sınırını okur. Eğer dosya okunamazsa varsayılan olarak 1024 değerini kullanır. Düşük portlar (0-1023) genellikle root yetkisi gerektirir ve bu sınırın 0 olması, container veya docker ortamlarında varsayılan bir durumdur.
echo "  ip_unprivileged_port_start: $PORT_START"
if [ "$PORT_START" -eq 0 ]; then # Eğer düşük port sınırı 0 ise, bu durum container veya docker ortamlarında varsayılan bir durumdur ve potansiyel olarak güvenlik riskleri oluşturabilir. Bu nedenle kullanıcıya uyarı verir. 
    echo -e "  \033[0;33m[NOT]\033[0m Düşük port sınırı 0 (Container/Docker ortamı varsayılanı).\033[0m"
fi

echo -e "\n=================================================="