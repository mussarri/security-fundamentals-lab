# Unicode Compatibility Normalization (NFKC) & Account Collision

Doğrulama ve Saklama Ayrışması:
1. Girdi: `admⅰn` (U+2170: Small Roman Numeral One).
2. Doğrulama Katmanı:
   - `isalnum()` fonksiyonu Unicode Number/Letter kategorilerini geçerli sayar.
   - DB sorgusu (`WHERE username = 'admⅰn'`) çalıştırılır, sistemde sadece `admin` (ASCII 'i', U+0069) olduğu için çakışma bulunamaz.
3. Kanonikleştirme / Tüketim Katmanı:
   - Uygulama `unicodedata.normalize('NFKC', username)` çağırır.
   - NFKC uyumluluk dönüşümü `U+2170` karakterini doğrudan ASCII `U+0069` ('i') yapar.
4. Sonuç: Doğrulamayı geçen `admⅰn`, saklama anında `admin` haline gelir ve hesap çakışması (Account Collision / Takeover) gerçekleşir.
