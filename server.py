#!/usr/bin/python
#
# Copyright 2021 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Runs a local HTTP server for serving local files for development.

Supports both Python 2 and Python 3 (selects automatically). Defaults to port
8000, can be overridden via first argument on the command line.
"""

from __future__ import print_function
import sys


def main(argv):
    port = 8000
    if len(argv) > 2:
        sys.stderr.write('Syntax: %s [port]\n' % argv[0])
        sys.exit(1)
    elif len(argv) == 2:
        port = int(argv[1])

    server_addr = ('127.0.0.1', port)
    print('Serving HTTP on %(host)s port %(port)d '
          '(http://%(host)s:%(port)d/) ...' % {
              'host': server_addr[0],
              'port': server_addr[1],
          })

    if sys.version_info.major >= 3:
        from http.server import HTTPServer, SimpleHTTPRequestHandler

        server = HTTPServer(server_addr, SimpleHTTPRequestHandler)
        server.serve_forever()
    else:
        from SimpleHTTPServer import SimpleHTTPRequestHandler
        from SocketServer import TCPServer

        server = TCPServer(server_addr, SimpleHTTPRequestHandler)
        server.serve_forever()


if __name__ == '__main__':
    main(sys.argv)
