# Vaka Analizi: Hatalı Dosya İzinleri (DAC) ile Secret Sızıntısı

## 1. Neden Çalıştı / Neden Engellendi?
Linux dosya sisteminde bir dosya `chmod 644` veya `chmod 777` ile bırakıldığında, host üzerindeki `Others` sınıfına giren herhangi bir servis veya yetkisiz process (örn. `www-data`, `nobody`) bu dosyayı doğrudan okuyabilir. `chmod 600` yapıldığında çekirdek inode üzerindeki izin bitlerini kontrol eder ve dosya sahibi haricindeki tüm okuma çağrılarına `EACCES (Permission denied)` döner.

## 2. Root Cause
Varsayılan sistem `umask` (022) değerine güvenilmesi ve prodüksiyon ortamında gizli anahtarların (`.env`) açık izinlerle dağıtılması.

## 3. Platform / Framework Önlemleri
- SSH istemcisinin izinleri `600` olmayan `id_rsa` anahtarlarını kullanmayı doğrudan reddetmesi (`Permissions are too open`).
- Gizli verilerin dosya yerine Vault / Secret Manager üzerinden belleğe yüklenmesi.

## 4. Remediation (Düzeltme)
- Tüm hassas dosyalar `chmod 600` ile kilitlenmeli.
- İlgili uygulamanın process'i dosya sahibi olan UID ile çalıştırılmalı.

## 5. Doğrulama
```bash
./tests/test-file-permissions.sh
6. Variant Analysis
Git reponun içine yanlışlıkla commit edilen .env dosyaları.

AWS S3 bucket'larının Public Read olarak yapılandırılması.
