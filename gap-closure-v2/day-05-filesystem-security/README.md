# DAY 5: Filesystem Security (Path Traversal, Canonicalization & Symlink Containment)

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** `path.join(PUBLIC_DIR, requestedFile)` ifadesi işletim sisteminin dizin çözümleme mantığı gereği `../` üst dizin komutlarını işledi ve sunucu kök dizini aşılarak `system_secret.txt` içeriği okundu. Benzer şekilde tek geçişli string replace (`....//`) filtresi kolayca atlatıldı.
- **Sıkılaştırılmış Durumda:** 
  1. `fs.realpathSync` ile dosyanın işletim sistemindeki gerçek disk yolu (`canonical path`) ve sembolik bağları çözümlendi.
  2. Çözümlenen yolun izin verilen kök dizinin (`realRoot + path.sep`) altında kalıp kalmadığı kontrol edildi (`startsWith`).
  3. `leak_link.txt` sembolik bağı `system_secret.txt`'yi gösterse dahi, kanonik adres kök dizin dışında kaldığı için `403 Forbidden` ile bloklandı.

## 2. Root Cause
- **Trust Boundary Failure & Interpretation Differential:** Kullanıcı kontrolündeki göreceli yol ifadesinin, işletim sistemi dosya yolu hiyerarşisiyle birleştiğinde oluşturacağı sonuç yolların öngörülmemesi.

## 3. Yaygın Traversal Vektörleri
- **URL Encoding:** `%2e%2e%2f` (`../`), `%252e%252e%252f` (Double URL Encoding).
- **Nested Replacement:** `....//` veya `..././`.
- **Null Byte Injection (Eski runtime'lar):** `file.png%00.php`.
- **Symlink Attacks:** Uygulamanın yazabildiği bir dizine sunucu dışındaki hassas bir dosyayı gösteren sembolik bağ atılması.

## 4. Remediation (Kalıcı Mimari Çözüm)
1. **Canonicalization (Kanonik Yol Çözümü):** Her zaman `realpath` fonksiyonunu kullan.
2. **Kök Dizin Kapsama Denetimi (Safe Directory Containment):**
   ```javascript
   const realCandidate = fs.realpathSync(targetPath);
   const realRoot = fs.realpathSync(ROOT_DIR);
   if (!realCandidate.startsWith(realRoot + path.sep)) {
     throw new Error("Traversal Detected");
   }
Mümkünse Veritabanı ID Eşlemesi: Kullanıcıdan dosya adı almak yerine rastgele UUID'ler kullan ve dosya eşlemesini veritabanında tut.

# 5. Doğrulama
```Bash
./gap-closure-v2/day-05-filesystem-security/test-suite.sh
```