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

   if ( Util.isIE( ) || Util.isIOS() ){
        // see TWEB-57
        // see TWEB-185
        document.getElementById("notSupportedMessage").style.display= "block";
        return;
    }

    //Following is commented out to test the CSP meta tag on app/views/player/index.html.
/*    if ( Util.isAndroid() &&  /(Chrome\/2)\w/g.test(navigator.userAgent)  ) {
        // see TWEB-229
        document.getElementById("notSupportedMessage").innerHTML = "<p>Playback on this device is not supported. Please try the preview in the Chrome browser.</p>";
        document.getElementById("notSupportedMessage").style.display= "block";
        return ;
    }*/

    /* Steve, right at the top. */
    var str = window.location.search;
    var params = {};

    str.replace(
        new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
        function( $0, $1, $2, $3 ){
            params[ $1 ] = $3;
        }
    );

    document.getElementsByTagName("body")[0].style.overflow = "hidden";



    // WebGL player/canvas
    var container = document.getElementById("container");
    var src = params.url ? params.url : VIDEO_OPTIONS[getVideoQuality()];
    //alert("video source: " + src);
    console.log("video source: " + src);
    var player = new WEVR.Player({
        container : container,
        src : src
    });

    player.createDOMPlayerControls();

    //Mobile won't play back without a user interaction
    //Edge will start to playback, even though it hasn't buffered properly yet
    if (! (Util.isMobile() ) &&  !Util.isMSEdge()  ) {
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

var getVideoQuality= function() {
    var quality = "med";

    if (Util.isIOS()) {
        //removed until iOS is supported
    } else if (Util.isAndroid()) {
        quality = "med";
    } else { //desktop
        quality = "med"; //hi takes up too much bandwidth for streaming.
    }

    return quality;
}