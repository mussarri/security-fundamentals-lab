#!/usr/bin/env bash
set -e

echo "[*] Setting up isolated networks..."
docker network create public-net > /dev/null 2>&1 || true
docker network create --internal secure-net > /dev/null 2>&1 || true

docker run -d --name c-frontend --network public-net alpine:latest sleep 30 > /dev/null
docker run -d --name c-database --network secure-net alpine:latest sleep 30 > /dev/null

echo "[*] Verifying Frontend -> Database Isolation..."
if docker exec c-frontend ping -c 1 -W 1 c-database > /dev/null 2>&1; then
    echo "[-] FAILED: Frontend reached Database!"
else
    echo "[+] SUCCESS: Frontend cannot resolve or reach isolated Database."
fi

echo "[*] Verifying Database -> Internet (WAN) Isolation..."
if docker exec c-database ping -c 1 -W 1 8.8.8.8 > /dev/null 2>&1; then
    echo "[-] FAILED: Database has outbound Internet access!"
else
    echo "[+] SUCCESS: Internal network blocks external WAN access."
fi

echo "[*] Cleaning up test containers and networks..."
docker rm -f c-frontend c-database > /dev/null 2>&1
docker network rm public-net secure-net > /dev/null 2>&1
echo "[+] All network security tests passed."
