from flask import Flask, request, jsonify
import urllib.parse
import sqlite3

app = Flask(__name__)
DB_FILE = "vulnerable.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS products")
    cur.execute("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT)")
    cur.execute("INSERT INTO products (name, category) VALUES ('Laptop', 'electronics')")
    cur.execute("INSERT INTO products (name, category) VALUES ('Flag_Day2_Bypass', 'confidential')")
    conn.commit()
    conn.close()

def naive_waf_filter(raw_input: str) -> bool:
    """
    HATA: Ham girdi üzerinde düz metin arayan WAF.
    URL-encoded karakterleri (%27 vb.) decode etmeden denetler.
    """
    dangerous_tokens = ["'", "--", "/*", "union", "select"]
    lowered = raw_input.lower()
    for token in dangerous_tokens:
        if token in lowered:
            return False
    return True

@app.route('/api/search', methods=['GET'])
def search_products():
    category_param = request.args.get('category', '')

    # 1. Filtreleme HAM veri üzerinde yapılıyor (YANLIŞ SIRA)
    if not naive_waf_filter(category_param):
        return jsonify({"status": "error", "message": "WAF_BLOCKED_SUSPICIOUS_INPUT"}), 403

    # 2. Decode işlemi filtrelemeden SONRA yapılıyor
    decoded_category = urllib.parse.unquote(category_param)

    # 3. Tüketim: Decode edilmiş veri dinamik sorguya gidiyor
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    query = f"SELECT name FROM products WHERE category = '{decoded_category}'"
    try:
        cur.execute(query)
        results = [row[0] for row in cur.fetchall()]
    except Exception as e:
        conn.close()
        return jsonify({"status": "error", "message": f"DB_SYNTAX_ERROR: {str(e)}"}), 500

    conn.close()
    return jsonify({"status": "success", "results": results}), 200

if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5040)
