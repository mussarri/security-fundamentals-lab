# Vaka Analizi: Reflected XSS ve Content Security Policy (CSP)

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** `?q=<img src=x onerror=alert(1)>` girdisi ham biçimde HTML DOM yapısına dahil edilmiş; tarayıcı `onerror` olayını ayrıştırıp JS motorunda çalıştırmıştır.
- **Sıkılaştırılmış Durumda:** HTML kaçışlama girdiyi metne dönüştürmüş; ek olarak `script-src 'self'` CSP kuralı satır içi event handler yürütülmesini engellemiştir.

## 2. Root Cause

Kullanıcı girdilerinin context-aware (bağlama duyarlı) encode edilmemesi ve yürütülebilir alanların tarayıcı seviyesinde kısıtlanmaması.

## 3. Platform Kontrolleri

W3C CSP spesifikasyonu; `'unsafe-inline'` tanımlanmadığı sürece satır içi script etiketlerini ve event handler özniteliklerini engeller.

## 4. Remediation

1. Tüm kullanıcı girdilerini bağlamına göre (`HTML Body`, `HTML Attribute`, `JavaScript Context`) encode et.
2. Katı CSP (`default-src 'self'; script-src 'self' 'nonce-...'; object-src 'none'`) başlıkları tanımla.

## 5. Doğrulama

```bash
./tests/test-csp-enforcement.sh

```

# 6. Variant Analysis

React ve modern SPA'larda dangerouslySetInnerHTML kullanımı.

DOM sink'lerinde (innerHTML, outerHTML) location.search veya location.hash okunması.
