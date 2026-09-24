# Vaka Analizi: CORS Preflight (OPTIONS) Mekanizması ve State Mutation Önleme

## 1. Neden Çalıştı / Neden Engellendi?

- **Basit İsteklerde (GET):** Tarayıcı sunucuda kalıcı durum değişikliği (state mutation) beklemediği için preflight tetiklemeden doğrudan isteği yollar.
- **Karmaşık İsteklerde (DELETE + Custom Header):** Tarayıcı, sunucunun bu metot ve başlıkları destekleyip desteklemediğini doğrulamak için asıl istekten önce `OPTIONS` uçuşu yapar. Sunucu gerekli `Access-Control-Allow-Methods` ve `Access-Control-Allow-Headers` başlıklarını dönmezse asıl `DELETE` isteği sunucuya hiç iletilmez.

## 2. Root Cause

Sunucunun durumunu değiştirebilecek (state-mutating) isteklerin, CORS desteği olmayan eski (legacy) API'lerde kazara çalıştırılmasını engelleme gereksinimi.

## 3. Platform / Tarayıcı Kontrolleri

W3C CORS spesifikasyonuna göre tarayıcı; `Content-Type: application/json`, yetkilendirme başlıkları veya `GET/HEAD/POST` dışındaki metotlarda `OPTIONS` uçuşunu zorunlu kılar.

## 4. Remediation (Doğru Yapılandırma)

- `OPTIONS` isteklerine `204 No Content` durum kodu ile dönülmeli.
- İzin verilen metotlar (`Access-Control-Allow-Methods`) ve başlıklar (`Access-Control-Allow-Headers`) açıkça belirtilmeli.
- Gereksiz preflight trafiğini azaltmak için `Access-Control-Max-Age` (örn. 86400 sn) tanımlanmalıdır.

## 5. Doğrulama

```bash
curl -I -X OPTIONS http://localhost:4000/api/users/42 \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: DELETE"
```

# 6. Variant Analysis

API Gateway / Reverse Proxy katmanında OPTIONS isteklerinin yutulması veya yanlış yapılandırılması sonucu meşru SPA isteklerinin kırılması.
