from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)
DB_FILE = "fixed.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS accounts")
    cur.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER CHECK(balance >= 0))")
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

    if amount <= 0:
        return jsonify({"status": "error", "message": "Geçersiz miktar"}), 400

    conn = sqlite3.connect(DB_FILE, timeout=10.0)
    cur = conn.cursor()

    # SAVUNMA: Atomik Tekil Güncelleme (Atomic Decrement with Invariant Guard)
    # Okuma ve yazma tek bir atomik SQL operasyonuna indirgenir.
    # 'balance >= ?' koşulu veritabanı motoru seviyesinde işletilir.
    cur.execute("""
        UPDATE accounts 
        SET balance = balance - ? 
        WHERE id = 1 AND balance >= ?
    """, (amount, amount))
    
    affected_rows = cur.rowcount
    conn.commit()

    if affected_rows == 0:
        conn.close()
        return jsonify({"status": "error", "message": "Yetersiz bakiye veya eşzamanlı çakışma"}), 400

    cur.execute("SELECT balance FROM accounts WHERE id = 1")
    remaining_balance = cur.fetchone()[0]
    conn.close()

    return jsonify({"status": "success", "withdrawn": amount, "remaining": remaining_balance}), 200

if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5101, threaded=True)
