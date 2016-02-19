/*
 JS Modified from a tutorial found here:
 http://www.inwebson.com/html5/custom-html5-video-controls-with-jquery/

 I really wanted to learn how to skin html5 video.
 */
/*
 Also heavily adapted from
 http://codepen.io/frytyler/pen/juGfk
 -- TP
 */


window.onload = function() {

    /* Steve, right at the top. */
    var str = window.location.search;
    var params = {};

    str.replace(
        new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
        function( $0, $1, $2, $3 ){
            params[ $1 ] = $3;
        }
    );

    // WebGL player/canvas
    var container = document.getElementById("container");
    var src = params.url ? params.url : VIDEO_URL;

    var player = new WEVR.Player({
        container : container,
        src : src
    });

    player.createDOMPlayerControls();

    if (! (Util.isAndroid() || Util.isIOS() ) ) {
       player.play();
    }
    player.setVideoUIState();

   window.addEventListener( 'resize', function() {
        if (player){
            player.positionControls();
        }
    }, false );

    player.positionControls();

}