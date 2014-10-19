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
// XML to JSON converter.

var DEBUG = true;

function debugLog(str) {
  if (DEBUG) {
    console.log(str);
  }
}

var JS_TYPE_UNDEFINED = 'undefined';

/**
 * @param {string} xml Input XML to parse to JSON.
 * @return {Object} the JSON object representing the input XML.
 */
function xmlToJson(xmlStr) {
  var DOM_NODE = 1;
  var DOM_ATTR = 2;
  var DOM_TEXT = 3;
  var DOM_CDATA = 4;
  var DOM_COMMENT = 8;
  var DOM_DOCUMENT = 9;

  var XML_TEXT = '#text';
  var XML_COMMENT = '#comment';
  var XML_CDATA = '#cdata-section';

  var xmlDom = null;
  if (window.DOMParser) {
    xmlDom = (new DOMParser()).parseFromString(xmlStr, 'text/xml');
  } else {  // IE is funny like that.
    xmlDom = new ActiveXObject('Microsoft.XMLDOM');
    xmlDom.async = false;
    xmlDom.loadXML(xmlStr);
  }

  /**
   * @param {Node} xmlNode
   * @return {JSON}
   */
  var xmlToJsonInternal = function(xmlNode) {
    switch (xmlNode.nodeType) {
      case DOM_NODE: {  // node
        var json = {};
        //debugLog('node <' + xmlNode.nodeName + '>');

        var attrs = xmlNode.attributes;
        for (var a = 0; a < attrs.length; ++a) {
          var attrName = attrs[a].nodeName;
          var attrValue = attrs[a].nodeValue;
          json['@' + attrName] = attrValue;
        }

        var numChildren = 0;
        if (typeof xmlNode.firstChild != JS_TYPE_UNDEFINED) {
          var child = xmlNode.firstChild;
          while (child) {
            if (child.nodeName == XML_COMMENT) {
              child = child.nextSubling;
              continue;
            }
            var jsonNode = xmlToJsonInternal(child);
            if (jsonNode == null) {  // e.g., comment.
              child = child.nextSibling;
              continue;
            }
            var childName = child.nodeName;

            ++numChildren;

            // If a node of this name already exists:
            // * if it's not an array, wrap in an array and then append to it
            // * if it's already an array, just append to it
            // Else:
            // * just create a node of this name
            if (typeof json[childName] != JS_TYPE_UNDEFINED) {
              if (!(json[childName] instanceof Array)) {
                var oldNode = json[childName];
                delete json[childName];
                json[childName] = [oldNode];
              }
              json[childName].push(jsonNode);
            } else {
              json[childName] = jsonNode;
            }
            child = child.nextSibling;
          }
        }

        // Special casing for text-only nodes: if we're going to have a
        // single-text-node object (when including all attributes + XML node
        // children), collapse it to a string field.
        if ((numChildren + attrs.length) == 1) {
          if (json.hasOwnProperty(XML_TEXT)) {
            return json[XML_TEXT];
          } else if (json.hasOwnProperty(XML_CDATA)) {
            return json[XML_CDATA];
          }
        }
        return json;
      }
      case DOM_ATTR: {
        throw '[UNHANDLED] nodeType: attribute';
      }
      case DOM_TEXT: {
        // The name of this node is '#text' and will be set by the parent.
        return xmlNode.nodeValue;
      }
      case DOM_CDATA: {
        return xmlNode.nodeValue;
      }
      case DOM_COMMENT: {
        // Comments have no representation in JSON, so this is a no-op.
        return null;
      }
      case DOM_DOCUMENT: {
        if (typeof xmlNode.firstChild == JS_TYPE_UNDEFINED) {
          return {};
        } else if (xmlNode.childNodes.length > 1) {
          var json = {};
          var child = xmlNode.firstChild;
          while (child) {
            var jsonNode = xmlToJsonInternal(child);
            if (jsonNode != null) {  // skips comments
              json[child.nodeName] = jsonNode;
            }
            child = child.nextSibling;
          }
          return json;
        }
        var json = {};
        var child = xmlNode.firstChild;
        json[child.nodeName] = xmlToJsonInternal(xmlNode.firstChild);
        return json;
      }
      default: {
        throw 'Invalid nodeType (' + xmlNode.nodeType + '): ' + xmlNode;
      }
    }
  };

  return xmlToJsonInternal(xmlDom);
}
