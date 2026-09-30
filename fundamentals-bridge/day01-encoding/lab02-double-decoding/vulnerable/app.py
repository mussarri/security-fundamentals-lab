from flask import Flask, request, jsonify
import urllib.parse

app = Flask(__name__)

# Backend framework seviyesinde manuel veya middleware kaynaklı ikinci decode
@app.before_request
def aggressive_decode():
    # Framework ham PATH_INFO'yu zaten bir kez decode etmiştir.
    # Güvensiz middleware tekrar unquote uygularsa:
    request.environ['NORMALIZED_PATH'] = urllib.parse.unquote(request.path)

@app.route('/public/<path:subpath>')
def public_view(subpath):
    # Simüle edilen güvensiz rota ayrıştırma
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
