cat << 'EOF' > labs/01-capabilities-and-sysctl.md
# Lab 01: Linux Capabilities ve Sysctl Çekirdek İzolasyonu

## Amaç
Container içinde `root` (UID 0) olunsa dahi Linux çekirdeğinin Capabilities ve Seccomp mekanizmalarıyla neleri engellediğini, `--cap-drop=ALL` verildiğinde dahi `net.ipv4.ping_group_range` yüzünden ICMP soketlerinin nasıl açık kalabildiğini ve tam izolasyonun nasıl sağlanacağını doğrulamak.

## Adımlar
1. Varsayılan yetkilerle Alpine container başlat:
   ```bash
   docker run --rm -it alpine:latest sh
Saat değiştirmeyi dene (CAP_SYS_TIME testi):

Bash
date -s "2025-01-01 12:00:00"
# Beklenen: Operation not permitted
Tüm capability'leri budayarak başlat:

Bash
docker run --rm -it --cap-drop=ALL alpine:latest sh
Ping at ve sysctl değerini oku:

Bash
ping -c 1 8.8.8.8
# Çekirdek ping_group_range nedeniyle izin verir!
cat /proc/sys/net/ipv4/ping_group_range
# Çıktı: 0 2147483647
Sysctl kapısını kilitleyerek tam izolasyonu sağla:

Bash
docker run --rm -it --cap-drop=ALL --sysctl net.ipv4.ping_group_range="1 0" alpine:latest sh
ping -c 1 8.8.8.8
# Beklenen: ping: permission denied (are you root?)