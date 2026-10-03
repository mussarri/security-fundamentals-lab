# JSON Duplicate Keys & Differential Parsing

RFC 8259 Section 4:
"The names within an object SHOULD be unique, but the software that extracts tokens from JSON texts does not necessarily reject texts that have duplicate names."

Tasarım Çıkmazı:
1. İstemci Gönderir: `{"role": "user", "role": "admin"}`
2. API Gateway / WAF (Validator):
   - Özel bir C/Go parser'ı veya regex/streaming parser kullanır.
   - İlk eşleşen `"role"` değerini alır -> `user`.
   - Kural denetimi: "Normal kullanıcılar admin atayamaz" -> GEÇTİ (Allowed).
3. Backend Service (Consumer):
   - Standart Python `json.loads` çalıştırır.
   - Python sözlükleri yinelenen anahtarlarda son değeri tutar (*last-key-wins*).
   - Çıkarılan rol -> `admin`.
4. Sonuç: Doğrulama atlatılır ve kullanıcı yönetici yetkisiyle oluşturulur.
