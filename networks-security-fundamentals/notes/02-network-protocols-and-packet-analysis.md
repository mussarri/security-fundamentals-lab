# Hafta 2: Ağ Protokolleri, L4/L7 Modelleri ve Paket Analizi

## 1. Ağ Katmanları ve Güvenlik Sınırları
- **L4 (Transport Layer - TCP/UDP):** Portlar, oturum kurulumu (Handshake), akış kontrolü ve güvenilirlik. Şifreleme katmanı (TLS) henüz devrede değilse payload açıktır.
- **L7 (Application Layer - HTTP, DNS, SMTP, SSH):** İş mantığı verilerinin taşındığı katmandır. HTTP başlıkları (Authorization, Cookie, Set-Cookie), JSON gövdeleri burada bulunur.

## 2. TCP 3-Way Handshake Mekanizması
Bağlantı kurulurken geçen bayraklar:
1. `[SYN]` İstemci -> Sunucu (Seq=X, MSS, Window scale bilgileri)
2. `[SYN, ACK]` Sunucu -> İstemci (Seq=Y, Ack=X+1)
3. `[ACK]` İstemci -> Sunucu (Seq=X+1, Ack=Y+1)
*Güvenlik Notu:* SYN Flood saldırıları, sunucunun TCP SYN kuyruğunu (`backlog`) tüketerek DoS yaratmayı hedefler. Çözüm: `SYN Cookies` (`net.ipv4.tcp_syncookies = 1`).

## 3. Paket Yakalama (Packet Sniffing) ve Çekirdek İzinleri
- Linux çekirdeğinde ham soket açıp paket dinlemek (`SOCK_RAW`, `PF_PACKET`) **`CAP_NET_RAW`** veya doğrudan `root` yetkisi gerektirir.
- Promiscuous mod: Ağ kartının yalnızca kendisine gelen paketleri değil, ağ segmentindeki tüm paketleri alması durumudur.

## 4. Plaintext vs Encrypted Protokoller
| Protokol | Katman | Şifreleme Durumu | Risk |
|---|---|---|---|
| HTTP | L7 | Yok (Düz Metin) | MitM ile Cookie, Token, Şifre sızıntısı |
| HTTPS (TLS) | L7/L4 | TLS 1.3 (AEAD) | SNI hariç başlıklar ve payload şifrelidir |
| Telnet / FTP | L7 | Yok | Kimlik bilgileri ağda açıkça okunur |
| SSH | L7 | Uçtan uca şifreli | Oturum anahtarı değişimi sonrası güvenli |
