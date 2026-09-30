# Mühendislik Analizi — Lab 04: Path Normalization & Boundary Verification

## 1. Neden Çalıştı / Neden Engellendi?
* **Zafiyetli Uygulamada:** Geliştirici yalnızca `"../" in user_path` denetimi yaptı. Bu durum; ters eğik çizgi (`..\`), mutlak yol girdileri (`/etc/...`) veya platformlar arası dosya sistemi farklılıkları karşısında yetersiz kaldı. Ayrıca `os.path.join()`, ikinci argüman mutlak bir yol olduğunda temel dizini sıfırlar ve doğrudan verilen mutlak yola bağlanır.
* **Sıkılaştırılmış Uygulamada:** Girdi dize bazlı filtrelere tabi tutulmak yerine `pathlib.Path` nesnesi olarak ele alındı. `resolve()` metodu ile tüm sembolik bağlar ve göreli gösterimler (`..`, `.`) işletim sistemi standartlarına uygun biçimde kanonikleştirildi. Son adımda `is_relative_to(base_dir)` ile hedefin temel dizin hiyerarşisi içinde kaldığı matematiksel olarak doğrulandı.

## 2. Root Cause
* **Interpretation Differentials:** Dize seviyesindeki filtre ile işletim sisteminin yol çözümleme motorunun (path resolver) girdiyi farklı yorumlaması.
* **Flawed Boundary Assumption:** `os.path.join()` fonksiyonunun dizin sınırını koruduğu varsayımı (aslında RFC ve POSIX standartlarında mutlak yol gelirse kökü ezer).

## 3. Platform Davranışları
* **POSIX:** Tek ayraç `/`. `\` geçerli bir dosya adı karakteri olabilir.
* **Windows (NTFS):** Hem `/` hem de `\` geçerli ayrac kabul edilir. Dosya adının sonundaki nokta (`.`) ve boşluklar dosya sistemi tarafından otomatik olarak atılır.
* **Python Pathlib:** Python 3.9+ ile gelen `is_relative_to()` metodu, dizin sınır ihlallerini tespit etmek için güvenilir ve standart bir yöntem sunar.

## 4. Kalıcı Savunma (Remediation)
1. **Dize Kara Listelerinden Kaçının:** `../` veya `..\\` temizliği yerine her zaman mutlak kanonikleştirme uygulayın.
2. **Kanonik Sınır Kontrolü (Canonical Boundary Check):**
   ```python
   resolved = (base_dir / user_input).resolve()
   if not resolved.is_relative_to(base_dir):
       raise PermissionError("Erişim sınır dışı.")
Chroot / Container Isolation: Uygulama süreçlerini dosya sistemi seviyesinde en az yetki (least privilege) ve yalıtımlı dizinlerde çalıştırın.

# 5. Doğrulama
tests/test-suite.sh betiği ile hem zafiyetli kodun sınır ihlali yaptığı hem de güvenli resolver'ın tüm varyantları başarıyla filtrelediği doğrulanmıştır.

# 6. Varyant Analizi
ZIP / Arşiv Açma (Zip Slip): Arşiv içindeki dosyaların kanonikleştirilmeden ayıklanması sonucu dosya sistemine keyfi yazma.

Statik Dosya Sunucuları (Sendfile / Static Middleware): Reverse proxy ile uygulama sunucusu arasındaki URL normalizasyonu farkından kaynaklanan statik varlık dizini kaçışları.
