from pathlib import Path
from typing import Optional

class SecurePathResolver:
    """
    Kanonikleştirme ve sınır doğrulaması (boundary check) uygulayan güvenli yol çözücü.
    """
    def __init__(self, base_directory: str):
        # Kök dizini mutlak ve kanonik hale getir
        self.base_dir = Path(base_directory).resolve(strict=True)

    def resolve(self, user_path: str) -> Optional[Path]:
        try:
            # 1. Girdiyi normalize edilmiş bir PurePath/Path nesnesi olarak ele al
            input_path = Path(user_path)

            # 2. Mutlak yol enjeksiyonunu baştan reddet
            # Mutlak yollar, kullanıcı tarafından sağlanan bir yolun kök dizin dışında bir konuma erişmesini engellemek için reddedilir. Bu, potansiyel olarak sistem dosyalarına veya hassas verilere erişimi önler. Orneğin, kullanıcı tarafından sağlanan yol '/etc/passwd' veya 'C:\Windows\system32' gibi mutlak yollar içeriyorsa, bu yollar reddedilir ve None döndürülür. Bu, kullanıcıların yalnızca belirli bir kök dizin altında dosya ve dizinlere erişmesini sağlar.
            if input_path.is_absolute():
                return None

            # 3. Yolu kök dizine bağla ve kanonikleştir (symbolic link ve .. bileşenleri çözülür)
            # Bu, sembolik bağlantıları ve '..' gibi dizin geçişlerini çözerek gerçek dosya sistemindeki yolu elde eder. resolve metodu, sembolik bağlantıları takip eder ve gerçek yolu döndürür. strict=False parametresi, yolun var olup olmadığını kontrol etmeden çözümleme yapar. Ornegin, base_dir = /home/user/data ve input_path = ../etc/passwd ise, (self.base_dir / input_path).resolve(strict=False) = /home/user/etc/passwd olur. Bu, sembolik bağlantıları ve '..' bileşenlerini çözerek gerçek dosya sistemindeki yolu elde eder. Bu yol var olsa da olmasa da, resolve metodu sembolik bağlantıları takip eder ve gerçek yolu döndürür. strict=False parametresi, yolun var olup olmadığını kontrol etmeden çözümleme yapar.
            resolved_target = (self.base_dir / input_path).resolve(strict=False)

            # 4. Sınır Denetimi (Canonical Boundary Check):
            # Hedef yolun kesinlikle base_dir altında olduğunu doğrula. is_relative_to metodu, resolved_target yolunun base_dir yolunun bir alt yolu olup olmadığını kontrol eder. Eğer değilse, None döndürülür ve bu, potansiyel bir dizin geçişi saldırısını önler. Ornegin , resolved_target = /home/user/data/../etc/passwd ve base_dir = /home/user/data ise, resolved_target.is_relative_to(base_dir) False döner ve None döndürülür.
            if not resolved_target.is_relative_to(self.base_dir):
                return None

            return resolved_target

        except (ValueError, RuntimeError):
            # Hatalı sözdizimi veya döngüsel sembolik bağ durumlarında güvenli ret
            return None
