#!/usr/bin/env python3
"""Local preview server for the guide with no-cache headers.

python3 tools/serve.py [port]   (run from docs/guide/, default port 8080)

Static files are served straight from disk; every response carries
Cache-Control: no-store so browsers and proxies never show a stale build.
"""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/__boot':
            n = int(self.headers.get('Content-Length') or 0)
            body = self.rfile.read(n).decode('utf-8', 'replace') if n else ''
            sys.stderr.write('BOOT %s %s\n' % (self.client_address[0], body))
            sys.stderr.flush()
            self.send_response(204)
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def guess_type(self, path):
        if path.endswith('.mjs'):
            return 'text/javascript'
        return super().guess_type(path)


http.server.ThreadingHTTPServer(
    ('0.0.0.0', PORT),
    functools.partial(Handler, directory=ROOT),
).serve_forever()
