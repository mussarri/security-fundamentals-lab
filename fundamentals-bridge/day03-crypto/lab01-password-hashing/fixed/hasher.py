import argon2
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

class SecurePasswordManager:
    """
    SAVUNMA: RFC 9106 standartlarına uygun Argon2id kullanımı.
    Argon2id hem GPU/ASIC saldırılarına (Argon2d gibi bellek-zorlu)
    hem de yan kanal (side-channel/cache timing) saldırılarına (Argon2i gibi) karşı dayanıklıdır.
    """
    def __init__(self):
        # OWASP / RFC 9106 Önerilen Minimum Değerler:
        # time_cost: 2-3 iterasyon
        # memory_cost: 65536 KiB (64 MiB)
        # parallelism: 1-4 thread
        # salt_len: 16 bayt (argon2-cffi kütüphanesi otomatik CSPRNG ile yönetir)
        self.ph = PasswordHasher(
            time_cost=2,
            memory_cost=65536,  # 64 MB RAM
            parallelism=2,
            hash_len=32,
            salt_len=16,
            type=argon2.Type.ID
        )

    def hash_password(self, password: str) -> str:
        if not password or not isinstance(password, str):
            raise ValueError("Geçersiz parola girdisi.")
        return self.ph.hash(password)

    def verify_password(self, password: str, stored_hash: str) -> bool:
        try:
            return self.ph.verify(stored_hash, password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False

    def needs_rehash(self, stored_hash: str) -> bool:
        """Donanım geliştikçe parametreler artırıldığında eski hash'leri güncellemek için."""
        return self.ph.check_needs_rehash(stored_hash)
