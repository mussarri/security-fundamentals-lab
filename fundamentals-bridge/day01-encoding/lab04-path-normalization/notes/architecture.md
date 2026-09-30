# Path Normalization & Boundary Verification

Dosya yollarını dize tabanlı (string-based) kontrollerle doğrulamak şu nedenlerle yetersizdir:

1. Ayraç Tutarsızlıkları (POSIX vs. Windows):
   - POSIX sistemleri yalnızca `/` ayracını tanır; `\` sıradan bir karakterdir.
   - Windows ise hem `/` hem de `\` karakterlerini dizin ayracı kabul eder.
   - Yalnızca `../` dizesini arayan bir kontrol, Windows üzerinde `..\` varyantlarını yakalayamaz.

2. Dosya Sistemi Davranışları (NTFS / Fat):
   - NTFS dosya adlarının sonundaki gereksiz noktaları (`.`) ve boşlukları budar (trailing dot/space truncation).
   - `file.txt.` kontrol aşamasında farklı bir uzantı gibi algılanabilirken dosya sisteminde `file.txt` olarak açılabilir.
   - Alternate Data Streams (ADS) sözdizimleri (`file.txt::$DATA`) bazı filtreleri şaşırtabilir.

3. Kanonikleştirme ve Sınır Kontrolü (Deterministic Boundary Checking):
   - Dize filtreleri yerine nesne tabanlı kanonikleştirme (`Path.resolve()`) kullanılmalıdır.
   - Çözümlenen mutlak yolun kök dizin sınırları içinde kalıp kalmadığı `Path.is_relative_to()` ile doğrulanmalıdır.
