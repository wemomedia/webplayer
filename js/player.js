WEVR.Player = function(params) {
    this.fullscreen = false;
	this.container = params.container;
    this.src = params.src;
    this.isPlaying = false;
    this.initThreeJS();
    this.initScene();
    this.initControls();
    this.run();
}

WEVR.Player.prototype = new Object;

WEVR.Player.prototype.initThreeJS = function() {
	// Create the Three.js renderer and attach it to our container
    this.renderer = new THREE.WebGLRenderer( { antialias: true} );

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    // Set the viewport size
    this.container.appendChild(this.renderer.domElement);

    this.canvas = this.renderer.domElement;

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

	// Create a video texture for playing the movie
    var video = document.createElement('video');
    video.autoplay = false;
    video.src = this.src;
    video.crossOrigin = "anonymous";
    this.video = video;

    var texture = new THREE.VideoTexture( video );
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.format = THREE.RGBFormat;

    var material = new THREE.MeshBasicMaterial({ map: texture, side:THREE.DoubleSide });

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
    var playBtmControl = document.createElement("div");
    playBtmControl.classList.add("btmControl");

//create Play Button
    var playButton = document.createElement("div");
    playButton.classList.add("btnPlay", "btn");
    playButton.title = "Play/Pause video";
    playButton.setAttribute("id", "play_button");

    this.playButtonIcon = document.createElement("span");
    this.playButtonIcon.classList.add('icon-play');
    playButton.appendChild(this.playButtonIcon);
    playBtmControl.appendChild(playButton);


//create Progress Bar
    this.progressBar = document.createElement("div");
    this.progressBar.classList.add("progress-bar");
    var progress = document.createElement("div");
    progress.classList.add("progress");
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
    muteButtonIcon.classList.add("icon-sound");
    muteButton.appendChild(muteButtonIcon);
    playBtmControl.appendChild(muteButton);


//create full-screen button
    var fullScreenButton = document.createElement("div");
    fullScreenButton.classList.add("btnFS", "btn");
    fullScreenButton.title = "Switch to full screen";
    var fullScreenButtonIcon = document.createElement("span");
    fullScreenButtonIcon.classList.add("icon-fullscreen");
    fullScreenButton.appendChild(fullScreenButtonIcon);
    playBtmControl.appendChild(fullScreenButton);

    playerControls.appendChild(playBtmControl);



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

    var that = this;

    var clickPlay =function() {
        if (that.video.paused == true) {
            //Note: we keep track of our intent to play instead of querying video.isPlaying,
            //  which may return false while it is buffering, but we want the buttons to
            //  show that as far as the user is concerned, it is in 'play' mode (either playing
            //  or about to play)
            that.isPlaying = true;
            // Play the video
            that.video.play();
        } else {
            that.isPlaying = false;
            // Pause the video
            that.video.pause();
        }
        that.setVideoUIState();

    }

    // Event listener for the play/pause buttons
    playButton.addEventListener("click", clickPlay);

    this.playMiddleButton.addEventListener("click", clickPlay);

    // Event listener for the mute button
    muteButton.addEventListener("click", function() {
        if (that.video.muted == false) {
            // Mute the video
            that.video.muted = true;

            var muteelts = muteButton.getElementsByClassName('icon-sound');
            muteelts[0].classList.add('muted');
        } else {
            // Unmute the video
            that.video.muted = false;

            var muteelts = muteButton.getElementsByClassName('icon-sound');
            muteelts[0].classList.remove('muted');
        }
    });

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
        var position = x - (that.progressBar.offsetParent.offsetLeft + that.progressBar.offsetLeft);
        var percentage = 100 * position / that.progressBar.offsetWidth;
        if (percentage > 100) {
            percentage = 100;
        }
        if (percentage < 0) {
            percentage = 0;
        }
        that.timeBar.style.width = percentage + '%';
        that.video.currentTime = maxduration * percentage / 100;
    };

    // Update the scrubber bar as the video plays
    this.video.addEventListener("timeupdate", function() {
        // Calculate the slider value
        var value = (100 / that.video.duration) * that.video.currentTime;

        // Update the slider value
        /* N.B.: OLD -- TP
         seekBar.value = value;
         */
        that.timeBar.style.width = 240 * (that.video.currentTime / that.video.duration) + "px";
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


    // Event listener for the full-screen button
    fullScreenButton.addEventListener("click", function() {
        that.fullScreen();
    });
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
    var cwidth = controls.offsetWidth;
    var left = (width - cwidth) / 2;
    controls.style.left = left + "px";

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

     if (this.isPlaying == true) {
        this.playButtonIcon.classList.add('icon-pause');
         this.playButtonIcon.classList.remove('icon-play');
         this.playMiddleButton.style.display = "none";
    } else {
         this.playButtonIcon.classList.add('icon-play');
         this.playButtonIcon.classList.remove('icon-pause');
         this.playMiddleButton.style.display = "block";
    }
}

WEVR.Player.prototype.initControls = function() {
			
	var controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
	controls.zoomSpeed = 0;

	this.controls = controls;
}

WEVR.Player.prototype.run = function(time) {

	var that = this;
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

	this.renderer.render(this.scene, this.camera);

}

WEVR.Player.prototype.refreshSize = function() {

	var fullWidth = this.fullscreen ? window.innerWidth : this.container.clientWidth,
        fullHeight = this.fullscreen ? window.innerHeight : this.container.clientHeight;

	this.renderer.setSize(fullWidth, fullHeight);

    if (this.fullscreen) {
        this.container.style.left = this.container.style.top = 0;
    }
}

WEVR.Player.prototype.fullScreen = function() {

    var canvas = this.container.parentElement;

    if (canvas.requestFullscreen) {
        canvas.requestFullscreen();
    } else if (canvas.mozRequestFullScreen) {
        canvas.mozRequestFullScreen(); // Firefox
    } else if (canvas.webkitRequestFullscreen) {
        canvas.webkitRequestFullscreen(); // Chrome and Safari
    }
}

WEVR.Player.prototype.onFullScreenChanged = function() {

    if ( !document.mozFullscreenElement && !document.webkitFullscreenElement ) {
        this.fullscreen = false;
    }
    else {
        this.fullscreen = true;
    }

    if (this.fullscreen) {
        this.refreshSize();
    }
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


Util.isIFrame = function() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
};


