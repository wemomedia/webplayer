WEVR.Player = function(params) {
    this.isFullScreen = false;
	this.container = params.container;
    this.src = params.src;
    this.isPlaying = false;
    this.initThreeJS();
    this.initScene();
    this.initControls();
    this.currentTime = new Date();
    this.run();
}

WEVR.Player.prototype = new Object;

WEVR.Player.prototype.initThreeJS = function() {
	// Create the Three.js renderer and attach it to our container
    this.renderer = new THREE.WebGLRenderer( { antialias: true} );

    // this.renderer.setPixelRatio( window.devicePixelRatio );

    // Set the viewport size
    this.container.appendChild(this.renderer.domElement);

    this.canvas = this.renderer.domElement;

    if (Util.isMobile()) {
        // Apply VR stereo rendering to renderer.
        this.vrEffect = new THREE.VREffect(this.renderer);
        this.vrEffect.setSize(window.innerWidth, window.innerHeight);

        this.vrManager = new WebVRManager(this.renderer,
            this.vrEffect, {hideButton: false});
    } else {
        this.renderer.setSize(this.container.clientWidth, window.innerHeight);
    }


    var that = this;
    
	window.addEventListener( 'resize', function() {
    	that.refreshSize();
    }, false );

    var fullScreenChange =
        this.renderer.domElement.mozRequestFullScreen? 'mozfullscreenchange' : 'webkitfullscreenchange';
    
    document.addEventListener( fullScreenChange, 
            function(e) {that.onFullScreenChanged(e); }, false );

}

WEVR.Player.prototype.initScene = function() {
    // Create a new Three.js scene
    var scene = new THREE.Scene();

    // Add  a camera so we can view the scene
    var camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z =  .001;
	scene.add(camera);

    //var initialPlayState = !Util.isAndroid();
    var initialPlayState =false;
    this.isPlaying =  initialPlayState;

    var video = document.getElementById('video');

  	// Create a video texture for playing the movie
    /*var video = document.createElement('video');
    video.autoplay = false;*/
    video.crossOrigin = "anonymous";

    this.isInitialBuffering = true;
    video.src = this.src;

    if (Util.isIOS()){
        //TODO: not sure why the below is failing on iOS Safari
        // if (video.hasOwnProperty("webkitPlaysinline")) { //iOS in case it is added to the homescreen and is navigator.standalone
        video.webkitPlaysinline = true;
        //alert("test")
    }
    this.video = video;
    this.videoTime = 0;

    //var texture = new THREE.VideoTexture( video );
    this.texture = new THREE.Texture( this.video );
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;

    var material = new THREE.MeshBasicMaterial({ map: this.texture, side:THREE.DoubleSide });

    // Create the sky sphere geometry
    var geometry = new THREE.SphereGeometry(10, 32, 32);
    // We're looking at the inside
	geometry.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) );

    // And put the geometry and material together into a mesh
    var sphere = new THREE.Mesh(geometry, material);
    sphere.rotation.y = -Math.PI / 2;

    // Finally, add the mesh to our scene
    scene.add( sphere );

    this.scene = scene;
    this.camera = camera;
    this.sphere = sphere;

    this.lastFrameTime = 0;
}

