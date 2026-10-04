import hashlib
import os

class NaivePasswordManager:
    """
    ZAFİYET: Hızlı hash (SHA-256) kullanımı.
    Salt eklense bile ASIC/GPU kaba kuvvet saldırılarına karşı koruma sağlamaz.
    İşlem süresi mikrosaniyeler seviyesindedir.
    """
    @staticmethod
    def hash_password(password: str) -> str:
        # 16-byte rastgele salt üretilse dahi algoritmanın donanımsal maliyeti sıfırdır
        salt = os.urandom(16).hex()
        # SHA-256 hesaplama: Tek adım, bellek maliyeti yok (~1 mikrosaniye), ASIC/GPU saldırılarına karşı savunmasızdir.  
        digest = hashlib.sha256((salt + password).encode('utf-8')).hexdigest() #ornegin : parola = "password123" , alt = "9f86d081884c7d659a2feaa0c55ad015" -> hashlib.sha256(("9f86d081884c7d659a2feaa0c55ad015" + "password123").encode('utf-8')).hexdigest() -> digest = "e99a18c428cb38d5f260853678922e03abd8334f0e3b9a2e6f1b8c6e7f1a5f1a5f"
        return f"sha256${salt}${digest}"

    @staticmethod
    def verify_password(password: str, stored_record: str) -> bool:
        try:
            algo, salt, expected_digest = stored_record.split('$') # burada algoritma ve salt ayrıştırılır. ornegin : sha256$<salt>$<digest>
            if algo != "sha256":
                return False
            actual_digest = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
            # Zamanlama analizi koruması olsa bile algoritma temelden hatalıdır
            return actual_digest == expected_digest
        except Exception:
            return False
