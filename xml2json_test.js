// Copyright 2014 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////////
//
// Tests for xml2json.js functionality (XML -> JSON converter).

function XmlToJsonCtrl($scope) {
  $scope.results = [];
  $scope.success = true;

  var XML_TO_JSON = [
    ["<a>text</a>",
     {"a": "text"}],

    ["<a>text</a> <!-- external comment -->",
     {"a": "text"}],

    ["<a>text<!-- internal comment --></a>",
     {"a": "text"}],

    ["<a><![CDATA[<xml> && <xhtml>]]></a>",
     {"a": "<xml> && <xhtml>"}],

    ["<a><b>bbb</b></a>",
     {"a": {"b": "bbb"}}],

    ["<a><b>bbb</b><c>ccc</c></a>",
     {"a": {"b": "bbb", "c": "ccc"}}],

    ["<a><b>bb1</b><b>bb2</b></a>",
     {"a": {"b": ["bb1", "bb2"]}}],

    ["<a>aaa1<b>bbb</b><c>ccc</c></a>",
     {"a": {"#text": "aaa1", "b": "bbb", "c": "ccc"}}],

    ["<a attr=\"value\">text</a>",
     {"a": {"@attr": "value", "#text": "text"}}],

    ["<a b=\"\"></a>",
     {"a": {"@b": ""}}],

    ["<a b=\"\"/>",
     {"a": {"@b": ""}}],

    ["<a>b<c/>d<e/></a>",
     {"a":{"c":{}, "#text":["b", "d"], "e":{}}}],
  ];

  for (var i = 0; i < XML_TO_JSON.length; ++i) {
    var result = {};
    result.xml = XML_TO_JSON[i][0];
    var json = XML_TO_JSON[i][1];
    result.expected = JSON.stringify(json);
    result.actual = JSON.stringify(xmlToJson(result.xml));

    result.success = (result.expected == result.actual);
    $scope.success &= result.success;
    $scope.results.push(result);
  }
}