WEVR.Player.prototype.createDOMPlayerControls = function() {
//DOM-based player controls
    var playerControls = document.getElementById("player_controls");

    var controlsScaler = Util.isMobile() ? 2 : 1;
    if (Util.isMobile()) {
        //playerControls.classList.add("mobileScale"); //didn't work on Samsung built in browser
    }
    var playBtmControl = document.createElement("div");
    playBtmControl.classList.add("btmControl");

//create Play Button
    var playButton = document.createElement("div");
    playButton.classList.add("btnPlay");
    playButton.title = "Play/Pause video";
    playButton.setAttribute("id", "play_button");

    this.playButtonIcon = document.createElement("span");
    this.playButtonIcon.classList.add( Util.isMobile() ? 'icon-play-mobile' : 'icon-play');
    this.playImage =this.loadIcon("play.svg", 30*controlsScaler, 30*controlsScaler ) ;
    this.playButtonIcon.appendChild(this.playImage);
    this.pauseImage =this.loadIcon("pause.svg", 25*controlsScaler, 25*controlsScaler) ;
    this.playButtonIcon.appendChild(this.pauseImage);
    playButton.appendChild(this.playButtonIcon);
    playBtmControl.appendChild(playButton);


//create Progress Bar
    this.progressBar = document.createElement("div");
    this.progressBar.classList.add(Util.isMobile() ? "progress-bar-mobile" : "progress-bar");
    this.progressBarWidth = Util.isMobile() ? 50 : 200;
    //this.progressBar.width = this.progressBarWidth +18;
    var progress = document.createElement("div");
    //progress.width = this.progressBarWidth;
    progress.classList.add(Util.isMobile() ? "progress-mobile" : "progress");
    this.progressBar.appendChild(progress);
    this.bufferBar = document.createElement("span");
    this.bufferBar.classList.add("bufferBar");
    progress.appendChild(this.bufferBar);
    this.timeBar = document.createElement("span");
    this.timeBar.classList.add("timeBar");
    progress.appendChild(this.timeBar);

    playBtmControl.appendChild(this.progressBar);

//createMute Button
    var muteButton = document.createElement("div");
    muteButton.classList.add("sound", "sound2", "btn");
    muteButton.title = "Mute/Unmute sound";
    var muteButtonIcon = document.createElement("span");
    muteButtonIcon.classList.add( Util.isMobile() ? 'icon-sound-mobile' :"icon-sound");
    this.speakerImage =this.loadIcon("speaker.svg", 22*controlsScaler, 22*controlsScaler) ;
    muteButtonIcon.appendChild(this.speakerImage);
    this.muteImage =this.loadIcon("mute.svg", 22*controlsScaler, 22*controlsScaler) ;
    muteButtonIcon.appendChild(this.muteImage);
    this.muteImage.style.display = "none";
    muteButton.appendChild(muteButtonIcon);
    playBtmControl.appendChild(muteButton);



    if (this.vrManager) {
        //create cardboard button
        var cardboardButton = document.createElement("div");
        cardboardButton.classList.add("btnCardboard", "btn");
        cardboardButton.title = "Switch to Google Cardboard VR";
        var cardboardButtonIcon = document.createElement("span");
        //Credit: vr goggles by Nick Bluth from the Noun Project
        cardboardButtonIcon.classList.add(Util.isMobile() ? 'icon-cardboard-mobile': "icon-cardboard");
        var image = this.loadIcon("cardboard.svg", 15*controlsScaler, 15*controlsScaler);
        cardboardButtonIcon.appendChild(image);
        cardboardButton.appendChild(cardboardButtonIcon);
        playBtmControl.appendChild(cardboardButton);
    }


//create full-screen button
    var fullScreenButton = document.createElement("div");
    fullScreenButton.classList.add("btnFS", "btn");
    fullScreenButton.title = "Switch to full screen";
    var fullScreenButtonIcon = document.createElement("span");
    fullScreenButtonIcon.classList.add( Util.isMobile() ? 'icon-fullscreen-mobile' :"icon-fullscreen");
    var image =this.loadIcon("fullscreen.svg", 15*controlsScaler,15*controlsScaler) ;
    fullScreenButtonIcon.appendChild(image);
    fullScreenButton.appendChild(fullScreenButtonIcon);
    playBtmControl.appendChild(fullScreenButton);

    playerControls.appendChild(playBtmControl);

// I made the lower buttons so big, I don't think that they are
  /*  if (Util.isAndroid() || Util.isIOS() ) {
        //create centered Play Button
        this.playMiddleButton = document.createElement("div");
        this.playMiddleButton.classList.add("playMiddleButton", "btn");
        this.playMiddleButton.title = "Play/Pause video";
        this.playMiddleButton.setAttribute("id", "play_middle_button");

        var playMiddleButtonIcon = document.createElement("span");
        playMiddleButtonIcon.classList.add('icon-play-middle');
        this.playMiddleButton.appendChild(playMiddleButtonIcon);
        var centeredPlayButton = document.getElementById("centered_play_button");

        centeredPlayButton.appendChild(this.playMiddleButton);
    }*/

    this.controlsWidth = playBtmControl.offsetWidth;

    //create centered Replay Button
    this.replayMiddleButton = document.createElement("div");
    this.replayMiddleButton.style.display = "none";
    this.replayMiddleButton.classList.add("replayMiddleButton", "btn");
    this.replayMiddleButton.title = "Replay video";
    this.replayMiddleButton.setAttribute("id", "replay_middle_button");

    var replayMiddleButtonIcon = document.createElement("span");
    replayMiddleButtonIcon.classList.add('icon-replay-middle');
    image =this.loadIcon("replay.svg", 90, 90 ) ;
    replayMiddleButtonIcon.appendChild(image);
    this.replayMiddleButton.appendChild(replayMiddleButtonIcon);
    var centeredPlayButton = document.getElementById("centered_play_button");
    centeredPlayButton.appendChild(this.replayMiddleButton);

    var that = this;

    var clickPlay =function() {
        if (that.video.paused == true) {
            //Note: we keep track of our intent to play instead of querying video.isPlaying,
            //  which may return false while it is buffering, but we want the buttons to
            //  show that as far as the user is concerned, it is in 'play' mode (either playing
            //  or about to play)
            that.isPlaying = true;
            //go full screen if we are not already fullscreen
            if (Util.isAndroid() && ! that.isFullScreen) {
                that.fullScreen();
            }

            // Play the video
            that.video.play();

        } else {
            that.isPlaying = false;
            // Pause the video
            that.video.pause();
        }
        that.setVideoUIState();

    }

    var clickReplay = function(){
        that.video.currentTime = 0;
        that.isPlaying = true;
        //go full screen if we are not already fullscreen
        if (Util.isAndroid() && ! that.isFullScreen) {
            that.fullScreen();
        }

        // Play the video
        that.video.play();
    }

    // Event listener for the play/pause buttons
    playButton.addEventListener("click", clickPlay);

    if (this.replayMiddleButton) {
        this.replayMiddleButton.addEventListener("click", clickReplay);
    }

    // Event listener for the mute button
    muteButton.addEventListener("click", function() {
        if (that.video.muted == false) {
            // Mute the video
            that.video.muted = true;

            that.speakerImage.style.display = "none";
            that.muteImage.style.display = "block";
        } else {
            // Unmute the video
            that.video.muted = false;

            that.speakerImage.style.display = "block";
            that.muteImage.style.display = "none";
        }
    });

    if (cardboardButton) {
        // Event listener for the mute button
        cardboardButton.addEventListener("click", function () {
            if (that.vrManager) {
                that.vrManager.onVRToggle_();
            }
        });
    }

    // Event listeners for scrubbing
    var timeDrag = false;
    this.progressBar.addEventListener('mousedown', function(e) {
        timeDrag = true;
        updatebar(e.pageX);
    });
    this.progressBar.addEventListener('mouseup', function(e) {
        if(timeDrag) {
            timeDrag = false;
            updatebar(e.pageX);
        }
    });
    this.progressBar.addEventListener('mousemove', function(e) {
        if(timeDrag) {
            updatebar(e.pageX);
        }
    });
    var updatebar = function(x) {

        //calculate drag position
        //and update video currenttime
        //as well as progress bar
        var maxduration = that.video.duration;

        var timeBarStartX = that.progressBar.offsetParent.offsetLeft + that.progressBar.offsetLeft + 10;//padding is 10px
        var timeBarEndX  =  that.progressBarWidth;

        var percentage = 100 * ( x - timeBarStartX) / timeBarEndX;
       // console.log( "x:" + x +",  timeBarStart: " + timeBarStartX + ", percentage:" + percentage );
        if (percentage > 100) {
            percentage = 100;
        }
        if (percentage < 0) {
            percentage = 0;
        }
        if (percentage > 99) {
            that.setVideoUIState();
        }
       // that.timeBar.style.width = percentage + '%';
        that.video.currentTime = maxduration * percentage / 100;
        that.timeBar.style.width =  (that.video.currentTime / that.video.duration) *that.progressBarWidth + "px";
    };

    // Update the scrubber bar as the video plays
    this.video.addEventListener("timeupdate", function() {

        if (that.video.currentTime > that.video.duration - 1){ //within 1 sec of the end
            that.setVideoUIState();
        }
        that.timeBar.style.width =  (that.video.currentTime / that.video.duration) *that.progressBarWidth + "px";

    });

    // Timer to keep the buffer bar up to date
    var startBuffer = function() {
        var currentBuffer = that.video.buffered.end(0);
        var maxduration = that.video.duration;
        var perc = 100 * currentBuffer / maxduration;
        that.bufferBar.style.width = perc + '%';

        if(currentBuffer < maxduration) {
            setTimeout(startBuffer, 500);
        }
    };

    this.video.addEventListener("canplay", function() {

        setTimeout(startBuffer, 150);

    });

    this.video.addEventListener("canplaythrough", function () {
        that.isInitialBuffering = false;
        that.setVideoUIState();
    }, false);

    // Event listener for the full-scree
    //
    // n button
   // if (fullScreenButton) {
        fullScreenButton.addEventListener("click", function () {
            if (that.vrManager) {
                that.vrManager.onFSClick_();
                if (that.vrManager.isFullscreenMode() ){
                    //that.isFullScreen = true;
                    that.fullScreen();
                }
            } else {
                that.fullScreen();
                that.setVideoUIState();
            }
        });
  //  }

    var container = document.getElementById("container");
    container.addEventListener( "click" , function() {
        var playerControls = document.getElementById("player_controls");
        playerControls.style.display = "block";
        that.setVideoUIState();
        that.positionControls();
    })

}

