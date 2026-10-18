from flask import Flask, request, jsonify
import sqlite3
import time

app = Flask(__name__)
DB_FILE = "vulnerable.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS accounts")
    cur.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER)")
    cur.execute("INSERT INTO accounts (id, balance) VALUES (1, 100)")
    conn.commit()
    conn.close()

@app.route('/api/balance', methods=['GET'])
def get_balance():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT balance FROM accounts WHERE id = 1")
    row = cur.fetchone()
    conn.close()
    return jsonify({"balance": row[0] if row else 0}), 200

@app.route('/api/withdraw', methods=['POST'])
def withdraw():
    data = request.get_json(force=True)
    amount = int(data.get('amount', 0))

    conn = sqlite3.connect(DB_FILE, timeout=10.0)
    cur = conn.cursor()

    # ADIM 1: Oku (Check)
    cur.execute("SELECT balance FROM accounts WHERE id = 1")
    current_balance = cur.fetchone()[0]

    # Zafiyet Penceresi (Race Window): Eşzamanlı isteklerin araya girmesini garantileyen gecikme
    # Bu gecikme, birden fazla istemcinin aynı anda bakiye kontrolü yapmasına ve ardından aynı bakiyeyi kullanarak para çekmesine olanak tanır.
    time.sleep(0.05)

    # ADIM 2: Bellek İçi Karar
    # HATA: Bu kontrol, eşzamanlı işlemler sırasında geçersiz hale gelebilir. Örneğin, iki işlem aynı anda bakiyeyi kontrol ederse ve her ikisi de yeterli bakiye olduğunu görürse, her ikisi de para çekebilir ve bu da negatif bakiyeye yol açabilir.
    if current_balance < amount:
        conn.close()
        return jsonify({"status": "error", "message": "Yetersiz bakiye"}), 400

    # ADIM 3: Yaz (Act) - HATA: Hesaplanan mutlak değer geri yazılıyor
    # Bu adımda, önceki adımda okunan bakiyeye dayanarak yeni bakiye hesaplanır ve veritabanına yazılır. Ancak, bu işlem sırasında başka bir işlem aynı bakiyeyi okumuş ve para çekmiş olabilir, bu da "kayıp güncelleme" sorununa yol açar.
    new_balance = current_balance - amount
    cur.execute("UPDATE accounts SET balance = ? WHERE id = 1", (new_balance,))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "withdrawn": amount, "remaining": new_balance}), 200

if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5100, threaded=True)
