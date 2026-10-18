# JWT Key Confusion: Asymmetric (RS256) vs. Symmetric (HS256)

## Kriptografik Tasarım Farkı
1. RS256 (Asymmetric):
   - Özel Anahtar (Private Key): Yalnızca Yetkilendirme Sunucusu (Auth Server) bilir; token imzalar.
   - Genel Anahtar (Public Key): Herkese açıktır (`jwks.json`, `.pem`); backend servisleri token'ı doğrulamak için kullanır.

2. HS256 (Symmetric):
   - Paylaşımlı Gizli Anahtar (Shared Secret): İmzalayan ve doğrulayan taraflar aynı sırrı kullanır.

## Zafiyetin Kök Nedeni (Key Confusion)
Doğrulayıcı backend servisi şu şekilde kodlanmışsa:
`jwt.decode(token, key=PUBLIC_KEY)`
ve algoritma parametresini dinamik olarak token başlığından (`header.alg`) okuyorsa:

1. Saldırgan token başlığını `"alg": "HS256"` olarak değiştirir.
2. Saldırgan, sistemin herkese açık Genel Anahtarını (Public Key PEM metnini) bir "Simetrik Parola" (Shared Secret) gibi kullanır.
3. Saldırgan `HMAC-SHA256(key=PUBLIC_KEY_PEM, data=header.payload)` ile geçerli bir imza üretir.
4. Backend token'ı doğrulamaya çalışırken:
   - `alg` değerini HS256 görür.
   - Doğrulama fonksiyonuna parametre olarak verilen `PUBLIC_KEY`'i simetrik sır zanneder.
   - Saldırganın Genel Anahtarla imzaladığı token'ı GEÇERLİ kabul eder!