WEVR.Player.prototype.loadIcon = function(source, width, height) {
    var canvas = document.createElement('canvas');

    var ctx = canvas.getContext('2d');

    var img = new Image();
    img.onload = function () {
        ctx.drawImage(img, 0, 0, width, height);
    }
    img.src = svgPath + source;
    img.width = width;
    img.height = height;
    return img;
}

WEVR.Player.prototype.play = function() {
    this.isPlaying = true;

    // Play the video
    this.video.play();
    this.setVideoUIState();
}

// Positioning logic to center the playback controls
WEVR.Player.prototype.positionControls = function(){

 // Playback controls
    var controls = document.getElementById("player_controls");

    var width = this.container.offsetWidth;
    var cwidth = this.controlsWidth;//controls.offsetWidth;
    var left = width  / 2 - cwidth/2;

    controls.style.left = left + "px";
    controls.style.bottom = "20px";

    //centered play button
    var centeredPlayButton = document.getElementById("centered_play_button");
    var pwidth = 100;
    left = (width - pwidth) / 2;
    centeredPlayButton.style.left = left + "px";
    var height = this.container.offsetHeight;
    var pheight = 100;
    var top = (height - pheight) / 2;
    centeredPlayButton.style.top = top + "px";

}

WEVR.Player.prototype.setVideoUIState = function(){
    //alert("setVideoUIState: isPlaying = " + this.isPlaying)
    if (this.scrubberTimeout) {
        clearTimeout(this.scrubberTimeout);
        this.scrubberTimeout = null;
    }

    if (this.isInitialBuffering){
        this.playImage.style.display = "none"; //TODO create a waiting icon
        this.pauseImage.style.display = "none";
        return;
    }
    if (this.video.currentTime > this.video.duration - 1){ //we are one second from the end
        if (this.replayMiddleButton ){
            this.replayMiddleButton.style.display = "block";
        }
        this.isPlaying = false;
    }
     if (this.isPlaying ) {
         this.playImage.style.display = "none";
         this.pauseImage.style.display = "block";
         if (this.replayMiddleButton){
             this.replayMiddleButton.style.display = "none";
         }

         this.scrubberTimeout = setTimeout( function() {
             var playerControls = document.getElementById("player_controls");
             playerControls.style.display = "none";
         }, 5000);

    } else {
         this.playImage.style.display = "block";
         this.pauseImage.style.display = "none";

         var playerControls = document.getElementById("player_controls");
         playerControls.style.display = "block";
    }
}

