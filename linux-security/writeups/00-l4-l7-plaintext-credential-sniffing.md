# Vaka Analizi: Şifrelenmemiş (Plaintext) Trafiğin Ağda Dinlenmesi (Sniffing)

## 1. Neden Çalıştı?
HTTP gibi L7 protokolleri veriyi şifrelemeden TCP segmentleri içine aktarır. Ağ segmentinde ham soket açabilen (`CAP_NET_RAW`) veya ARP spoofing ile araya giren (MitM) bir saldırgan, tüm paket gövdesini (JSON body, Cookie, Auth Header) düz metin olarak okur.

## 2. Root Cause
Taşıma Katmanı Güvenliğinin (TLS/HTTPS) uygulanmaması veya iç mikroservis trafiğinde şifrelemenin ihmal edilmesi.

## 3. Platform Önlemleri
- HSTS (HTTP Strict Transport Security) başlığı ile tarayıcının HTTP isteklerini zorunlu HTTPS'e çevirmesi.
- Container ve pod ağlarında mTLS (Mutual TLS) kullanımı.

## 4. Remediation (Düzeltme)
- Prodüksiyonda tüm dış uç noktalara TLS sertifikası zorunlu kılınmalı.
- Nginx / Reverse Proxy üzerinde HTTP trafiği 301 yönlendirmesi ile HTTPS'e yönlendirilmeli.

## 5. Doğrulama
`tcpdump` veya `wireshark` ile yakalanan paketlerde TLS Handshake sonrası payload'un rastgele baytlar (şifreli) olarak göründüğünü teyit etmek.

## 6. Variant Analysis
- Veritabanı bağlantı linklerinde `sslmode=disable` kullanılması.
- İç Redis kuyruklarının şifresiz ve TLS'siz koşturulması.
