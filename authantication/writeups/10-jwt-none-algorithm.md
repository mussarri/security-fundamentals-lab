# Vaka Analizi: JWT `alg: none` İmza Atlama ve Algoritma Whitelist Savunması

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** Sunucu imza doğrulama stratejisini doğrudan kullanıcı kontrolündeki JWT başlığında yer alan `alg` değerine dayandırmış; `alg: "none"` geldiğinde imza doğrulamasını atlayarak sahte admin yetkilerini kabul etmiştir.
- **Sıkılaştırılmış Durumda:** Algoritma beyaz listesi (`ALLOWED_ALGORITHMS = ['HS256']`) zorunlu tutulmuş, `none` veya boş imza içeren token'lar doğrudan 403 Forbidden ile reddedilmiştir.

## 2. Root Cause

Kriptografik doğrulama parametrelerinin istemci tarafı verisine göre dinamik olarak seçilmesi ve algoritma kısıtlamasının yapılmaması.

## 3. Platform / Kütüphane Kontrolleri

RFC 7518 ve RFC 8725 spesifikasyonları; imzasız JWT'lerin güvenli ortamlarda asla kabul edilmemesini, kütüphanelerin açık algoritma listesi zorunluluğu getirmesini emreder.

## 4. Remediation (Düzeltme Adımları)

1. **Algoritma Beyaz Listesi (Whitelist):** Doğrulama mantığında izin verilen algoritmaları sabit bir liste olarak sınırla (`algorithms: ['HS256']`).
2. **Boş İmza Kontrolü:** Noktayla ayrılmış 3 parçanın varlığını ve imza parçası (`parts[2]`) içermeyen token'ları parser seviyesinde reddet.
3. **Zamanlama Saldırısı Koruması:** İmzaları karşılaştırırken `crypto.timingSafeEqual` kullanarak yan kanal (side-channel) saldırılarını önle.

## 5. Doğrulama

```bash
./tests/test-jwt-mitigation.sh
```

# 6. Variant Analysis

Key Confusion (RS256 -> HS256): Asimetrik genel anahtarın simetrik HMAC gizli anahtarı olarak kullanılmasıyla imza sahteciliği yapılması.

JWK/JKU Header Injection: JWT Header'ındaki jku veya jwk alanına saldırganın kendi genel anahtar URL'ini ekleterek sunucunun saldırganın anahtarıyla imza doğrulaması yapmaya zorlanması.