WEVR.Player.prototype.initControls = function() {
    if (Util.isMobile()) {
        this.controls = new THREE.VRControls(this.camera);
    } else {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.zoomSpeed = 0;
    }
}

WEVR.Player.prototype.run = function(time) {

	var that = this;
    if (  Util.isIOS() ){

        if (this.video.webkitDisplayingFullscreen) {
            this.video.webkitExitFullscreen();
        }
        var updatedTime = new Date();
         if (this.isPlaying) {
            this.video.currentTime = this.video.currentTime + (updatedTime.valueOf()-this.currentTime.valueOf())/1000;
             var currTime = this.video.currentTime;
         }
         this.currentTime = new Date();

    }
    if( this.video.readyState === this.video.HAVE_ENOUGH_DATA ){
        this.texture.needsUpdate = true;
    }
    window.requestAnimationFrame(function(time) {
        that.run(time);
    });

	this.main(time);
}

WEVR.Player.prototype.main = function(time) {


	this.update(time);
	this.present();
}

WEVR.Player.prototype.update  = function(time) {

	var duration = 100000; // ms

	var deltat = time - this.lastFrameTime;
	this.lastFrameTime = time;

    var fract = deltat / duration;
    var angle = Math.PI * 2 * fract;
	//this.sphere.rotation.y += angle;

	this.controls.update();
}

