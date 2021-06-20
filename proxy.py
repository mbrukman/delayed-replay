#!/usr/bin/python
#
# Copyright 2014 Google Inc.
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
#
##########################################################################
#
# Runs an HTTP proxy for fetching RSS feeds, with optional XML-to-JSON
# conversion (can alternatively be done in Javascript instead via xml2json.js).
#
# TODO: break up this file into separate components:
# * just the server / request classes
# * local data handling (reusable!)
# * RSS -> JSON conversion

from __future__ import print_function
import json
import os
import re
import sys

if sys.version_info.major >= 3:
    import http.server
    import urllib.parse
    import urllib.request

    _HTTP_SERVER_CLASS = http.server.HTTPServer
    _HTTP_REQUEST_HANDLER_CLASS = http.server.SimpleHTTPRequestHandler
else:
    import BaseHTTPServer
    import SimpleHTTPServer
    import urllib2
    import urlparse

    _HTTP_SERVER_CLASS = BaseHTTPServer.HTTPServer
    _HTTP_REQUEST_HANDLER_CLASS = SimpleHTTPServer.SimpleHTTPRequestHandler

# xmltodict is optional; operate in degraded mode if it's unavailable.
try:
    from third_party.xmltodict.latest import xmltodict
except:
    sys.stderr.write('Warning: xmltodict unavailable; '
                     '/?rss=[...] will not be handled\n')
    xmltodict = None


MIME_TYPES = {
    'css': 'text/css',
    'gif': 'image/gif',
    'html': 'text/html',
    'jpg': 'image/jpg',
    'js': 'application/x-javascript',
    'png': 'image/png',
}

FILE_EXTENSION_RE = re.compile(r'\.([^\.]+)$')


def IsAllowedFile(path):
    return GetMimeType(path) != None


def GetMimeType(path):
    match = FILE_EXTENSION_RE.search(path)
    if not match:
        return None
    ext = match.group(1)
    if ext in MIME_TYPES:
        return MIME_TYPES[ext]
    else:
        return None


def ReadBinaryFileToStream(path, stream):
    CHUNK_SIZE = 4096
    file = open(path, 'rb')
    while True:
        chunk = file.read(CHUNK_SIZE)
        stream.write(chunk)
        # We should be reading a full CHUNK_SIZE, unless we've reached the end of
        # the file, in which case we're done.
        if len(chunk) < CHUNK_SIZE:
            break
    file.close()


class ProxyServer(_HTTP_SERVER_CLASS):
    pass


URL_PARAM_TARGET = 'q'
URL_PARAM_RSS = 'rss'

HTTP_STATUS_OK = 200
HTTP_STATUS_FORBIDDEN = 403
HTTP_STATUS_NOTFOUND = 404
HTTP_STATUS_NOT_IMPLEMENTED = 501

HTTP_HEADER_CONTENT_TYPE = 'Content-Type'
HTTP_HEADER_USER_AGENT = 'User-Agent'
HTTP_USER_AGENT_NAME = 'Chrome/25'


def UrlParse(url):
    if sys.version_info.major >= 3:
        return urllib.parse.urlparse(url)
    else:
        return urlparse.urlparse(url)


def UrlParseQueryString(query_string):
    if sys.version_info.major >= 3:
        return urllib.parse.parse_qs(query_string)
    else:
        return urlparse.parse_qs(query_string)


def GetLocalPath(path):
    # Strip leading '/' to concatenate it with cwd properly.
    local_path = UrlParse(path).path[1:]
    return os.path.join(os.getcwd(), local_path)


def GetTargetUrl(path):
    local_url = UrlParse(path)
    query_parts = UrlParseQueryString(local_url.query)
    if URL_PARAM_TARGET in query_parts:
        return query_parts[URL_PARAM_TARGET][0]
    return None


def GetRssUrl(path):
    local_url = UrlParse(path)
    query_parts = UrlParseQueryString(local_url.query)
    if URL_PARAM_RSS in query_parts:
        return query_parts[URL_PARAM_RSS][0]
    return None


class ProxyRequestHandler(_HTTP_REQUEST_HANDLER_CLASS):

    def do_GET(self):
        REWRITES = {
            '/': '/index.html'
        }
        path = self.path
        if path in REWRITES:
            path = REWRITES[path]

        target_url = GetTargetUrl(path)
        if target_url is not None:
            self.__getTargetUrl(target_url)
            return

        rss_url = GetRssUrl(path)
        if rss_url is not None:
            self.__getRssUrl(rss_url)
            return

        local_path = GetLocalPath(path)
        if not os.path.exists(local_path):
            self.send_response(HTTP_STATUS_NOTFOUND)
            self.end_headers()
        elif not os.path.isfile(local_path):
            self.send_response(HTTP_STATUS_FORBIDDEN)
            self.end_headers()
        else:
            self.send_response(HTTP_STATUS_OK)
            self.send_header(HTTP_HEADER_CONTENT_TYPE, GetMimeType(local_path))
            self.end_headers()
            ReadBinaryFileToStream(local_path, self.wfile)

    def __getTargetUrl(self, target_url):
        url_response = self.__openUrl(target_url)
        self.send_response(url_response.getcode())

        headers = url_response.info()
        self.send_header(HTTP_HEADER_CONTENT_TYPE, headers[
                         HTTP_HEADER_CONTENT_TYPE])
        self.end_headers()

        self.copyfile(url_response, self.wfile)

    def __getRssUrl(self, rss_url):
        if xmltodict is None:
            self.send_response(HTT_STATUS_NOT_IMPLEMENTED)
            self.wfile.write('XML to JSON conversion not possible: '
                             'xmltodict unavailable.')
            return

        url_response = self.__openUrl(rss_url)
        self.send_response(url_response.getcode())

        headers = url_response.info()
        self.send_header(HTTP_HEADER_CONTENT_TYPE, 'text/javascript')
        self.end_headers()

        # Convert XML to JSON via a two-step process:
        # 1. xmltodict (XML -> dict)
        # 2. json (dict -> JSON)
        xml_dict = xmltodict.parse(url_response.read())
        self.wfile.write(json.dumps(xml_dict))

    def __openUrl(self, url):
        headers = {
            HTTP_HEADER_USER_AGENT: HTTP_USER_AGENT_NAME,
        }
        if sys.version_info.major >= 3:
             request = urllib.request.Request(url, None, headers)
             return urllib.request.urlopen(request)
        else:
             request = urllib2.Request(url, None, headers)
             return urllib2.urlopen(request)


def main(argv):
    # TODO: use optparse, add a --port flag with a default, use a built-in
    # validator.
    if len(argv) < 2:
        sys.stderr.write('Syntax: %s [port]\n' % argv[0])
        sys.exit(1)

    try:
        port = int(argv[1])
    except:
        sys.stderr.write('Integral port required, received: %s' % port)
        sys.exit(2)

    print('Visit http://localhost:%d/ to search.' % port)

    # TODO: make the stdout silent (remove the GET log, etc.)
    try:
        # Only accept connections from localhost for security as this is a
        # proxy.
        server_address = ('localhost', port)
        httpd = ProxyServer(server_address, ProxyRequestHandler)
        httpd.serve_forever()
    except KeyboardInterrupt as e:
        # Handle Ctrl-C as a graceful exit, separately from other failures.
        pass


if __name__ == '__main__':
    main(sys.argv)
