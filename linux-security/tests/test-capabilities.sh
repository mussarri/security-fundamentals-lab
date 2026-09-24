#!/usr/bin/env bash
set -e

echo "[*] Testing Default Container Capabilities..."
docker run --rm alpine:latest sh -c "ping -c 1 8.8.8.8 > /dev/null 2>&1 && echo '[+] Ping working (Default)'"
# docker ile çalıştırılan konteynerler varsayılan olarak belirli yeteneklere sahiptir. Bu test, konteynerin ICMP (ping) paketlerini gönderebilme yeteneğini doğrular.

echo "[*] Testing Hardened Container (--cap-drop=ALL + sysctl lock)..."
if docker run --rm --cap-drop=ALL --sysctl net.ipv4.ping_group_range="1 0" alpine:latest ping -c 1 8.8.8.8 > /dev/null 2>&1; then #bu test , konteynerin tüm yeteneklerini kaldırır ve sysctl ile ping_group_range'i 1 0 olarak ayarlar. Bu, ICMP paketlerinin gönderilmesini engellemelidir.
    echo "[-] FAILED: Ping should have been blocked!"
    exit 1
else
    echo "[+] SUCCESS: Raw/ICMP socket creation blocked at kernel level."
fi
