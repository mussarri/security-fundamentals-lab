# Vaka Analizi: SSRF (Server-Side Request Forgery), Cloud Metadata Sızıntısı ve Egress Koruması

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** Sunucu `url` parametresini alarak doğrudan ağ soketi üzerinden `127.0.0.1:8000` adresine istek açmış; iç ağda korumasız çalışan admin paneli ve AWS IAM geçici kimlik bilgilerini sızdırmıştır.
- **Sıkılaştırılmış Durumda:** URL doğrulaması yapılarak hostname çözümlenmiş (`dns.lookup`), IP adresinin `127.0.0.0/8`, `169.254.0.0/16` ve RFC 1918 özel ağ bloklarında olduğu tespit edilerek istek 403 Forbidden ile sonlandırılmıştır.

## 2. Root Cause

Dış girdilerin sunucunun kendi ağ kimliği ve ayrıcalıklarıyla (Ambient Network Trust) kontrolsüz sorgu yapmasına izin verilmesi.

## 3. Platform / Cloud Kontrolleri

- **AWS IMDSv2:** Metadata erişiminde `PUT` metodu ile `X-aws-ec2-metadata-token` başlığı zorunlu tutularak SSRF saldırıları zorlaştırılmıştır.
- **GCP:** Metadata isteklerinde `Metadata-Flavor: Google` HTTP başlığını zorunlu kılar.

## 4. Remediation (Düzeltme Adımları)

1. **IP / CIDR Kısıtlaması:** Çözümlenen IP adresleri whitelist dışındaysa ve Loopback (`127.0.0.0/8`), Private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-Local (`169.254.0.0/16`) aralığındaysa isteği reddet.
2. **DNS Pinning:** Time-of-Check to Time-of-Use (TOCTOU) açıklarını ve DNS Rebinding ataklarını önlemek için, HTTP soketi çözümlenen ve doğrulanan sabit IP üzerinden açılmalıdır. Orijinal hostname yalnızca `Host:` başlığına yazılmalıdır.
3. **Protokol Whitelist:** Yalnızca `http` ve `https` protokollerine izin ver (`file://`, `gopher://` engellenmeli).
4. **Yönlendirmeleri (Redirects) Takip Etme:** Sunucunun döneceği `302 Found` yanıtlarının iç ağa sapmasını engellemek için yönlendirmeler manuel ele alınmalı veya her sekmede hedef IP yeniden doğrulanmalıdır.

## 5. Altyapı Katmanı Savunması: Egress Filtering (Çıkış Güvenlik Duvarı)

Uygulama kontrolleri bypass edilse dahi L4 ağ seviyesinde savunma hattı kurulmalıdır:

### A. Linux Host (iptables)

```bash
# Cloud Metadata ve İç CIDR bloklarına giden paketleri DROP/REJECT et
iptables -A OUTPUT -d 169.254.169.254/32 -j REJECT
iptables -A OUTPUT -d 10.0.0.0/8 -j REJECT
iptables -A OUTPUT -d 172.16.0.0/12 -j REJECT
iptables -A OUTPUT -d 192.168.0.0/16 -j REJECT
```

# B. Docker Ağ İzolasyonu

Dış URL sorgulayan servisleri izole köprü (bridge) ağlarına alıp dahili servis ağlarından (internal: true) fiziksel olarak ayır.

# C. Kubernetes NetworkPolicy

Dış dünyaya açık pod'ların yalnızca Port 53 (DNS) ve Port 443/80 üzerinden genel internete çıkmasını sağla; iç Pod CIDR ve 169.254.169.254/32 hedeflerini except kuralı ile bloke et.

# 6. Doğrulama

```Bash
./tests/test-ssrf-mitigation.sh
```

# 7. Variant Analysis

DNS Rebinding: TTL=0 manipülasyonu ile doğrulama anında genel IP, soket açılış anında 127.0.0.1 dönülmesi (DNS Pinning ile çözülür).

Format Bypasleri: 0.0.0.0, Decimal IP (2130706433), Hex IP (0x7f000001), IPv6 loopback ([::1]).

Headless Browser / PDF Engine Exploitation: wkhtmltopdf veya Puppeteer render süreçlerinde <iframe src="http://169.254.169.254"> çalıştırılması.
