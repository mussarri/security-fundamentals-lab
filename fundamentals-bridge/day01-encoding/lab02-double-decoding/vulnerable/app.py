from flask import Flask, request, jsonify
import urllib.parse

app = Flask(__name__)

# Backend framework seviyesinde manuel veya middleware kaynaklı ikinci decode
@app.before_request
def aggressive_decode():
    # Framework ham PATH_INFO'yu zaten bir kez decode etmiştir.
    # Güvensiz middleware tekrar unquote uygularsa , bu çift decode zafiyetine yol açabilir. Cift decode, saldırganların URL'yi manipüle ederek güvenlik kontrollerini atlatmasına olanak tanır. Örneğin, /admin yerine /%61dmin gibi bir yol kullanabilirler. %61 ASCII'de 'a' karakterini temsil eder, bu nedenle çift decode işlemi sonucunda /%61dmin -> /admin olur ve saldırgan admin paneline erişebilir.
    request.environ['NORMALIZED_PATH'] = urllib.parse.unquote(request.path)

@app.route('/public/<path:subpath>')
def public_view(subpath):
    # Simüle edilen güvensiz rota ayrıştırma
    # Bu rota, framework tarafından sağlanan normalize edilmiş PATH_INFO'yu kullanmak yerine, ham PATH_INFO'yu kullanır. Bu, çift decode zafiyetini tetikleyebilir. Örneğin, /public/%61dmin gibi bir yol kullanıldığında, framework tarafından bir kez decode edildikten sonra /public/admin olur. Ancak, bu rota ham PATH_INFO'yu kullandığı için, ikinci decode işlemi sonucunda /public/admin yerine /public/%61dmin olarak kalır ve saldırgan admin paneline erişebilir.
    normalized = request.environ.get('NORMALIZED_PATH', request.path)
    if 'admin' in normalized:
        return jsonify({"status": "error", "message": "Access Denied via Route Logic"}), 403
    return jsonify({"status": "success", "scope": "public", "path": subpath})

@app.route('/admin')
@app.route('/admin/<path:subpath>')
def admin_view(subpath=""):
    return jsonify({
        "status": "success",
        "scope": "admin",
        "message": "CRITICAL_ADMIN_ACCESS_GRANTED",
        "subpath": subpath
    }), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
