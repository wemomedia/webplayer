WEVR.Player = function(params) {
    this.fullscreen = false;
	this.container = params.container;
    this.src = params.src;
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
    camera.position.z = .001;
	scene.add(camera);

	// Create a video texture for playing the movie
    var video = document.createElement('video');
    video.autoplay = true;
    video.src = this.src;
    video.crossOrigin = "anonymous";
    this.video = video;

	var texture = new THREE.VideoTexture( video );
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.format = THREE.RGBFormat;        

    // 
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
