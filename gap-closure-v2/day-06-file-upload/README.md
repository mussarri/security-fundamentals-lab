# DAY 6: File Upload Security

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** Sunucu sadece istemcinin beyan ettiği `Content-Type: image/png` HTTP başlığına güvenmiş ve kullanıcının verdiği `webshell.php` dosya adını doğrudan diske yazmıştır. Sonuç olarak saldırgan sunucunun yorumlayabileceği zararlı bir betiği sisteme bırakabilmiştir.
- **Sıkılaştırılmış Durumda:** 
  1. Başlıktaki MIME tipine bakılmaksızın dosya içeriğinin ilk baytları taranmış (**Magic Bytes**); PNG imzasını taşımayan dosyalar reddedilmiştir.
  2. Dosya adı sunucu tarafında kriptografik rastgele **UUID v4** ile değiştirilmiş, dizin kaçışı veya zararlı uzantı çalıştırma olasılığı ortadan kaldırılmıştır.
  3. İndirme esnasında `Content-Disposition: attachment` ve `nosniff` zorunlu tutularak tarayıcı tarafında XSS (SVG/HTML) riski önlenmiştir.

## 2. Root Cause
- **Trust Boundary Failure & Code/Data Separation Failure:** İstemci beyanlarına (dosya adı ve `Content-Type`) koşulsuz güvenilmesi ve statik kullanıcı verisinin çalıştırılabilir kod (executable code) olarak yorumlanmasına zemin hazırlanması.

## 3. Atlatma (Bypass) Vektörleri
- **Polyglot Dosyalar:** Dosyanın başına meşru bir GIF/PNG imzası (`GIF89a...`) koyup arkasına PHP/JS payload'ı gizleme. Çözüm: Dosyayı bir grafik kütüphanesiyle (Sharp, ImageMagick) yeniden kodlamak (Re-encode/Re-render).
- **MIME Sniffing:** Sunucu `Content-Type: text/plain` dönse dahi tarayıcının dosya içinde HTML görüp onu çalıştırması. Çözüm: `X-Content-Type-Options: nosniff`.
- **Çift Uzantı:** `file.php.png` veya Apache konfigürasyonundaki handlers açıkları.

## 4. Remediation (Kalıcı Mimari Çözüm)
1. **İsimlendirme:** Orijinal dosya adını asla kullanma; sistemde UUID ata.
2. **Magic Bytes Denetimi:** Dosya başlık baytlarını doğrula.
3. **Depolama Alanı İzolasyonu:** Yüklemeleri web root dışında veya harici bir Object Storage (AWS S3, GCS) bucket'ında tut.
4. **Sunum Güvenliği:** Doğrudan tarayıcıda render ettirmek yerine indirmeye zorla (`attachment`).

## 5. Doğrulama
```bash
./gap-closure-v2/day-06-file-upload/test-suite.sh
cat << 'EOF' > gap-closure-v2/day-06-file-upload/README.md
# DAY 6: File Upload Security

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** Sunucu sadece istemcinin beyan ettiği `Content-Type: image/png` HTTP başlığına güvenmiş ve kullanıcının verdiği `webshell.php` dosya adını doğrudan diske yazmıştır. Sonuç olarak saldırgan sunucunun yorumlayabileceği zararlı bir betiği sisteme bırakabilmiştir.
- **Sıkılaştırılmış Durumda:** 
  1. Başlıktaki MIME tipine bakılmaksızın dosya içeriğinin ilk baytları taranmış (**Magic Bytes**); PNG imzasını taşımayan dosyalar reddedilmiştir.
  2. Dosya adı sunucu tarafında kriptografik rastgele **UUID v4** ile değiştirilmiş, dizin kaçışı veya zararlı uzantı çalıştırma olasılığı ortadan kaldırılmıştır.
  3. İndirme esnasında `Content-Disposition: attachment` ve `nosniff` zorunlu tutularak tarayıcı tarafında XSS (SVG/HTML) riski önlenmiştir.

## 2. Root Cause
- **Trust Boundary Failure & Code/Data Separation Failure:** İstemci beyanlarına (dosya adı ve `Content-Type`) koşulsuz güvenilmesi ve statik kullanıcı verisinin çalıştırılabilir kod (executable code) olarak yorumlanmasına zemin hazırlanması.

## 3. Atlatma (Bypass) Vektörleri
- **Polyglot Dosyalar:** Dosyanın başına meşru bir GIF/PNG imzası (`GIF89a...`) koyup arkasına PHP/JS payload'ı gizleme. Çözüm: Dosyayı bir grafik kütüphanesiyle (Sharp, ImageMagick) yeniden kodlamak (Re-encode/Re-render).
- **MIME Sniffing:** Sunucu `Content-Type: text/plain` dönse dahi tarayıcının dosya içinde HTML görüp onu çalıştırması. Çözüm: `X-Content-Type-Options: nosniff`.
- **Çift Uzantı:** `file.php.png` veya Apache konfigürasyonundaki handlers açıkları.

## 4. Remediation (Kalıcı Mimari Çözüm)
1. **İsimlendirme:** Orijinal dosya adını asla kullanma; sistemde UUID ata.
2. **Magic Bytes Denetimi:** Dosya başlık baytlarını doğrula.
3. **Depolama Alanı İzolasyonu:** Yüklemeleri web root dışında veya harici bir Object Storage (AWS S3, GCS) bucket'ında tut.
4. **Sunum Güvenliği:** Doğrudan tarayıcıda render ettirmek yerine indirmeye zorla (`attachment`).

## 5. Doğrulama
```bash
./gap-closure-v2/day-06-file-upload/test-suite.sh
