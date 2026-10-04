# Password Hashing: Fast Hash (SHA-256) vs. Memory-Hard KDF (Argon2id)

## Temel Tasarım Çelişkisi
1. Hızlı Hash Fonksiyonları (SHA-256, BLAKE3, MD5):
   - Amaç: Veri bütünlüğü (integrity) ve dijital imza desteği.
   - Tasarım Hedefi: Mümkün olan en az CPU döngüsünde ve sıfır bellek ayak iziyle çalışmak.
   - Tehdit: Modern bir tüketici GPU'su (RTX 4090 serisi) saniyede ~20-30 Milyar SHA-256 özeti hesaplayabilir. Salt eklenmiş olsa dahi parola uzayı dakikalar içinde taranır.

2. Bellek-Zorlu KDF'ler (Argon2id - RFC 9106):
   - Amaç: İnsan tarafından seçilmiş düşük entropili parolaları ASIC ve GPU kaba kuvvet (brute-force) saldırılarına karşı korumak.
   - Tasarım Parametreleri:
     * Time Cost (Iterations / t): CPU döngüsü sayısı.
     * Memory Cost (m): Tüketilecek RAM miktarı (KiB cinsinden). ASIC/GPU çiplerinin paralel çekirdeklerini RAM darboğazına sokar.
     * Parallelism (p): Eşzamanlı iş parçacığı sayısı.
     * Salt: Her şifre için benzersiz, CSPRNG ile üretilmiş en az 16 baytlık veri.
