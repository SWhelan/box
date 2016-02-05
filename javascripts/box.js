var container = document.getElementById("canvasContainer");
var camera;
var controls;
var scene;
var renderer;
var plane;

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var offset = new THREE.Vector3();
var INTERSECTED;
var SELECTED;

var pieces = [];
var edges = [];
var NUM_PIECES = 11;

var loader = new THREE.JSONLoader();
for(var i = 1; i <= NUM_PIECES; i++){
    loader.load('pieces/json/' + i + '.json', function (geometry){
        geometry.rotateY(Math.PI);
        var mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff }));
        mesh.scale.set(10, 10, 10);
        mesh.position.y = 0;
        mesh.position.x = 0;
        mesh.position.z = 0;
        edges.push(new THREE.EdgesHelper(mesh , 0x000000));
        pieces.push(mesh);
        if(pieces.length == NUM_PIECES){
            init();
            animate();
        }
    });
}

function init(){
    addCamera();
    addScene();    
    addLight();
    addPieces();
    addPlane();
    addRenderer();
    addEventListeners();
}

/*
 * Most of the scene generation and event handlers are from:
 * http://threejs.org/examples/#webgl_interactive_draggablecubes
 */
 
function addCamera(){
    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 100;
    camera.position.y = 40;
    controls = new THREE.TrackballControls(camera, container);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.2;
}

function addScene(){
    scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x505050));
}

function addLight(){
    var light = new THREE.SpotLight(0xffffff, 1.5);
    light.position.set(0, 500, 2000);
    light.castShadow = true;
    light.shadowCameraNear = 200;
    light.shadowCameraFar = camera.far;
    light.shadowCameraFov = 50;
    light.shadowBias = -0.00022;
    light.shadowMapWidth = 2048;
    light.shadowMapHeight = 2048;
    scene.add(light);
}

function addPieces(){
    for(var i = 0; i < NUM_PIECES; i++){
        scene.add(pieces[i]);
        scene.add(edges[i]);
    }
}

function addPlane(){
    plane = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(2000, 2000, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(plane);
}

function addRenderer(){
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xf0f0f0);
    renderer.setPixelRatio(window.devicePixelRatio);
	setRendererSize();
    renderer.sortObjects = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
}

function setRendererSize(){
	if(container.className == "smaller"){
		renderer.setSize((window.innerWidth - 10)* .6, (window.innerHeight  - 10)* .6);
	} else {
		renderer.setSize(window.innerWidth - 10, window.innerHeight - 10);
	}
}

function addEventListeners(){
    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);
    renderer.domElement.addEventListener("touchstart", touchHandler, true);
    renderer.domElement.addEventListener("touchmove", touchHandler, true);
    renderer.domElement.addEventListener("touchend", touchHandler, true);
    renderer.domElement.addEventListener("touchcancel", touchHandler, true);    
    window.addEventListener('resize', onWindowResize, false);
}

/* 
 * Event Handlers
 */ 
function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    setRendererSize();
}

function onDocumentMouseMove(event){
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (SELECTED){
        var intersects = raycaster.intersectObject(plane);
        if (intersects.length > 0){
            SELECTED.position.copy(intersects[ 0 ].point.sub(offset));
        }
        return;
    }
    var intersects = raycaster.intersectObjects(pieces);
    if (intersects.length > 0){
        if (INTERSECTED != intersects[ 0 ].object){
            if (INTERSECTED){ 
                INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
            }
            INTERSECTED = intersects[ 0 ].object;
            INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
            plane.position.copy(INTERSECTED.position);
            plane.lookAt(camera.position);
        }
        container.style.cursor = 'pointer';
    } else {
        if (INTERSECTED){
            INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        }
        INTERSECTED = null;
        container.style.cursor = 'auto';
    }
}

function onDocumentMouseDown(event){
    event.preventDefault();
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(pieces);
    if (intersects.length > 0){
        controls.enabled = false;
        SELECTED = null;
        SELECTED = intersects[ 0 ].object;
        var intersects = raycaster.intersectObject(plane);
        if (intersects.length > 0){
            offset.copy(intersects[ 0 ].point).sub(plane.position);
        }
        container.style.cursor = 'move';
    }
}

function onDocumentMouseUp(event){
    event.preventDefault();
    controls.enabled = true;
    if (INTERSECTED){
        plane.position.copy(INTERSECTED.position);
    }
    SELECTED = null;
    INTERSECTED = null;
    container.style.cursor = 'auto';
}

/*
 * An attempt at getting touch events from:
 * http://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events
 */
 function touchHandler(event){
    var touches = event.changedTouches;
    var first = touches[0];
    var type = "";
    switch(event.type){
        case "touchstart":
            type = "mousedown";
            break;
        case "touchmove":
            type = "mousemove";
            break;        
        case "touchend":
        
        default:
            type = "mouseup";
            break;
            
    }

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                  first.screenX, first.screenY, 
                                  first.clientX, first.clientY, false, 
                                  false, false, false, 0/*left*/, null);

    first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
}

/*
 * Animation and Rendering Loops
 */
function animate(){
    requestAnimationFrame(animate);
    render();
}

function render(){
    controls.update();
    renderer.render(scene, camera);
}