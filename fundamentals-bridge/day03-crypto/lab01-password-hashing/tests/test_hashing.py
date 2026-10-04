import time
import pytest
from vulnerable.hasher import NaivePasswordManager
from fixed.hasher import SecurePasswordManager

def test_vulnerable_sha256_is_dangerously_fast():
    password = "SuperSecretPassword123!"
    iterations = 1000

    start_time = time.perf_counter()
    for _ in range(iterations):
        NaivePasswordManager.hash_password(password)
    total_time = time.perf_counter() - start_time

    avg_time_per_hash_ms = (total_time / iterations) * 1000
    print(f"\n[!] SHA-256 Ortalama Hesaplama Süresi: {avg_time_per_hash_ms:.4f} ms")

    # SHA-256 CPU üzerinde bile mikrosaniyeler mertebesindedir (genelde < 0.05 ms)
    # Bu hız, saniyede milyarlarca tahmin deneyebilen GPU kümeleri için sıfır maliyet demektir.
    assert avg_time_per_hash_ms < 0.5, "SHA-256 beklenenden çok daha yavaş çalıştı."

def test_secure_argon2id_enforces_computational_cost():
    password = "SuperSecretPassword123!"
    manager = SecurePasswordManager()

    start_time = time.perf_counter()
    hashed = manager.hash_password(password)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    print(f"\n[+] Argon2id (64MB RAM, 2 iter) Hesaplama Süresi: {elapsed_ms:.2f} ms")

    # Argon2id tasarımı gereği 20 ms ile 300 ms arasında bir gecikme ve 64MB bellek tüketir
    assert elapsed_ms > 10.0, "Argon2id güvenlik parametreleri yetersiz; işlem fazla hızlı gerçekleşti."
    assert manager.verify_password(password, hashed) is True
    assert manager.verify_password("WrongPassword!", hashed) is False

def test_hash_format_and_algorithm_metadata():
    manager = SecurePasswordManager()
    hashed = manager.hash_password("test_pass")

    # Argon2id çıktısı algoritma parametrelerini ($argon2id$v=19$m=65536,t=2,p=2$...) içinde barındırır
    assert hashed.startswith("$argon2id$")
    assert "m=65536" in hashed
