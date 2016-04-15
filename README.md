# webplayer
360 Video Player for Web

This is the source code for Wevr's 360 video player. We use it to play previews of the VR content for [Wevr Transport](http://transport.wevr.com/ "Transport").

The player is built with [Three.js](https://github.com/mrdoob/three.js/), and uses the [WebVR Boilerplate](https://github.com/borismus/webvr-boilerplate) to enable Cardboard VR.

## Usage

Open player.html, passing a url=[your URL here] query arg. For example

```
localhost/webplayer/player.html?url=/my360videos/catsinVR.html
```

There is a default value for the url argument, but it is Wevr-specific, used for testing only.

Note that if the video is hosted on another domain, your server will need to support CORS, otherwise the video load will fail due to cross-origin restrictions.

## For more information

For more information, check out Wevr's blog post about our player at [tech.wevr.com](http://tech.wevr.com/?p=13).
