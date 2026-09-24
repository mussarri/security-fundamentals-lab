# L4/L7 Ağ Analizi ve Packet Sniffing

## 1. TCP 3-Way Handshake (L4 İletim Katmanı)
İstemci ile sunucu arasında oturum kurulması:
1. `[SYN]` Client $\to$ Server (Seq=X)
2. `[SYN, ACK]` Server $\to$ Client (Seq=Y, Ack=X+1)
3. `[ACK]` Client $\to$ Server (Seq=X+1, Ack=Y+1)

## 2. Düz Metin (Plaintext) İletişim Riski (L7 Uygulama Katmanı)
HTTP, FTP, Telnet veya şifrelenmemiş veritabanı bağlantılarında (TLS kapalıyken) L7 yükü (payload) ağdaki herhangi bir dinleyici tarafından yakalanabilir:
- `tcpdump -i any -A -s 0 'tcp port 80'`
Bu komut, HTTP header'larındaki `Authorization: Bearer <token>` veya `Cookie` değerlerini ham metin olarak döker.

## 3. Dinleme Yetkisi
Ağ arayüzünü dinleme (`promiscuous mode` veya `SOCK_RAW`) Linux'ta çekirdek seviyesinde **`CAP_NET_RAW`** veya `root` yetkisi gerektirir.
