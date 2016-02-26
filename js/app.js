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

   if ( Util.isIE( )){
        document.getElementById("notSupportedMessage").style.display= "block";
        return;
    }

    /* Steve, right at the top. */
    var str = window.location.search;
    var params = {};

    str.replace(
        new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
        function( $0, $1, $2, $3 ){
            params[ $1 ] = $3;
        }
    );

    //on IOS, we need to force the window to scroll, so that the upper and lower chrome can be scrolled out of view
    if (Util.isIOS()) {
        var iOSscrollerDiv = document.getElementById("iOSscrollerDiv");
        iOSscrollerDiv.style.display = "block";
        var iOSscrollerDivTop = document.getElementById("iOSscrollerDivTop");
        iOSscrollerDivTop.style.display = "block";

    } else {
        document.getElementsByTagName("body")[0].style.overflow = "hidden";
    }


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
    //Edge iwll start to playback, even though it hasn't buffered properly yet
    if (! (Util.isAndroid() || Util.isIOS()) &&  !Util.isMSEdge()  ) {
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
    var quality = "low";

    if (Util.isIOS()) {

        var iosPhoneResolutions = [
            {
                "type": "iPhone4", //and 4s
                "res": [640, 960]
            },
            {
                "type": "iPhone5", //and 5s
                "res": [640, 1136]
            },
            {
                "type": "iPhone6",
                "res": [750, 1334]
            },
            {
                "type": "iPhone6Plus",
                "res": [1242, 2208]
            }
        ];
        var userAgent = navigator.userAgent || navigator.vendor || window.opera;
        var width = Util.getScreenWidth();
        var height = Util.getScreenHeight();
        //alert("width: " +width +", height: " + height);
        var phoneType = "";
        iosPhoneResolutions.forEach(function (item, index) {
            if (item.res[1] == width && item.res[0] == height) {
                phoneType = item.type;
            }
        });

        switch (phoneType) {
            case "iPhone4":
                alert("At least an iPhone5 is required to play this demo.");
                return;
            case "iPhone5":
                quality = "low";
                break;
            case "iPhone6":
            case "iPhone6Plus":
                quality = "med";
                break;
            default:
                quality = "med"; //future iPhones?

        }
    } else if (Util.isAndroid()) {
        quality = "med";
    } else { //desktop
        quality = "hi";
    }
    //alert("video quality: " + quality);
    return quality;
}