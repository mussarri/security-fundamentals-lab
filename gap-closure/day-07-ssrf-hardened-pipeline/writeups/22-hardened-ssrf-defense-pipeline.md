# Vaka Analizi: Kapsamlı SSRF Savunma Boru Hattı ve Çok Katmanlı İzolasyon

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** `http.get(url)` fonksiyonu kullanıcıdan gelen URL'yi doğrulamadan doğrudan ağa çıkarmış; `127.0.0.1:3022/internal/cloud-metadata` üzerindeki IAM rolünü dışarı sızdırmıştır.
- **Sıkılaştırılmış Durumda:** Çok aşamalı savunma boru hattı işletilmiştir:
  1. `file://`, `gopher://` gibi tehlikeli şemalar reddedilmiştir.
  2. URL'nin DNS kaydı (IPv4 ve IPv6) çekilerek RFC 1918, Loopback ve Link-Local (169.254.x.x) aralıkları kara listeye alınmıştır.
  3. **DNS Pinning:** TOCTOU (Time-of-Check to Time-of-Use) / DNS Rebinding saldırılarını önlemek için HTTP soketi doğrudan onaylanan IP adresine açılmıştır.
  4. **Redirect Re-Validation:** Sunucu 302 ile iç ağa zıplatmaya çalıştığında, `Location` başlığı boru hattının ilk adımından itibaren tekrar denetlenmiştir.

## 2. Root Cause
**Trust Boundary Failure.** Dışarıdan gelen URL parametresinin sunucunun sahip olduğu iç ağ ayrıcalıklarını kullanarak istek atmasına izin verilmesi.

## 3. Atlatma (Bypass) Vektörleri ve Önlemler
- **IPv6 Tünelleme:** `http://[::1]/` veya `http://[0:0:0:0:0:ffff:127.0.0.1]/`. Çözüm: IPv6 normalizasyonu ve ::ffff ayrıştırması.
- **DNS Rebinding:** DNS ilk sorguda kamu IP'si (8.8.8.8), soket açılırken ise 127.0.0.1 döner. Çözüm: DNS Pinning (Soketi çözümlenen IP'ye sabitleme).
- **HTTP Redirects:** Dış meşru adresten `Location: http://169.254.169.254` ile yönlendirme. Çözüm: Redirect zincirini recursive doğrulamadan geçirme.

## 4. Remediation (Nihai Mimari)
1. Uygulama Seviyesi: Yukarıda kodlanan `safeFetchPipeline` mantığı.
2. Ağ Seviyesi: Linux Kernel (iptables) veya Kubernetes NetworkPolicy ile sunucu çıkış trafiğinde (Egress) 169.254.169.254 ve 10.0.0.0/8 bloklarının DROP edilmesi.
