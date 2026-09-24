# Lab: tcpdump ile L4 Handshake ve L7 Plaintext Analizi

## Amaç
Şifrelenmemiş HTTP trafiği ile şifreli HTTPS trafiği arasındaki farkı L4 ve L7 seviyesinde paket paket incelemek; `tcpdump` filtreleme sözdizimini (Berkeley Packet Filter - BPF) uygulamak.

## Adımlar
1. Yerel loopback veya bridge arayüzünde HTTP dinleyicisi başlat:
   ```bash
   sudo tcpdump -i any -nn -A 'tcp port 8080'
Ayrı bir terminalden HTTP POST isteği gönder (Hassas veri simülasyonu):

Bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kargaa.com","password":"SuperSecretPassword123"}'
tcpdump çıktısında [SYN], [SYN, ACK], [ACK] bayraklarını ve hemen ardındaki HTTP POST gövdesini doğrula.

Çıktıyı pcap formatında kaydet:

Bash
sudo tcpdump -i any -w /tmp/traffic.pcap 'tcp port 8080'
