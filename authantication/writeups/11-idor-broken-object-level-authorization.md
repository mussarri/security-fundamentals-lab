# Vaka Analizi: IDOR / BOLA (Insecure Direct Object References)

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** Ahmet'e ait geçerli bir Bearer token ile `/api/vulnerable/invoices/2` adresine istek atıldığında, backend yalnızca token'ın geçerliliğine bakmış ve 2 numaralı faturanın Mehmet'e ait olduğunu denetlemeden veriyi sızdırmıştır.
- **Sıkılaştırılmış Durumda:** İş mantığı seviyesinde nesne sahipliği (`invoice.userId === user.id`) kontrol edilmiş, yetkisiz istek 403 Forbidden ile kesilmiştir.

## 2. Root Cause

Kimlik doğrulama (Authentication) ile yetkilendirme (Authorization) kavramlarının birbirine karıştırılması; veritabanı sorgularının kullanıcı bağlamından izole şekilde yalnızca istemciden gelen nesne ID'sine dayandırılması.

## 3. Platform Kontrolleri

Framework'ler varsayılan olarak nesne sahipliği denetimi yapmaz. Çözüm RBAC/ABAC modelleri veya ORM seviyesinde tenancy filtreleri ile sağlanır.

## 4. Remediation (Düzeltme)

1. **Veritabanı Kısıtı:** `WHERE id = :id AND user_id = :current_user_id` prensibini uygula.
2. **Tahmin Edilemeyen ID'ler:** Sıralı ID yerine UUID v4 / CUID kullanarak enumerasyonu zorlaştır.
3. **Yetki Katmanı:** Controller veya Servis katmanında Policy / Guard yapıları kur.

## 5. Doğrulama

```bash
./tests/test-idor-mitigation.sh
```

# 6. Variant Analysis

Yatay Yetki Aşımı (Kullanıcı A -> Kullanıcı B).

Dikey Yetki Aşımı (Kullanıcı -> Admin konfigürasyonu).

Fonksiyon Düzeyinde Yetkilendirme Hatası (BFLA - Broken Function Level Authorization).
