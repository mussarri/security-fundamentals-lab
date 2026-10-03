# URL Parser Duality: RFC 3986 vs. WHATWG Living Standard

İki ana URL standardı arasındaki temel ayrışmalar:

1. Ters Eğik Çizgi (Backslash `\`):
   - RFC 3986: `\` bir authority ayırıcısı değildir; geçersiz veya path/query karakteri olarak değerlendirilebilir.
   - WHATWG: `\` karakterini `/` (eğik çizgi) ile eşdeğer kabul eder ve authority/host sınırını sonlandırır.
   - Payload: `https://trusted.corp\@attacker.com` veya `https://trusted.corp\target.internal`
     * Python `urllib.parse` (RFC 3986 odaklı): Host = `trusted.corp` sanabilir.
     * Tarayıcı / Modern HTTP istemcisi (WHATWG): `\` karakterini `/` yaparak host = `attacker.com` veya path görebilir.

2. Kullanıcı Bilgisi ve Özel Karakter Ayrıştırması (`@`, `#`, `?`):
   - Payload: `https://expected.com#@attacker.com` veya `https://expected.com?@attacker.com`
   - Bazı parser'lar `#` (fragment) karakterini RFC'ye göre host ayrışımından sonra değerlendirirken, bazıları `@` görünce sol tarafı tamamen userinfo sayıp sağ tarafı host kabul eder.

3. Güvenlik Riski:
   - SSRF Filtresi Python `urllib.parse` ile host kontrolü yapar -> `trusted.corp` görür ve ONAYLAR.
   - Arka plandaki modern HTTP istemcisi veya headless browser URL'yi WHATWG ile çözüp `attacker.com` veya `169.254.169.254` adresine gider.