WEVR.Player.prototype.present = function() {

    if (this.vrManager) {
        // Render the scene through the vr vrManager.
        this.vrManager.render(this.scene, this.camera);
    } else{
        this.renderer.render(this.scene, this.camera);
    }
}

WEVR.Player.prototype.refreshSize = function() {

	var fullWidth = this.isFullScreen ? window.innerWidth : this.container.clientWidth,
        fullHeight = this.isFullScreen ? window.innerHeight : this.container.clientHeight;

    if (this.vrEffect) {
        this.vrEffect.setSize(window.innerWidth, window.innerHeight);
    } else {
        this.renderer.setSize(fullWidth, window.innerHeight);
    }

    if (this.isFullScreen) {
        this.container.style.left = this.container.style.top = 0;
    }
    this.setVideoUIState();
    this.positionControls();
}

WEVR.Player.prototype.fullScreen = function() {

    var canvas = this.container.parentElement;

    if (! this.isFullScreen){
        this.isFullScreen = true;
        if (canvas.requestFullscreen) {
            canvas.requestFullscreen();
        } else if (canvas.mozRequestFullScreen) {
            canvas.mozRequestFullScreen(); // Firefox
        } else if (canvas.webkitRequestFullscreen) {
            canvas.webkitRequestFullscreen(); // Chrome and Safari
        }
        if (!this.isPlaying) {
            this.play();
        }

    } else {
        this.isFullScreen = false;
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ( document.mozCancelFullScreen ) {
            document.mozCancelFullScreen();
        } else {
            document.webkitExitFullscreen();
        }
    }
}

WEVR.Player.prototype.onFullScreenChanged = function() {

    if ( !document.mozFullscreenElement && !document.webkitFullscreenElement ) {
        this.isFullScreen = false;
    }
    else {
        this.isFullScreen = true;
    }

    this.refreshSize();

}

//Utils
Util = {};
Util.isIOS = function() {
    return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

Util.isAndroid = function() {
    var returnVal =  /Android/g.test(navigator.userAgent);
    return returnVal
};

Util.isMobile = function(){
    return Util.isIOS() || Util.isAndroid();
}

Util.getScreenWidth = function() {
    return Math.max(window.screen.width, window.screen.height) *
        window.devicePixelRatio;
};

Util.getScreenHeight = function() {
    return Math.min(window.screen.width, window.screen.height) *
        window.devicePixelRatio;
};

Util.isIFrame = function() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
};

Util.isMSEdge = function() {
   return new RegExp("Edge").exec(navigator.userAgent) != null;
}

Util.isIE = function(){
   return ((navigator.appName == 'Microsoft Internet Explorer') ||
        ((navigator.appName == 'Mozilla' || navigator.appName == 'Netscape') && (new RegExp("Trident").exec(navigator.userAgent) != null)));
}

