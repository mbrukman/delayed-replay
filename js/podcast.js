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
// Podcast search/display and HTML5 player.

function SearchCtrl($scope, $http, $templateCache, $timeout) {
  $scope.query = '';
  $scope.code = null;
  $scope.data = {results: []};
  $scope.status = null;

  $scope.initAudio = function() {
    var audio = new Audio();
    audio.preload = false;
    return audio;
  };

  $scope.initVideo = function() {
    var video = document.createElement('video');
    video.preload = false;
    return video;
  };

  $scope.activeItem = null;
  $scope.activeMedia = null;
  $scope.activeAudio = $scope.initAudio();
  $scope.activeVideo = $scope.initVideo();

  $scope.updateTime = function() {
    $scope.updater = $timeout($scope.updateTime, 1000);
  };
  $scope.updater = $timeout($scope.updateTime, 1000);

  /**
   * @return {boolean}
   */
  $scope.proxyCompatible = function() {
    var protocol = document.location.protocol;
    return (protocol == 'http:') || (protocol == 'https:');
  };

  $scope.useProxy = false;

  /**
   * @param {Object} params
   * @return {string} the constructed URL params, to be appended to the base URL.
   */
  function combineUrlParams(params) {
    var urlParams = [];
    Object.keys(params).forEach(function(key) {
      urlParams.push(key + '=' + encodeURIComponent(params[key]));
    });
    return urlParams.join('&');
  }

  var JS_TYPE_OBJECT = 'object';
  var JS_TYPE_UNDEFINED = 'undefined';

  var MEDIA_PAUSE = 'icon-pause';
  var MEDIA_PLAY = 'icon-play';
  var MEDIA_STOP = 'icon-stop';

  var MIME_AUDIO_M4A = 'audio/mp4';
  var MIME_AUDIO_MP3 = 'audio/mpeg';
  var MIME_AUDIO_OGG = 'audio/ogg';

  var MIME_VIDEO_M4V = 'video/x-m4v';
  var MIME_VIDEO_MP4 = 'video/mp4';
  var MIME_VIDEO_OGG = 'video/ogg';
  var MIME_VIDEO_WEBM = 'video/webm';

  var RSS_ITEM_ENCLOSURE_TYPE = '@type';
  var RSS_ITEM_ENCLOSURE_URL = '@url';
  // Returned in JSON from rss2json.com, not a standard feature of RSS feeds.
  var RSS_ITEM_ENCLOSURE_LINK = 'link';

  /**
   * @param {Object} item
   * @return {string} the contained URL (if any), or empty string if none.
   */
  $scope.enclosureUrl = function(item) {
    // This is a hack: AngularJS shouldn't be evaluating code that loads this
    // URL, given that there's an ng-show="hasAudio(item)" guard, but seems to
    // do so anyway. Race condition on loading/searching?
    if (!item || !('enclosure' in item)) {
      return '';
    }
    if (RSS_ITEM_ENCLOSURE_URL in item.enclosure) {
      return item.enclosure[RSS_ITEM_ENCLOSURE_URL];
    }
    // Only available in JSON response value from rss2json.com; not part of
    // standard RSS feeds.
    if (RSS_ITEM_ENCLOSURE_LINK in item.enclosure) {
      return item.enclosure[RSS_ITEM_ENCLOSURE_LINK];
    }
    return '';
  };

  /**
   * @param {string} haystack
   * @param {string} needle
   * @return {boolean} whether |needle| is the suffix of |haystack|
   */
  $scope.hasSuffix = function(haystack, needle) {
    return haystack.indexOf(needle, haystack.length - needle.length) != -1;
  };

  /**
   * @param {Object} item
   * @return {string} the MIME type of the URL (if any), or the empty string if
   *     none or unrecognized.
   */
  $scope.mimetype = function(item) {
    if (!item || !('enclosure' in item)) return '';
    if (RSS_ITEM_ENCLOSURE_TYPE in item.enclosure) {
      var origType = item.enclosure[RSS_ITEM_ENCLOSURE_TYPE];

      // Some podcasts provide their own mimetype that's not valid in browsers'
      // HTML5 tags; we remap them here to the standard versions. However, in
      // some cases, the mimetype cannot be deduced via extension alone so we
      // cannot simply override the vendor-provided mimetype in all cases.
      var REMAP_MIMETYPE = {
        'audio/mpeg3': 'audio/mpeg',
      };
      if (REMAP_MIMETYPE[origType]) {
        return REMAP_MIMETYPE[origType];
      }

      return origType;
    }

    // Select mimetype based on extension.
    var url = $scope.enclosureUrl(item);

    var EXT_TO_MIME = [
      // AUDIO
      ['m4a', MIME_AUDIO_M4A],
      ['mp3', MIME_AUDIO_MP3],
      ['ogg', MIME_AUDIO_OGG],

      // VIDEO
      ['m4v', MIME_VIDEO_M4V],
      ['mp4', MIME_VIDEO_MP4],
      ['ogv', MIME_VIDEO_OGG],
    ];

    for (var e = 0; e < EXT_TO_MIME.length; ++e) {
      var ext2mime = EXT_TO_MIME[e];
      if ($scope.hasSuffix(url, '.' + ext2mime[0])) {
        return ext2mime[1];
      }
    }

    // No mapping from extension to mime type found.
    return '';
  };

  /**
   * @param {Object} item
   * @return {bool} whether or not this item has an enclosed URL.
   */
  $scope.hasEnclosedUrl = function(item) {
    return ($scope.enclosureUrl(item) != '');
  };

  /**
   * @param {Object} item
   * @return {bool}
   */
  $scope.hasAudio = function(item) {
    if (!item || !$scope.hasEnclosedUrl(item)) return false;
    switch ($scope.mimetype(item)) {
      case MIME_AUDIO_M4A:
      case MIME_AUDIO_MP3:
      case MIME_AUDIO_OGG:
        return true;
    }
    return false;
  };

  /**
   * @param {Object} item
   * @return {bool}
   */
  $scope.hasVideo = function(item) {
    if (!item || !$scope.hasEnclosedUrl(item)) return false;
    switch ($scope.mimetype(item)) {
      case MIME_VIDEO_M4V:
      case MIME_VIDEO_MP4:
      case MIME_VIDEO_OGG:
        return true;
    }
    return false;
  };

  $scope.episodeClass = function(item) {
    return ($scope.activeItem === item) ? 'activeEpisode' : '';
  };

  $scope.showEpisodeSummary = function(item) {
    return ($scope.activeItem !== item) && item.showSummary;
  };

  /**
   * @param {Object} item
   * @return {bool}
   */
  $scope.hasMedia = function(item) {
    var ret = $scope.hasAudio(item) || $scope.hasVideo(item);
    return ret;
  };

  /**
   * @param {number} seconds
   * @returns {string}
   */
  $scope.formatTimeInSeconds = function(seconds) {
    if (!seconds || seconds < 0) {
      return '--:--';
    }

    var floor = Math.floor;
    var fmt = function(num) {
      return (num < 10) ? ('0' + num) : num;
    };

    seconds = floor(seconds);
    var hrs = floor(seconds / 3600);
    var min = floor((seconds - 3600 * hrs) / 60);
    var sec = seconds - 3600 * hrs - 60 * min;
    return ((hrs > 0) ? fmt(hrs) + ':' : '') + fmt(min) + ':' + fmt(sec);
  };

  $scope.pauseAllMedia = function() {
    if ($scope.activeAudio) {
      $scope.activeAudio.pause();
    }
    if ($scope.activeVideo) {
      $scope.activeVideo.pause();
    }
  };

  var SEEK_FRACTION = 0.10;

  $scope.fastBackwardMedia = function() {
    var media = $scope.activeMedia;
    if (!media) return;
    media.currentTime = 0;
  };

  $scope.backwardMedia = function() {
    var media = $scope.activeMedia;
    if (!media) return;
    var delta = Math.max(1, Math.ceil(media.currentTime * SEEK_FRACTION));
    media.currentTime = Math.max(0, media.currentTime - delta);
  };

  $scope.playMedia = function() {
    var media = $scope.activeMedia;
    if (!media) return;
    media.play();
  };

  $scope.pauseMedia = function() {
    var media = $scope.activeMedia;
    if (!media) return;
    media.pause();
  };

  $scope.stopMedia = function() {
    var media = $scope.activeMedia;
    if (!media) return;
    media.pause();
    media.currentTime = 0;
  };

  $scope.forwardMedia = function() {
    var media = $scope.activeMedia;
    if (!media) return;
    var delta = Math.max(
        1, Math.ceil((media.duration - media.currentTime) * SEEK_FRACTION));
    media.currentTime = Math.min(media.duration, media.currentTime + delta);
  };

  $scope.setActiveMedia = function(item) {
    $scope.pauseAllMedia();
    $scope.activeItem = item;

    if ($scope.hasAudio(item)) {
      $scope.activeMedia = $scope.activeAudio;
      $scope.activeAudio.src = $scope.enclosureUrl(item);
      $scope.activeAudio.type = $scope.mimetype(item);
      $scope.activeAudio.load();
      $scope.activeAudio.play();
    } else if ($scope.hasVideo(item)) {
      $scope.activeMedia = $scope.activeVideo;
      $scope.activeVideo.src = $scope.enclosureUrl(item);
      $scope.activeVideo.type = $scope.mimetype(item);
      $scope.activeVideo.load();
      $scope.activeVideo.play();
    }
  };

  $scope.closeModalPodcast = function(podcast) {
    $scope.pauseAllMedia();
    $scope.activeAudio.src = '';
    $scope.activeVideo.src = '';
    $scope.activeMedia = null;
    podcast.modal = false;
  };

  /**
   * @param {Object} podcast
   */
  $scope.togglePodcast = function(podcast) {
    $scope.fetchEpisodes(podcast);
    podcast.modal = true;
  };

  $scope.search = function() {
    var urlBase = 'https://itunes.apple.com/search?';
    var urlParamsRaw = {
      term: $scope.query,
      entity: 'podcast',
      media: 'podcast',
      limit: 25,
      callback: 'JSON_CALLBACK',
    };
    var urlFull = urlBase + combineUrlParams(urlParamsRaw);
    $http({
      method: 'JSONP',
      url: urlFull,
      // We may want to switch to proxy-based fetch here, but the above
      // approach lets us search for podcasts in the browser without even
      // running the proxy.
      //
      // url: '/?q=' + encodeURIComponent(urlFull),
      cache: $templateCache,
    })
      .success(function(data, status) {
        $scope.data = data;
        $scope.status = status;
      })
      .error(function(data, status) {
        $scope.data = data || "Request failed";
        $scope.status = status;
      });
  };

  /**
   * Converts HTML to plain text by stripping out HTML tags.
   *
   * @param {string} HTML text
   * @return {string} plain text
   */
  function htmlToText(html) {
    var node = document.createElement('span');

    var patchedHtml = html
        // Add a space before every <br> tag.
        .replace(/<\s*br\s*\/?\s*>/gi, ' <br>')
        // Add a space before every opening paragraph tag.
        .replace(/<p/gi, ' <p')
        // Add a space after every closing paragraph tag.
        .replace(/<\/p>/gi, '</p> ');

    // Convert HTML to text.
    node.innerHTML = patchedHtml;
    return node.textContent || node.innerText || html;
  }

  /**
   * @param {Object} data
   */
  function initRssChannelItems(data) {
    // If the RSS data is already an array of multiple items, leaves it
    // unmodified. If it is a single item, wraps it in an array for uniform
    // treatment.
    if (typeof data.rss.channel.item == JS_TYPE_UNDEFINED) {
      data.rss.channel.item = [];
    } else if (data.rss.channel.item instanceof Array) {
      // No-op, this is just what we want.
    } else {
      // This is a single item rather than an array, so we need to wrap it.
      var item = data.rss.channel.item;
      delete data.rss.channel.item;
      data.rss.channel.item = [item];
    }

    // Initialize media state.
    for (var i = 0; i < data.rss.channel.item.length; ++i) {
      var item = data.rss.channel.item[i];
      item.mediaClass = MEDIA_STOP;

      // Sanitize the description and summary by removing HTML tags.
      var desc = item.description || item['itunes:summary'] || '';
      if (typeof desc != 'string') {
        console.debug('Item description is not a string, but: ' + JSON.stringify(desc));
        desc = '';
      }
      item.description = htmlToText(desc);
    }
  }

  /**
   * Requires running a proxy server, which answers on either:
   *
   * /?rss=<...> which converts XML-to-JSON in the proxy, or
   * /?q=<...> which is just a pass-through proxy, returning unmodified data.
   *
   */
  $scope.fetchEpisodesViaProxy = function(podcast) {
    var feedUrl = podcast.feedUrl;
    if (!feedUrl) {
      console.error('[proxy] No feed URL available for podcast: ' + podcast.collectionName);
      return false;
    }
    var urlParams = {
      q: feedUrl,
      // rss: feedUrl,
    };
    $http({
      method: 'GET',
      url: '/?' + combineUrlParams(urlParams),
      transformResponse: function(data) {
        return xmlToJson(data);
      },
      cache: $templateCache,
    })
      .success(function(data, status) {
        initRssChannelItems(data);
        podcast.rss = data.rss;
        return true;
      })
      .error(function(data, status) {
        console.error('[proxy] Error fetching episodes: ' + data);
        return false;
      });
  };

  /**
   * Fetch RSS feed (converted for us from XML to JSON) via `rss2json.com`.
   *
   * This lets us implement the entire app in the browser, using JavaScript,
   * without running our own local proxy.
   *
   * @param {Object} podcast
   */
  $scope.fetchEpisodesViaRss2Json = function(podcast) {
    var feedUrl = podcast.feedUrl;
    if (!feedUrl) {
      console.error('[rss2json] No feed URL available for podcast: ' + podcast.collectionName);
      return false;
    }
    var urlParams = {
      // rss2json.com does not seem to accept URI-encoded URL params, so we send
      // the URL as-is.
      'rss_url': feedUrl,
    };

    var fetchUrl = 'https://api.rss2json.com/v1/api.json?' + combineUrlParams(urlParams);
    console.debug('[rss2json] Fetching podcast: ' + feedUrl);
    console.debug('[rss2json] via URL: ' + fetchUrl);
    $http({
      url: fetchUrl,
      cache: $templateCache,
    })
      .success(function(data, status) {
        console.debug('[rss2json] Successfully fetched podcast.');
        // Custom init since Rss2Json converts XML to JSON for us, but it's
        // not in the same format as it is when we do the conversion
        // ourselves.
        podcast.rss = {
          channel: {
            item: data.items.map((item) => {
              item.description = htmlToText(item.description),
              item.mediaClass = MEDIA_STOP;
              return item;
            }),
          },
        };
        console.debug('[rss2json] Reformatted podcast:');
        console.debug(podcast.rss);
        return true;
      })
      .error(function(data, status) {
        console.error('[rss2json] Error fetching episodes: ' + JSON.stringify(data));
        return false;
      });
  };

  /**
   * Fetch RSS feed via `cloudquery.t2t.io`.
   *
   * This lets us implement the entire app in the browser, using JavaScript,
   * without running our own local proxy.
   *
   * @param {Object} podcast
   */
  $scope.fetchEpisodesViaCloudQuery = function(podcast) {
    var feedUrl = podcast.feedUrl;
    if (!feedUrl) {
      console.error('[cloudquery] No feed URL available for podcast: ' + podcast.collectionName);
      return false;
    }
    var urlParams = {
      // cloudquery.t2t.io does not seem to accept URI-encoded URL params, so we
      // send the URL as-is.
      'url': feedUrl,
      'selectors': '*',
    };

    var fetchUrl = 'https://cloudquery.t9t.io/query?' + combineUrlParams(urlParams);
    console.debug('[cloudquery] Fetching podcast: ' + feedUrl);
    console.debug('[cloudquery] via URL: ' + fetchUrl);
    $http({
      url: fetchUrl,
      cache: $templateCache,
    })
      .success(function(data, status) {
        console.debug('[cloudquery] Successfully fetched podcast.');
        var jsonData = xmlToJson(data.contents[0].innerText);
        initRssChannelItems(jsonData);
        podcast.rss = jsonData.rss;
        console.debug('[cloudquery] Successfully fetched podcast.');
        console.debug('[cloudquery] Reformatted podcast:');
        console.debug(podcast.rss);
        return true;
      })
      .error(function(data, status) {
        console.error('[cloudquery] Error fetching episodes: ' + data);
        return false;
      });
  };

  /**
   * TODO: Allow setting this option via the UI or URL params?
   *
   * @param {Object} podcast
   */
  $scope.fetchEpisodes = function(podcast) {
    // If we already fetched the episodes, we're done.
    if (podcast.rss) return;

    if ($scope.useProxy) {
      $scope.fetchEpisodesViaProxy(podcast);
    } else {
      // Try fetching RSS feed with one option, fallback on another option if
      // the first one fails.
      if (!$scope.fetchEpisodesViaCloudQuery(podcast)) {
        $scope.fetchEpisodesViaRss2Json(podcast);
      }
    }
  };
}

SearchCtrl.$inject = ['$scope', '$http', '$templateCache', '$timeout'];

angular.module('DelayedReplay', ['ui.bootstrap'])
    .controller('SearchCtrl', SearchCtrl);
