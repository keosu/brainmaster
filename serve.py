"""本地预览服务器（多线程 + 禁用缓存，避免并发请求排队造成的白屏）。

用法：
    python serve.py            # 默认 http://127.0.0.1:8123
    python serve.py 9000       # 指定端口
"""
import functools
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ROOT = __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0]


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        # 开发期禁用缓存，改动刷新即生效
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):  # 静音，减少噪音
        pass


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"Brain Master running at http://127.0.0.1:{PORT}/index.html")
        httpd.serve_forever()
