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
################################################################################
#
# Tests for functionality in the proxy.py file.

import proxy
import unittest


class GetTargetUrlTest(unittest.TestCase):
  def testSimple(self):
    cases = [
      ('foo/bar', '/?q=foo/bar'),
      ('/home/~user', '/?q=/home/%7Euser')
    ]
    for expected, path in cases:
      actual = proxy.GetTargetUrl(path)
      if expected != actual:
        print 'Failed conversion for %s' % path
        print 'expected: %s' % expected
        print '  actual: %s' % actual
        self.assertEquals(expected, actual)


if __name__ == '__main__':
  unittest.main()
