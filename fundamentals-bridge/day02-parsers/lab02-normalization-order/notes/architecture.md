# Normalization Order: Filter-Before-Decode vs. Decode-Before-Filter

Birçok web güvenlik mekanizmasında bypass'ların kök nedeni, girdinin yaşam döngüsündeki sıra hatasıdır:

Hatalı Sıra (Filter-Before-Decode):
[ Ham Girdi ] ──> [ WAF / Regex Filtresi ] ──> [ Decode / Normalizasyon ] ──> [ Tüketim (SQL/Exec/File) ]
* Filtre `%27` veya `%2527` arar ya da düz metin tırnak (`'`) arar.
* Ham girdide düz metin tırnak yoktur -> FİLTRE GEÇER.
* Backend `unquote()` veya `urllib.parse.unquote_plus()` çalıştırır -> `'` açığa çıkar.
* Açığa çıkan tehlikeli karakter kontrol edilmeksizin tüketilir.

Doğru Sıra (Decode-Before-Filter):
[ Ham Girdi ] ──> [ Tam Kanonikleştirme / Decode ] ──> [ Doğrulama / Allowlist ] ──> [ Tüketim ]
* Girdi önce tüm katmanlarından arındırılır.
* Doğrulama motoru saf semantik veriyi (`'`) görür ve anında reddeder.
