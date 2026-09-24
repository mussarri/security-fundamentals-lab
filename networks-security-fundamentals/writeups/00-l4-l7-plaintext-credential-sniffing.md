# Vaka Analizi: Ağ Trafiğinin Dinlenmesi (Sniffing) ve L4/L7 Güvenlik Analizi

## 1. Neden Çalıştı? (Execution & Exploit Analysis)

HTTP gibi L7 protokolleri, uygulama verilerini doğrudan TCP yükü (payload) içerisine metin olarak yerleştirir.
Ağ arayüzünde `CAP_NET_RAW` yetkisine veya `root` erişimine sahip bir aktör (veya ARP zehirlemesiyle trafiği üzerine çeken biri), `tcpdump` veya raw soket dinleyicileriyle TCP paketlerini yakalar:

```bash
tcpdump -i eth0 -A 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'
```

Bu filtreleme sonucunda JSON gövdesindeki kullanıcı parolaları, Cookie değerleri ve Authorization: Bearer <JWT> token'ları şifresiz olarak saldırganın terminaline düşer.

# 2. Root Cause (Kök Neden Analizi)

Taşıma Katmanı Güvenliğinin (TLS/HTTPS) Atlanması veya İç Ağ Güven İllüzyonu.
Servislerin "nasılsa iç ağda çalışıyor" veya "nasılsa container arkasında" denilerek şifrelenmemiş HTTP ile konuşturulması. Container ortamlarında aynı bridge ağındaki herhangi bir container CAP_NET_RAW kapatılmadıysa diğer container'ların trafiğini izleyebilir.

# 3. Platform / Framework Önlemleri

HSTS (HTTP Strict Transport Security): Tarayıcılara ilgili domain ile asla düz HTTP üzerinden konuşmama talimatı verilmesi.

TLS 1.3 Zorunluluğu: Zayıf şifreleme algoritmalarının (RC4, 3DES) ve güvensiz renegotiation açıklarının çekirdek seviyesinde elenmesi.

# 4. Remediation / Hardening (Geliştirici & DevOps Düzeltmesi)

Dış dünyaya açık tüm reverse proxy konfigürasyonlarında 80 portu istisnasız 301 Moved Permanently ile HTTPS'e yönlendirilmeli.

Nginx üzerinde HSTS başlığı aktif edilmeli:

```bash
Nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

Mikroservisler arası hassas iletişimde mTLS (Mutual TLS) veya WireGuard/IPSec VPN tünelleri tercih edilmeli.

Container'larda cap_drop: [ALL] ile ham soket açma (CAP_NET_RAW) yetkisi tamamen sıfırlanmalı.

# 5. Doğrulama (Verification & Regression Testing)

Curl ile HTTP isteği yapıldığında doğrudan 301 yönlendirmesi alındığını doğrula:

```Bash
curl -I [http://api.application.com](http://api.application.com)
# Beklenen Çıktı:
# HTTP/1.1 301 Moved Permanently
# Location: [https://api.application.com/](https://api.application.com/)
```

SSL Labs veya testssl.sh aracı ile TLS 1.0/1.1 protokollerinin tamamen kapalı olduğunu test et.

# 6. Variant Analysis (Başka Nerede Karşımıza Çıkar?)

Veritabanı Bağlantıları: Backend ile PostgreSQL arasındaki DATABASE_URL içinde sslmode=require veya sslmode=verify-full yerine sslmode=disable kullanılması.

Redis / Cache Kümeleri: Şifresiz Redis cluster trafiğinin VPC içinde dinlenebilmesi.
