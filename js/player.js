WEVR.Player = function(params) {
    this.isFullScreen = false;
	this.container = params.container;
    this.src = params.src;
    this.isPlaying = false;
    this.isFirstTimePlay = true;
    this.isMouseOverControls = false; //only on Desktop
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
        //Hack: Pointer back to the player so that the video can be paused on orientation change
        this.vrManager.player = this;
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
    //prior value:90
    var camera = new THREE.PerspectiveCamera( verticalFov, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z =  .001;
	scene.add(camera);

    var initialPlayState =false;
    this.isPlaying =  initialPlayState;

    var video = document.getElementById('video');

  	// Create a video texture for playing the movie
    /*var video = document.createElement('video'); //This fails on Safari. the video needs to be added as a tag, not programmatically
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

    var playIconSize = Util.isMobile() ? 90 : 50;

//create Loading Icon
    this.waitIcon = document.createElement("div");
    this.waitIcon.classList.add("btnWait");
    this.waitIcon.title = "Loading...";

    this.waitIcon = document.createElement("span");
    this.waitIcon.classList.add( 'icon-wait');
    this.waitIconImage =this.loadIcon("Icon-Wait.svg", 160, 160 ) ;
    this.waitIcon.appendChild(this.waitIconImage);
    playerControls.appendChild(this.waitIcon);


//create Play Button
    this.playButton = document.createElement("div");
    this.playButton.classList.add("btnPlay");
    this.playButton.title = "Play/Pause video";
    this.playButton.setAttribute("id", "play_button");

    this.playButtonIcon = document.createElement("span");
    this.playButtonIcon.classList.add( 'icon-play');
    this.playImage =this.loadIcon("Icon-Play.svg", playIconSize, playIconSize ) ;
    this.playButtonIcon.appendChild(this.playImage);
    this.pauseImage =this.loadIcon("Icon-Pause.svg", playIconSize, playIconSize) ;
    this.playButtonIcon.appendChild(this.pauseImage);
    this.playButton.appendChild(this.playButtonIcon);
    playerControls.appendChild(this.playButton);



//create Progress Bar
    this.scrubberBar = document.createElement("div"); //Adds a parent that is thicker than the children
    this.scrubberBar.classList.add( Util.isMobile() ? "scrubber-bar-mobile" : "scrubber-bar");

    this.progressBar = document.createElement("div");
    this.progressBar.classList.add( Util.isMobile() ? "progress-bar-mobile" : "progress-bar");
    this.scrubberBarWidth = playerControls.offsetWidth - 160;//Util.isMobile() ? 50 : 200;
    this.scrubberBar.style.width = this.scrubberBarWidth +"px";
    var progress = document.createElement("div");
    //progress.width = this.scrubberBarWidth;
    progress.classList.add( Util.isMobile() ? "progress-mobile" : "progress");
    this.progressBar.appendChild(progress);
    this.bufferBar = document.createElement("span");
    this.bufferBar.classList.add("bufferBar");
    progress.appendChild(this.bufferBar);
    this.timeBar = document.createElement("span");
    this.timeBar.classList.add("timeBar");
    progress.appendChild(this.timeBar);



/*    this.scrubber = document.createElement("span");
    this.scrubber.classList.add("scrubber");
    var scrubberImage = this.loadIcon("Icon-Scrubber.svg", 30, 30);
    this.scrubber.appendChild(scrubberImage);
    //this.scrubber.style.display = "none";
    progress.appendChild(this.scrubber);*/
    this.scrubberBar.appendChild(progress);
    playerControls.appendChild(this.scrubberBar);

    if (! Util.isMobile()) {
    //createMute Button
        var muteButton = document.createElement("div");
        muteButton.classList.add("sound", "sound2", "btn");
        muteButton.title = "Mute/Unmute sound";
        var muteButtonIcon = document.createElement("span");
        muteButtonIcon.classList.add(Util.isMobile() ? 'icon-sound-mobile' : "icon-sound");
        this.speakerImage = this.loadIcon("Icon-Volume.svg", 50, 50);
        muteButtonIcon.appendChild(this.speakerImage);
        this.muteImage = this.loadIcon("Icon-VolumeMute.svg", 50, 50);
        muteButtonIcon.appendChild(this.muteImage);
        this.muteImage.style.display = "none";
        muteButton.appendChild(muteButtonIcon);
        playerControls.appendChild(muteButton);
    }


    if (this.vrManager) {
        //create cardboard button
        this.cardboardButton = document.createElement("div");
        this.cardboardButton.classList.add("btnCardboard", "btn");
        this.cardboardButton.title = "Switch to Google Cardboard VR";
        var cardboardButtonIcon = document.createElement("span");
        var image = this.loadIcon("Icon-Goggles.svg", 50, 50);
        cardboardButtonIcon.appendChild(image);
        this.cardboardButton.appendChild(cardboardButtonIcon);
        playerControls.appendChild(this.cardboardButton);
    }

    //create close "X" button
    if (Util.isMobile()) {
        this.closeButton = document.createElement("div");
        this.closeButton.classList.add( "closebtn-mobile", "btn");
        var closeButtonIcon = document.createElement("span");
        closeButtonIcon.classList.add( "icon-fullscreen");
        this.closeImage =this.loadIcon( "Icon-X_close.svg", 50,50) ;
        closeButtonIcon.appendChild(this.closeImage);
        this.closeButton.style.display ="none";
        this.closeButton.appendChild(closeButtonIcon);
        playerControls.appendChild(this.closeButton);
    }


//create full-screen button
    if (! Util.isMobile()) {
        var fullScreenButton = document.createElement("div");
        fullScreenButton.classList.add( "btnFS", "btn");
        fullScreenButton.title = "Switch to full screen";
        var fullScreenButtonIcon = document.createElement("span");
        fullScreenButtonIcon.classList.add("icon-fullscreen");
        this.fullScreenImage = this.loadIcon("Icon-Enlarge.svg", 50, 50);
        fullScreenButtonIcon.appendChild(this.fullScreenImage);
        this.collapseFullScreenImage = this.loadIcon("Icon-Shrink.svg", 50, 50);
        fullScreenButtonIcon.appendChild(this.collapseFullScreenImage);
        this.collapseFullScreenImage.style.display = "none";
        fullScreenButton.appendChild(fullScreenButtonIcon);
        playerControls.appendChild(fullScreenButton);
    }

    this.controlsWidth = playerControls.offsetWidth;

    //create centered Replay Button
    this.replayMiddleButton = document.createElement("div");
    this.replayMiddleButton.style.display = "none";
    this.replayMiddleButton.classList.add("replayMiddleButton", "btn");
    this.replayMiddleButton.title = "Replay video";
    this.replayMiddleButton.setAttribute("id", "replay_middle_button");

    var replayMiddleButtonIcon = document.createElement("span");
    replayMiddleButtonIcon.classList.add('icon-replay-middle');
    image =this.loadIcon("Icon-Replay.svg", 90, 90 ) ;
    replayMiddleButtonIcon.appendChild(image);
    this.replayMiddleButton.appendChild(replayMiddleButtonIcon);

    playerControls.appendChild(this.replayMiddleButton);

    var that = this;

    if ( ! Util.isMobile() ) {
        var lowerScreenHotspot = document.getElementById("lowerScreen");
        lowerScreenHotspot.addEventListener("mouseover", function () {
            that.isMouseOverControls = true;
            that.setVideoUIState();
        });

        lowerScreenHotspot.addEventListener("mouseout", function () {
            that.isMouseOverControls = false;
            that.setVideoUIState();
        });
    }


    var clickPlay =function() {
        if (that.video.paused == true) {
            //Note: we keep track of our intent to play instead of querying video.isPlaying,
            //  which may return false while it is buffering, but we want the buttons to
            //  show that as far as the user is concerned, it is in 'play' mode (either playing
            //  or about to play)
            that.isPlaying = true;
            //go full screen if we are not already fullscreen
            if (Util.isAndroid() && ! that.isFullScreen) {
                that.setFullScreen();
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
        that.pauseImage.style.display = "block";
        // Play the video
        that.video.play();
        that.replayMiddleButton.style.display = "none";
    }

    // Event listener for the play/pause buttons
    this.playButton.addEventListener("click", clickPlay);

    if (this.replayMiddleButton) {
        this.replayMiddleButton.addEventListener("click", clickReplay);
    }

    // Event listener for the mute button
    if (muteButton) {
        muteButton.addEventListener("click", function () {
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
    }

    if (this.cardboardButton) {
        // Event listener for the mute button
        this.cardboardButton.addEventListener("click", function () {
            that.vrManager.setVRMode_();
           //that.fullScreen();
            that.setVideoUIState();
        });
    }

    // Event listener for the full-screen button
    if (fullScreenButton) {
        fullScreenButton.addEventListener("click", function () {
            if (that.vrManager) {
                if (that.vrManager.isVRMode()) {
                    that.vrManager.setNormalMode_();
                } else {
                    that.vrManager.onFSClick_();
                    if (that.vrManager.isFullscreenMode()) {
                        //that.isFullScreen = true;
                        that.fullScreen();
                    }
                }
            } else {
                that.fullScreen();

            }
            that.setVideoUIState();
            that.positionControls();
        });
    }

    if (this.closeButton) {
        // Event listener for the mute button
        this.closeButton.addEventListener("click", function () {
            that.vrManager.setNormalMode_();

            that.setVideoUIState();
        });
    }

    // Event listeners for scrubbing
    var timeDrag = false;

    this.scrubberBar.addEventListener('mouseup', function(e) {

        timeDrag = false;
        updatebar(e.pageX);
        if (that.video.currentTime <= that.video.duration - 1) { //we are one second from the end
            if (that.replayMiddleButton) {
                that.replayMiddleButton.style.display = "none";
            }
        }

    });
    this.scrubberBar.addEventListener('mousemove', function(e) {
        if(timeDrag) {
            that.isPlaying = false;
           // Pause the video
           that.video.pause();
            updatebar(e.pageX);
        }
    });

    if (Util.isMobile()) {
        this.scrubberBar.addEventListener('touchend', function(e) {
            timeDrag = false;
            that.updateAfterDrag= true;
            if (e.changedTouches && e.changedTouches.length) {
                updatebar(e.changedTouches[0].pageX);
                if (that.video.currentTime <= that.video.duration - 1) { //we are one second from the end
                    if (that.replayMiddleButton) {
                        that.replayMiddleButton.style.display = "none";
                    }
                }
            }
        });

    }

    var updatebar = function(x) {

        that.isInitialBuffering = true;
        that.setVideoUIState();

        //calculate drag position
        //and update video currenttime
        //as well as progress bar
        var maxduration = that.video.duration;

        var timeBarStartX = that.scrubberBar.offsetParent.offsetLeft + that.scrubberBar.offsetLeft + 10;//padding is 10px
        var timeBarEndX  =  that.scrubberBarWidth;

        var percentage = 100 * ( x - timeBarStartX) / timeBarEndX;

        if (percentage > 100) {
            percentage = 100;
        }
        if (percentage < 0) {
            percentage = 0;
        }
        if (percentage > 99) {
            that.setVideoUIState();
        }

        if (! timeDrag) {
          that.video.currentTime = maxduration * percentage / 100;
       }
        that.timeBar.style.width =  ((maxduration * percentage / 100) / that.video.duration) *that.scrubberBarWidth + "px";

    };


    // Update the scrubber bar as the video plays
    this.video.addEventListener("timeupdate", function() {
        if (that.isInitialBuffering) {
            that.isInitialBuffering = false;
            that.setVideoUIState();
        }
        if (Util.isMobile() && that.updateAfterDrag ) {

            if (!that.scrubberTimeout ) {
                that.scrubberTimeout = setTimeout(function () {
                    var playerControls = document.getElementById("player_controls");
                    playerControls.style.display = "none";
                }, 5000);
            }
            that.updateAfterDrag = false;
        }

        if (that.video.currentTime > that.video.duration - 1){ //within 1 sec of the end
            that.setVideoUIState();
        }
        that.timeBar.style.width =  (that.video.currentTime / that.video.duration) *that.scrubberBarWidth + "px";

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

    this.video.addEventListener("canplaythrough", function () { //on Android, this doesn't get fired after a position change
        that.isInitialBuffering = false;
        that.setVideoUIState();
    }, false);



    var container = document.getElementById("container");
    container.addEventListener( "click" , function() {
        var playerControls = document.getElementById("player_controls");
        if ( ! Util.isMobile() ) {
            if ( !that.isPlaying )   {
                playerControls.style.display = "block";
            }
        } else {
            playerControls.style.display = "block";
        }
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

WEVR.Player.prototype.updateScrubberBarWidth = function() {
    this.scrubberBar.style.width = this.scrubberBarWidth +"px";

    this.timeBar.style.width =(this.video.currentTime / this.video.duration) *this.scrubberBarWidth + "px";
}

WEVR.Player.prototype.play = function() {
    this.isPlaying = true;

    // Play the video
    this.video.play();
    this.setVideoUIState();
}

WEVR.Player.prototype.pause = function(){
    this.isPlaying = false;
    // Pause the video
    this.video.pause();

    this.setVideoUIState();
}

// Positioning logic to center the playback controls
WEVR.Player.prototype.positionControls = function(){

 // Playback controls
    var playerControls = document.getElementById("player_controls");

    var width = this.container.offsetWidth;

    this.scrubberBarWidth = playerControls.offsetWidth - (Util.isMobile() ? 76 : 210);
    this.scrubberBar.style.width = this.scrubberBarWidth +"px";

    if ( Util.isMobile() ) {
        var pwidth = 90;
        var left = (width - pwidth) / 2;
        var height = this.container.offsetHeight;
        var pheight = 55;
        var top = (height - pheight) / 2;
        this.playButton.style.left = left + "px";
        this.playButton.style.top = top + "px";
    }

    var pwidth = 160;
    var left = (width - pwidth) / 2;
    var height = this.container.offsetHeight;
    var pheight = 125;
    var top = (height - pheight) / 2;
    this.waitIcon.style.top = top +"px";
    this.waitIcon.style.left = left + "px";

    //centered play button
   // var centeredPlayButton = document.getElementById("centered_play_button");
    var pwidth = 90;
    left = (width - pwidth) / 2;

    this.replayMiddleButton.style.left = left + "px";
    var height = this.container.offsetHeight;
    var pheight = 55;
    var top = (height - pheight) / 2;
    this.replayMiddleButton.style.top = top + "px";



}

WEVR.Player.prototype.setVideoUIState = function(){
    //alert("setVideoUIState: isPlaying = " + this.isPlaying)
    if (this.scrubberTimeout) {
        clearTimeout(this.scrubberTimeout);
        this.scrubberTimeout = null;
    }
    var playerControls = document.getElementById("player_controls");

    if (this.isInitialBuffering){
        this.waitIcon.style.display = "block";
        this.playImage.style.display = "none";
        this.pauseImage.style.display = "none";
        //To keep the embedded iFrame clean on mobile, don't show the progressBar at first
        if (Util.isMobile() ){
            this.progressBar.style.display = "none";
        }
        return;
    } else {
        //More logic to keep the embedded iFrame clean on mobile
        if (Util.isMobile()) {
            if (this.isPlaying && !this.isFirstTimePlay) {
                this.progressBar.style.display = "block";
                this.isFirstTimePlay = false;
            } else if (Util.isMobile() && !this.isFullScreen) {
                this.progressBar.style.display = "none";
            } else if (Util.isMobile() && this.isFullScreen) {
                this.progressBar.style.display = "block";
            }
        }
    }
    this.waitIcon.style.display = "none";
    if (this.video.currentTime > this.video.duration - 1){ //we are one second from the end
        if (this.replayMiddleButton ){
            this.replayMiddleButton.style.display = "block";
            this.playImage.style.display = "none";
            this.pauseImage.style.display = "none";
        }

        this.isPlaying = false;
    }
     if (this.isPlaying ) {
         this.playImage.style.display = "none";
         this.waitIcon.style.display = "none";
         this.pauseImage.style.display = "block";

         if (this.replayMiddleButton){
             this.replayMiddleButton.style.display = "none";
         }

         this.scrubberTimeout = setTimeout( function() {
             var playerControls = document.getElementById("player_controls");
             playerControls.style.display = "none";
         }, 5000);

    } else {
         if (! (this.video.currentTime > this.video.duration - 1)) { //show it unless the replay button is already up
             this.playImage.style.display = "block";
         }
         this.pauseImage.style.display = "none";

         playerControls.style.display = "block";
    }
    if (this.isMouseOverControls) {
        playerControls.style.display = "block";
    }
    if ( ! this.isFullScreen) {
        if(this.collapseFullScreenImage) {
            this.collapseFullScreenImage.style.display = "none";
        }
        if ( this.closeButton ) {
            this.closeButton.style.display = "none";
        }
        if (this.fullScreenImage) {
            this.fullScreenImage.style.display = "block";
        }
    } else {
        if ( !Util.isMobile() ) {
            this.collapseFullScreenImage.style.display = "block";
            this.fullScreenImage.style.display = "none";
        }
        if ( this.closeButton ) {
            this.closeButton.style.display = "block";
        }
        if (this.vrManager){
            if ( this.vrManager.isVRMode()) {

                this.cardboardButton.style.display = "none";
            } else {

                this.cardboardButton.style.display = "block";
            }
        }
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
        this.camera.aspect = window.innerWidth / window.innerHeight;
    } else {
        this.renderer.setSize(fullWidth, window.innerHeight);
        this.camera.aspect = fullWidth / window.innerHeight;
    }
    this.camera.updateProjectionMatrix( );

    if (this.isFullScreen) {
        this.container.style.left = this.container.style.top = 0;
    }
    this.setVideoUIState();
    this.positionControls();
    this.updateScrubberBarWidth();
}

WEVR.Player.prototype.fullScreen = function() {

    if (! this.isFullScreen){
       this.setFullScreen();
       /* if (!this.isPlaying) {
            this.play();
        }*/

    } else {
       this.unsetFullScreen();
    }
}

WEVR.Player.prototype.setFullScreen = function() {
    this.isFullScreen = true;
    var canvas = this.container.parentElement;

    if (canvas.requestFullscreen) {
        canvas.requestFullscreen();
    } else if (canvas.mozRequestFullScreen) {
        canvas.mozRequestFullScreen(); // Firefox
    } else if (canvas.webkitRequestFullscreen) {
        canvas.webkitRequestFullscreen(); // Chrome and Safari
    }
}

WEVR.Player.prototype.unsetFullScreen = function(){
    this.isFullScreen = false;
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if ( document.mozCancelFullScreen ) {
        document.mozCancelFullScreen();
    } else {
        document.webkitExitFullscreen();
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

