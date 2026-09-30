import os
from typing import Optional

class NaivePathResolver:
    """
    Yalnızca yüzeysel dize denetimleri yapan zafiyetli yol çözücü.
    """
    def __init__(self, base_directory: str):
        self.base_dir = os.path.abspath(base_directory)

    def resolve(self, user_path: str) -> Optional[str]:
        # HATA: Yalnızca belirli bir dizgi arayan kara liste yaklaşımı.
        # Farklı ayrac türlerini ('\'), tam yolları veya normalizasyon kurallarını kaçırır.
        if "../" in user_path:
            return None

        # os.path.join, user_path mutlak bir yol içeriyorsa (örn. '/etc/passwd' veya 'C:\...')
        # önceki tüm yolları atarak mutlak yola geçer.
        combined = os.path.join(self.base_dir, user_path)
        return combined
