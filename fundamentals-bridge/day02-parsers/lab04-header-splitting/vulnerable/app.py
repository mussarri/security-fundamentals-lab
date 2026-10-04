import socket
import threading

def handle_client(client_socket):
    try:
        # İstek verilerini al, 4096 bayta kadar oku, latin1 ile decode et, çünkü HTTP başlıkları genellikle latin1 karakter setinde olur
        raw_request = client_socket.recv(4096).decode('latin1')
        # Eğer istek boşsa, istemciyi kapat ve çık
        if not raw_request:
            client_socket.close()
            return

        # İstek satırını ve parametreleri ayıkla
        # İstek satırı genellikle ilk satırdır ve HTTP metodunu, yolu ve protokolü içerir
        first_line = raw_request.split('\r\n')[0]
        # Örnek: GET /set-pref?lang=en HTTP/1.1 
        path = first_line.split(' ')[1] if len(first_line.split(' ')) > 1 else '/'
        
        lang = "en"
        # Eğer URL parametresi "lang" varsa, onu ayıkla
        if "lang=" in path:
            # Ham URL parametresi ayıklanır (decode edilmeden veya toleranslı)
            # Örnek: /set-pref?lang=en%0d%0aSet-Cookie:%20malicious=1
            lang = path.split("lang=")[1].split(" ")[0]
            # Basit unquote simülasyonu
            # %0d -> \r, %0a -> \n. Bu, saldırganın CRLF enjeksiyonu yapmasına izin verir. Ornegin: lang=en%0d%0aSet-Cookie:%20malicious=1 -> lang = "en\r\nSet-Cookie: malicious=1"
            lang = lang.replace("%0d", "\r").replace("%0a", "\n")

        # HATA: Yalnızca katı CRLF (\r\n) arayan zayıf filtre!
        # Tekil \n (Bare LF) veya \r (Bare CR) atlanır. Ornegin: lang=en%0aSet-Cookie:%20malicious=1 -> lang = "en\nSet-Cookie: malicious=1" -> bu, toleranslı istemcide/proxy'de yeni başlık açar!
        if "\r\n" in lang:
            response = (
                "HTTP/1.1 400 Bad Request\r\n"
                "Content-Type: text/plain\r\n"
                "Connection: close\r\n\r\n"
                "SECURITY_ALERT: CRLF detected!"
            )
            client_socket.sendall(response.encode('latin1'))
            client_socket.close()
            return

        # ZAFİYET: Girdi doğrudan yanıt başlığına eklenir,
        # Eğer lang içinde bare \n varsa toleranslı istemcide/proxy'de yeni başlık açar!
        # Örnek: lang=en\nSet-Cookie: malicious=1 -> yanıt başlığına eklenir ve Set-Cookie başlığı oluşturur!
        response = (
            "HTTP/1.1 200 OK\r\n"
            f"Set-Cookie: user_lang={lang}\r\n"
            "Content-Type: text/html\r\n"
            "Connection: close\r\n\r\n"
            "<h1>Preferences Saved</h1>"
        )
        client_socket.sendall(response.encode('latin1'))
    except Exception as e:
        pass
    finally:
        client_socket.close()

def run_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('127.0.0.1', 5060))
    server.listen(10)
    while True:
        client, _ = server.accept()
        t = threading.Thread(target=handle_client, args=(client,))
        t.daemon = True
        t.start()

if __name__ == '__main__':
    run_server()
