# Lab 00-B: L4/L7 Paket Yakalama ve Plaintext Veri Sızıntısı

## Amaç
Şifrelenmemiş protokollerin (HTTP) ağ üzerinde nasıl şeffaf olduğunu `tcpdump` ile gözlemlemek ve TLS/HTTPS'in zorunluluğunu kanıtlamak.

## Adımlar
1. Arka planda ağ arayüzünü dinlemeye al:
   ```bash
   sudo tcpdump -i lo0 -A -s 0 'tcp port 8080'
Başka bir terminalden test isteği at:

Bash
curl -X POST http://localhost:8080/login -d "password=secretpassword"
tcpdump çıktısında giden şifrenin açık metin olarak yakalandığını gözlemle.
