# Delayed Replay

A podcast search and playback app.

## Live demo

Visit [this page](https://mbrukman.github.io/delayed-replay/) to search and play
podcasts directly from your browser without installing anything!

## Running locally

### Without any servers

This is the simplest and most straightforward way of using the app: simply clone
or download this repo and open `index.html` in your browser. That's it!

> Note: you can't just open `index.html` in this repository via GitHub web UI,
> as that doesn't actually load the HTML file or the referenced JS, CSS, etc.
> files. To try it out without downloading anything locally, see the "Live demo"
> section above instead.

### With a local web server

This mimics how GitHub Pages hosts the app. Run this command:

```sh
$ ./server.py [port]
```

Open the URL printed in the terminal to search and play podcasts.

### With a local proxy

This lets you avoid using external XML fetching proxies (which sometimes are
broken or discontinued, and hence the above approaches may stop working &mdash;
please file a bug if this happens!

In this case, you are running a local server which will do the XML feed fetches
for you, and the web app translates XML to JSON itself.

First, modify [`js/podcast.js`](js/podcast.js) as follows:

```diff
-  $scope.useProxy = false;
+  $scope.useProxy = true;
```

Then, run:

```sh
$ ./proxy.py [port]
```

Open the URL printed in the terminal to search and play podcasts.

## License

Apache 2.0; see [`LICENSE.txt`](LICENSE.txt) for details.

## Disclaimer

This project is not an official Google project. It is not supported by Google
and Google specifically disclaims all warranties as to its quality,
merchantability, or fitness for a particular purpose.
