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
################################################################################
#
# Convenient targets to enable running tests, proxy, etc. easily.

VERB = @

SERVER_PORT = 8000
PROXY_PORT = 8080

default:
	$(VERB) echo "Valid targets: run-proxy, test."

run-proxy:
	$(VERB) ./proxy.py $(PROXY_PORT)

run-server:
	$(VERB) python -m SimpleHTTPServer $(SERVER_PORT)

clean:
	$(VERB) rm -f `find . -name \*.pyc`

test:
	$(VERB) make -C tests test
