# Predictable PRNG vs. CSPRNG (Token Generation)

## Temel Tasarım Ayrımı

1. Pseudo-Random Number Generators (PRNG / LCG / Mersenne Twister):
   - Standart kütüphaneler (`random` modülü, `Math.random()`, `rand()`):
   - Amaç: Hızlı simülasyon, oyun mekanikleri, Monte Carlo modellemeleri.
   - Özellik: Belirli bir iç durum (internal state) üzerinden deterministik çalışır.
   - Zafiyet: Yeterli sayıda ardışık çıktı gözlemlendiğinde algoritmanın iç durumu tamamen tersine mühendislikle çözülebilir (Python'ın MT19937 motorunda 624 adet 32-bit çıktı tüm durumu açığa çıkarır). Tohum (seed) zaman tabanlı (`time.time()`) seçilirse brute-force aralığı saniyelere iner.

2. Cryptographically Secure PRNG (CSPRNG):
   - Standartlar: `secrets` modülü, `os.urandom()`, Linux `/dev/urandom`, Windows `BCryptGenRandom`.
   - Amaç: Kriptografik anahtarlar, oturum kimlikleri, sıfırlama token'ları.
   - Özellik:
     * İleri Yönlü Gizlilik (Forward Secrecy): Mevcut durumu ele geçiren bir saldırgan önceki çıktıları hesaplayamaz.
     * Geri Yönlü Gizlilik (Backward Secrecy): Mevcut çıktıları bilen bir saldırgan sonraki çıktıları öngöremez.
     * Yüksek Entropi: Donanım kesmeleri, zamanlama anomalileri ve işletim sistemi entropi havuzuna dayanır.
