//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// BasicShapes.js  MODIFIED for EECS 351-1,
//									Northwestern Univ. Jack Tumblin
//		--converted from 2D to 4D (x,y,z,w) vertices
//		--show how to extend to other attributes: color, surface normal, etc.
//		--demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO).
//		--create several canonical 3D shapes borrowed from 'GLUT' library:
//		--Demonstrate how to make a 'stepped spiral' tri-strip,
//					('Method 2' in the lecture notes) and use it to build a cylinder,
//					a sphere, and a torus.
//		--Demonstrate how to make a 'degenerate stepped spiral' tri-strip
//					('Method 3' in the lecture notes) and use it to build a cylinder,
//					a sphere, and a torus.
//
// 2015.05.28 J.Tumblin:
//		--Make 'gl' and 'canvas' into global vars; drop it from fcn argument lists.
//		--Revise to make tri-strip shapes with RIGHT-handed winding(not left)
//		--extend attributes: add surface normal & texture coords

//		--Improve object-oriented design:
//				--CWebGL (holds ALL current globals, animation, etc.) and holds:
//				--CVertBuf manages a vertex buffer object, holds its ID, specifies
//					how data was arranged; holds locations/IDs for buffer, uniforms,
//					and attributes used to access it...
//				--CShape object prototype; holds Javascript array of verts used by
//					the CVertBuf object, etc.
//				--Demonstrate how to use more than one CVertBuf object for drawing...
//	--JACK: COMPARE THIS TO-- Toji Webbook's basic classes
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE =
	'uniform mat4 u_ModelMatrix;\n' +
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Color;\n' +
	'varying vec4 v_Color;\n' +
	'void main() {\n' +
	'  gl_Position = u_ModelMatrix * a_Position;\n' +
	'  gl_PointSize = 10.0;\n' +
	'  v_Color = a_Color;\n' +
	'}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
//  '#ifdef GL_ES\n' +
	'precision mediump float;\n' +
	//  '#endif GL_ES\n' +
	'varying vec4 v_Color;\n' +
	'void main() {\n' +
	'  gl_FragColor = v_Color;\n' +
	'}\n';

// --------------------- Eye positions -----------------------------------
var g_EyeX = -0.5, g_EyeY = 8.6, g_EyeZ = 1; // Eye position
var forward = 0.5;
var sideway = 0.3;
var theta = -3.14;
var turn_height = 0;

// --------------------- Global Variables----------------------------------
var canvas;		// main() sets this to the HTML-5 'canvas' element used for WebGL.
var gl;				// main() sets this to the rendering context for WebGL. This object
var g_canvas = document.getElementById('webgl');
// our HTML-5 canvas object that uses 'gl' for drawing.

// holds ALL webGL functions as its members; I make it global here because we
// nearly all our program's functions need it to make WebGL calls.  All those
// functions would need 'gl' as an argument if we didn't make it a global var.


// --------------------- Animation --------------------------------------
var ANGLE_STEP = 45.0;		// Rotation angle rate (degrees/second)
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
// (x,y,z,w)position + (r,g,b)color
// Later, see if you can add:
// (x,y,z) surface normal + (tx,ty) texture addr.
var currentAngle = 0.0;

var angle = 0;
var g_angleRate01 = 60;
var g_angle01 = 0;
var g_last_cylinder = Date.now();    // time when we last drew a picture
var g_last_rod = Date.now();
var g_last_robot = Date.now();
var g_last_upper_arm = Date.now();
var g_isRun = true;
var g_angleRateTmp = 0;
var g_angleRate02 = 40;
var g_angle02 = 0;
var g_angleRate03 = 60;
var g_angle03 = 0;
var g_angle04 = 0;
var g_angleRate04 = 30;

//------------For mouse click-and-drag: -------------------------------
var rodlength = 8;


// ---------------- for mouse drag activity --------------------------
var move_x = 0;
var move_y = 0;
var move_x2 = 0;
var move_y2 = 0;

// ---------------- for pyramid location ----------------------------
var pyramid_x = 2;
var pyramid_y = -2;

// ----------------- variable for quarternion ------------------------
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;

var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var qNew = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();				// rotation matrix, made from latest qTot

function main() {
//==============================================================================
	// Retrieve <canvas> element
	// Get the rendering context for WebGL
	var myGL = getWebGLContext(g_canvas);
	if (!myGL) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}
	gl = myGL;	// make it global--for every function to use.

	// Register the Keyboard & Mouse Event-handlers------------------------------
	// When users move, click or drag the mouse and when they press a key on the
	// keyboard the operating system create a simple text-based 'event' message.
	// Your Javascript program can respond to 'events' if you:
	// a) tell JavaScript to 'listen' for each event that should trigger an
	//   action within your program: call the 'addEventListener()' function, and
	// b) write your own 'event-handler' function for each of the user-triggered
	//    actions; Javascript's 'event-listener' will call your 'event-handler'
	//		function each time it 'hears' the triggering event from users.
	//
	// KEYBOARD:
	// The 'keyDown' and 'keyUp' events respond to ALL keys on the keyboard,
	//      including shift,alt,ctrl,arrow, pgUp, pgDn,f1,f2...f12 etc.
	window.addEventListener("keydown", myKeyDown, false);
	// After each 'keydown' event, call the 'myKeyDown()' function.  The 'false'
	// arg (default) ensures myKeyDown() call in 'bubbling', not 'capture' stage)
	// ( https://www.w3schools.com/jsref/met_document_addeventlistener.asp )
	// window.addEventListener("keyup", myKeyUp, false);
	// Called when user RELEASES the key.  Now rarely used...

	// MOUSE:
	// Create 'event listeners' for a few vital mouse events
	// (others events are available too... google it!).
	// window.addEventListener("mousedown", myMouseDown);
	// // (After each 'mousedown' event, browser calls the myMouseDown() fcn.)
	// window.addEventListener("mousemove", myMouseMove);
	// window.addEventListener("mouseup", myMouseUp);
	window.addEventListener("click", myMouseClick);
	window.addEventListener("dblclick", myMouseDblClick);

	g_canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, g_canvas) };
	// when user's mouse button goes down, call mouseDown() function
	g_canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, g_canvas) };
	// when the mouse moves, call mouseMove() function
	g_canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, g_canvas)};
	// Note that these 'event listeners' will respond to mouse click/drag
	// ANYWHERE, as long as you begin in the browser window 'client area'.
	// You can also make 'event listeners' that respond ONLY within an HTML-5
	// element or division. For example, to 'listen' for 'mouse click' only
	// within the HTML-5 canvas where we draw our WebGL results, try:
	// g_canvasID.addEventListener("click", myCanvasClick);
	//
	// Wait wait wait -- these 'mouse listeners' just NAME the function called
	// when the event occurs!   How do the functions get data about the event?
	//  ANSWER1:----- Look it up:
	//    All mouse-event handlers receive one unified 'mouse event' object:
	//	  https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
	//  ANSWER2:----- Investigate:
	// 		All Javascript functions have a built-in local variable/object named
	//    'argument'.  It holds an array of all values (if any) found in within
	//	   the parintheses used in the function call.
	//     DETAILS:  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
	// END Keyboard & Mouse Event-Handlers---------------------------------------

	// Initialize shaders
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to intialize shaders.');
		return;
	}
	//
	var n = initVertexBuffer(gl);
	if (n < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if (!u_ModelMatrix) {
		console.log('Failed to get the storage location of u_ModelMatrix');
		return;
	}
	// Create a local version of our model matrix in JavaScript
	var modelMatrix = new Matrix4();

	// NEW! -- make new canvas to fit the browser-window size;
	drawResize(gl, n, modelMatrix, u_ModelMatrix);   // On this first call, Chrome browser seems to use the
	// initial fixed canvas size we set in the HTML file;
	// But by default Chrome opens its browser at the same
	// size & location where you last closed it, so
	drawResize(gl, n, modelMatrix, u_ModelMatrix);   // Call drawResize() a SECOND time to re-size canvas to
	// match the current browser size.

	// Start drawing: create 'tick' variable whose value is this function:
	var tick = function() {
		currentAngle = animate(currentAngle);  // Update the rotation angle
		animate2();
		animate3();
		animate4();
		drawResize(gl, n, modelMatrix, u_ModelMatrix);
		// drawRobot(gl, n, currentAngle, 2 * currentAngle, modelMatrix, u_ModelMatrix);   // Draw shapes
		// report current angle on console
		//console.log('currentAngle=',currentAngle);
		document.getElementById('current-angle-top').innerHTML=
			'top current angle is '+ currentAngle.toFixed(5);
		document.getElementById('current-angle-robot').innerHTML=
			'robot current angle is '+ g_angle02.toFixed(5);
		// document.getElementById('Mouse').innerHTML=
		// 	'Mouse Drag totals (CVV coords):\t'+
		// 	g_xMdragTot.toFixed(5)+', \t'+g_yMdragTot.toFixed(5);
		requestAnimationFrame(tick, canvas);
		// Request that the browser re-draw the webpage
	};
	tick();							// start (and continue) animation: draw current image
}

function drawResize(gl, n, modelMatrix, u_ModelMatrix) {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	var nuCanvas = document.getElementById('webgl');	// get current canvas
	var nuGL = getWebGLContext(nuCanvas);							// and context:

	//Report our current browser-window contents:

	// console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);
	// console.log('Browser window: innerWidth,innerHeight=',
	// 	innerWidth, innerHeight);	// http://www.w3schools.com/jsref/obj_window.asp


	//Make canvas fill the top 3/4 of our browser window:
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*4/5;


	// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
	drawTwoView(gl, n, modelMatrix, u_ModelMatrix);
}

function drawTwoView(gl, n, modelMatrix, u_ModelMatrix) {
	// Specify the color for clearing <canvas>
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST);

	// Get handle to graphics system's storage location of u_ModelMatrix
	// var viewMatrix = new Matrix4();

	// store the view matrix and projection matrix
	// var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');

	// Create, init current rotation angle value in JavaScript
	var currentAnglePivot = 80;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var ratio = (innerWidth / 2) / innerHeight;
	gl.viewport(0, 0, g_canvas.width / 2, g_canvas.height);
	modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
	modelMatrix.perspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	modelMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);     // 'up' vector
	drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix);   // Draw shapes

	// ---------------------------- draw the second camera view
	var nearHeight = Math.tan(20 * 3.14 / 180);
	// console.log("height", nearHeight);
	var nearWidth = ratio * nearHeight;
	var scale = 13;
	gl.viewport(g_canvas.width / 2, 0, g_canvas.width / 2, g_canvas.height);
	modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
	modelMatrix.ortho(-nearWidth * scale, nearWidth * scale, -nearHeight * scale, nearHeight * scale, 1, 100);
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	modelMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);     // 'up' vector
	drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix); // Draw shapes
}

function drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
	drawTop(gl, n, currentAngle, 2 * currentAngle, modelMatrix, u_ModelMatrix);   // Draw shapes
	drawCube(gl, n, currentAngle, 2 * currentAngle, modelMatrix, u_ModelMatrix);
	drawPyramid(gl, n, currentAngle, u_ModelMatrix);
	drawCylinder(gl, n, modelMatrix, u_ModelMatrix);
	drawSphere(gl, n, modelMatrix, u_ModelMatrix);
	drawLine(gl, n, modelMatrix, u_ModelMatrix);
	drawRobot(gl, n, modelMatrix, u_ModelMatrix);
}


function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
		(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
		(canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);

	isDrag = true;											// set our mouse-dragging flag
	xMclik = x;													// record where mouse-dragging began
	yMclik = y;
};


function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

	if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
		(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
		(canvas.height/2);

	// find how far we dragged the mouse:
	xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
	yMdragTot += (y - yMclik);
	// AND use any mouse-dragging we found to update quaternions qNew and qTot.
	dragQuat(x - xMclik, y - yMclik);

	xMclik = x;													// Make NEXT drag-measurement from here.
	yMclik = y;

	// // Show it on our webpage, in the <div> element named 'MouseText':
	// document.getElementById('MouseText').innerHTML=
	// 	'Mouse Drag totals (CVV x,y coords):\t'+
	// 	xMdragTot.toFixed(5)+', \t'+
	// 	yMdragTot.toFixed(5);
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
		(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
		(canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);

	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
//	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);

	// AND use any mouse-dragging we found to update quaternions qNew and qTot;
	dragQuat(x - xMclik, y - yMclik);

	// Show it on our webpage, in the <div> element named 'MouseText':
	// document.getElementById('MouseText').innerHTML=
	// 	'Mouse Drag totals (CVV x,y coords):\t'+
	// 	xMdragTot.toFixed(5)+', \t'+
	// 	yMdragTot.toFixed(5);
};

function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
// We find a rotation axis perpendicular to the drag direction, and convert the
// drag distance to an angular rotation amount, and use both to set the value of
// the quaternion qNew.  We then combine this new rotation with the current
// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the
// 'draw()' function converts this current 'qTot' quaternion to a rotation
// matrix for drawing.

	var res = 5;
	var qTmp = new Quaternion(0,0,0,1);

	// distance vector
	var dist_x = g_EyeX - pyramid_x;
	var dist_y = g_EyeY - pyramid_y;
	var dist_z = g_EyeZ;
	console.log(dist_x, dist_y, dist_z);
	// * (0, 0, 1)
	var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
	// console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
	// a = (Math.sin(theta), Math.cos(theta), turn_height)
	// b = (x_drag, y_drag, 0)
	var x_1 = -dist_y;
	var y_1 = dist_x;
	var z_1 = 0;

	var x_2 = dist_z * dist_x;
	var y_2 = dist_z * dist_y;
	var z_2 = -dist_x * dist_x;

	// var quarternion1 = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
	// var quarternion2 = new Quaternion(0, 0, 0, 1);
	qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0, dist*150.0);
	// qNew.setFromAxisAngle(x_1 + 0.0001, y_1 + 0.0001, 0, dist*150.0);
	// (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
	// why axis (x,y,z) = (-yMdrag,+xMdrag,0)?
	// -- to rotate around +x axis, drag mouse in -y direction.
	// -- to rotate around +y axis, drag mouse in +x direction.

	qTmp.multiply(qNew,qTot);			// apply new rotation to current rotation.
	//--------------------------
	// IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
	// ANSWER: Because 'duality' governs ALL transformations, not just matrices.
	// If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
	// first by qTot, and then by qNew--we would apply mouse-dragging rotations
	// to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
	// rotations FIRST, before we apply rotations from all the previous dragging.
	//------------------------
	// IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store
	// them with finite precision. While the product of two (EXACTLY) unit-length
	// quaternions will always be another unit-length quaternion, the qTmp length
	// may drift away from 1.0 if we repeat this quaternion multiply many times.
	// A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
	// Matrix4.prototype.setFromQuat().
	qTot.normalize();						// normalize to ensure we stay at length==1.0.
	qTot.copy(qTmp);
	// show the new quaternion qTot on our webpage in the <div> element 'QuatValue'
	document.getElementById('QuatValue').innerHTML=
		'\t X=' +qTot.x.toFixed(res)+
		'i\t Y=' +qTot.y.toFixed(res)+
		'j\t Z=' +qTot.z.toFixed(res)+
		'k\t W=' +qTot.w.toFixed(res)+
		'<br>length='+qTot.length().toFixed(res);
};


function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.

	// Make each 3D shape in its own array of vertices:
	makeCylinder2();					// create, fill the cylVerts array
	makeSphere2();
	makePivot();// create, fill the sphVerts arra
	makeRod();// y
	makeGroundGrid();				// create, fill the gndVerts array
	makeCube();
	makeBody();
	makeArm2();
	makeLeg();
	makePyramid();
	makeAxis();

	// how many floats total needed to store all shapes?
	var mySiz = (cylVerts.length * 10 + sphVerts.length * 10 +
		gndVerts.length + cubeVerts1.length + bodyVerts.length + armVerts.length + rodVerts.length * 10);

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
	var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	cylStart = 0;							// we stored the cylinder first.
	for(i=0,j=0; j< cylVerts.length; i++,j++) {
		colorShapes[i] = cylVerts[j];
	}
	sphStart = i;						// next, we'll store the sphere;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	sphStart2 = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	sphStart3 = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	pivotStart = i;
	for(j=0; j< pivotVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = pivotVerts[j];
	}
	RodStart = i;
	for(j=0; j< rodVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = rodVerts[j];
	}
	sphStart4 = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	cylStart2 = i;
	for(j=0; j< cylVerts.length; i++,j++) {
		colorShapes[i] = cylVerts[j];
	}
	pivotStart2 = i;
	for(j=0; j< pivotVerts.length; i++,j++) {
		colorShapes[i] = pivotVerts[j];
	}
	RodStart2 = i;
	for(j=0; j< rodVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = rodVerts[j];
	}
	sphStart5 = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	sphStart6 = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	sphStart7 = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	sphStart8 = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
	}
	cubeStart1 = i;
	for(j=0; j< cubeVerts1.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = cubeVerts1[j];
	}
	bodyStart = i;
	for(j=0; j< bodyVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = bodyVerts[j];
	}
	armStart = i;
	for(j=0; j< armVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = armVerts[j];
	}
	legStart = i;
	for(j=0; j< legVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = legVerts[j];
	}
	RodStart3 = i;
	for(j=0; j< rodVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = rodVerts[j];
	}
	pyramidStart = i;
	for(j=0; j< pyramidShapes.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = pyramidShapes[j];
	}
	lineStart = i;
	for(j=0; j< lineColors.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = lineColors[j];
	}


	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
	}
	// Create a buffer object on the graphics hardware:
	var shapeBufferHandle = gl.createBuffer();
	if (!shapeBufferHandle) {
		console.log('Failed to create the shape buffer object');
		return false;
	}

	// Bind the the buffer object to target:
	gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
	// Transfer data from Javascript array colorShapes to Graphics system VBO
	// (Use sparingly--may be slow if you transfer large shapes stored in files)
	gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

	//Get graphics system's handle for our Vertex Shader's position-input variable:
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return -1;
	}

	var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

	// Use handle to specify how to retrieve **POSITION** data from our VBO:
	gl.vertexAttribPointer(
		a_Position, 	// choose Vertex Shader attribute to fill with data
		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
		false, 				// did we supply fixed-point data AND it needs normalizing?
		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
		// (x,y,z,w, r,g,b) * bytes/value
		0);						// Offset -- now many bytes from START of buffer to the
	// value we will actually use?
	gl.enableVertexAttribArray(a_Position);
	// Enable assignment of vertex buffer object's position data

	// Get graphics system's handle for our Vertex Shader's color-input variable;
	var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
	if(a_Color < 0) {
		console.log('Failed to get the storage location of a_Color');
		return -1;
	}
	// Use handle to specify how to retrieve **COLOR** data from our VBO:
	gl.vertexAttribPointer(
		a_Color, 				// choose Vertex Shader attribute to fill with data
		3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
		gl.FLOAT, 			// data type for each value: usually gl.FLOAT
		false, 					// did we supply fixed-point data AND it needs normalizing?
		FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
		// (x,y,z,w, r,g,b) * bytes/value
		FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
	// value we will actually use?  Need to skip over x,y,z,w

	gl.enableVertexAttribArray(a_Color);
	// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
	// Unbind the buffer object
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return nn;
}


function makeCube() {

	var height = 1;
	var width = 1;
	var length = 1;
	var node1Colr = new Float32Array([0.8, 0.8, 0.0]);	// light yellow top,
	var node2Colr = new Float32Array([0.9, 0.9, 0.1]);	// dark green walls,
	var node3Colr = new Float32Array([0.2, 0.3, 0.7]);	// light blue bottom,
	var node4Colr = new Float32Array([0.1, 0.1, 0.1]); // near black end-cap centers,
	var node5Colr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble color.

	// Create a (global) array to hold all of this cylinder's vertices;
	var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);

	cubeVerts1 = new Float32Array([
		// Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
		//		Apex on +z axis; equilateral triangle base at z=0

		// Node 0 0.3, 0.6, 0.7,
		// Node 1 0.8, 0.4, 1,
		// Node 2 0.8, 0.5, 0.4,
		// Node 3 0.7, 0.9, 0.1,
		// Node 4 0.9, 0, 0.3,
		// Node 5 0.3, 0.3, 1,
		// Node 6 1, 0.9, 0.2,
		// Node 7 0.9, 1, 0.9,
		// Node 8 0.8, 0.8, 0.7,




		// +x face: RED
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,		0.7, 0.9, 0.1,	// Node 3
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,		0, 1, 0,	// Node 2
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,  // Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	// Node 4
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	// Node 7
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3

		// +y face: GREEN
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1
		-1.0 * length,  1.0 * width, 1.0 * height, 1.0,	  0.3, 0.3, 1,	// Node 5
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.9, 0, 0.3,	// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	// Node 4
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	// Node 2
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1

		// +z face: BLUE
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	// Node 5
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 	0.9, 1, 0.9,	// Node 7

		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	// Node 7
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	// Node 4
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	// Node 5

		// -x face: CYAN
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	// Node 5
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1

		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	// Node 0
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6

		// -y face: MAGENTA
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	// Node 7
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6

		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 1, 0.9, 0.2,	// Node 6
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.3, 0.6, 0.7,	// Node 0
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3

		// -z face: YELLOW
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	 0, 1, 0,   // Node 2
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	// Node 0

		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.3, 0.6, 0.7,	// Node 0
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	// Node 2

	]);

}


function makeBody() {
	var height = 3;
	var width = 2;
	var length = 2;

	bodyVerts = new Float32Array([
		// Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
		//		Apex on +z axis; equilateral triangle base at z=0

		// Node 0 0.3, 0.6, 0.7,
		// Node 1 0.8, 0.4, 1,
		// Node 2 0.8, 0.5, 0.4,
		// Node 3 0.7, 0.9, 0.1,
		// Node 4 0.9, 0, 0.3,
		// Node 5 0.3, 0.3, 1,
		// Node 6 1, 0.9, 0.2,
		// Node 7 0.9, 1, 0.9,
		// Node 8 0.8, 0.8, 0.7,




		// +x face: RED
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,		0.7, 0.9, 0.1,	// Node 3
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,		0, 1, 0,	// Node 2
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,  // Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	// Node 4
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	// Node 7
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3

		// +y face: GREEN
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1
		-1.0 * length,  1.0 * width, 1.0 * height, 1.0,	  0.3, 0.3, 1,	// Node 5
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.9, 0, 0.3,	// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	// Node 4
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	// Node 2
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1

		// +z face: BLUE
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	// Node 5
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 	0.9, 1, 0.9,	// Node 7

		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	// Node 7
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	// Node 4
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	// Node 5

		// -x face: CYAN
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	// Node 5
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1

		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	// Node 0
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6

		// -y face: MAGENTA
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	// Node 7
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	// Node 6

		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 1, 0.9, 0.2,	// Node 6
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.3, 0.6, 0.7,	// Node 0
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3

		// -z face: YELLOW
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	 0, 1, 0,   // Node 2
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	// Node 3
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	// Node 0

		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.3, 0.6, 0.7,	// Node 0
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	// Node 1
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	// Node 2

	]);

}

function makeLeg() {
	// Create a (global) array to hold all of this cylinder's vertices;

	var height = 3;
	var width = 0.5;
	var length = 0.5;

	legVerts = new Float32Array([
		// Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
		//		Apex on +z axis; equilateral triangle base at z=0

		// node 0  0.8, 0.8, 0.8,
		// node 1  0.9, 0.7, 0.2,
		// node 2  0.3, 0, 0.4,
		// node 3  0.9, 0.9, 0.1
		// mode 4  0.6, 1, 1,
		// node 5  0.4, 0.6, 1,
		// node 6  0.8, 0.7, 0.7,


		// +x face: RED
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,		 0.9, 0.9, 0.1, // Node 3
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,		 0.3, 0, 0.4, 	// Node 2
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.6, 1, 1,  // Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.6, 1, 1,	// Node 4
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.1, 0.1, 1.0,	// Node 7
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	   0.9, 0.9, 0.1,	// Node 3

		// +y face: GREEN
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.9, 0.7, 0.2,	// Node 1
		-1.0 * length,  1.0 * width, 1.0 * height, 1.0,	  0.4, 0.6, 1,	// Node 5
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.6, 1, 1,	// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.6, 1, 1,	// Node 4
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0.3, 0, 0.4, 	// Node 2
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.9, 0.7, 0.2,	// Node 1

		// +z face: BLUE
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.4, 0.6, 1,	// Node 5
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8, 0.7, 0.7,	// Node 6
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.1, 0.1, 1.0,	// Node 7

		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.1, 0.1, 1.0,	// Node 7
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.6, 1, 1,	// Node 4
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.4, 0.6, 1,	// Node 5

		// -x face: CYAN
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8, 0.7, 0.7,	// Node 6
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.4, 0.6, 1,	// Node 5
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.9, 0.7, 0.2,	// Node 1

		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.9, 0.7, 0.2,	// Node 1
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8, 0.8, 0.8,	// Node 0
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8, 0.7, 0.7,	// Node 6

		// -y face: MAGENTA
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	   0.9, 0.9, 0.1,	// Node 3
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.1, 0.1, 1.0,	// Node 7
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8, 0.7, 0.7,	// Node 6

		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8, 0.7, 0.7,	// Node 6
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8, 0.8, 0.8,	// Node 0
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.9, 0.9, 0.1,	// Node 3

		// -z face: YELLOW
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0.3, 0, 0.4, 	// Node 2
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	   0.9, 0.9, 0.1,	// Node 3
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8, 0.8, 0.8,	// Node 0

		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8, 0.8, 0.8,	// Node 0
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.9, 0.7, 0.2,	// Node 1
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0.3, 0, 0.4, 	// Node 2

	]);
}


function makeArm2() {
	// Create a (global) array to hold all of this cylinder's vertices;

	var height = 1.4;
	var width = 0.3;
	var length = 0.3;

	armVerts = new Float32Array([
		// Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
		//		Apex on +z axis; equilateral triangle base at z=0

		// node 0  	0.8,0.4,0.7,
		// node 1	0.8,0.5,0.1,
		// node 2	0.8,0.5,0.6,
		// node 3	0.8,0.6,0,
		// node 4	0.8,0.6,0.5,
		// node 5	0.8,0.6,1,
		// node 6	0.8,0.7,0.4,
		// node 7	0.8,0.7,0.9,

		// +x face: RED
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,		0.8,0.6,0,	// Node 3
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,		0.8,0.5,0.6,	// Node 2
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.8,0.6,0.5,  // Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.8,0.6,0.5,	// Node 4
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8,0.7,0.9,	// Node 7
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8,0.6,0,	// Node 3

		// +y face: GREEN
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0,1,0,	// Node 1
		-1.0 * length,  1.0 * width, 1.0 * height, 1.0,	 0.8,0.6,1,	// Node 5
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.8,0.6,0.5,	// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.8,0.6,0.5,	// Node 4
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.8,0.5,0.6,	// Node 2
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0,1,0,	// Node 1

		// +z face: BLUE
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.8,0.6,1,	// Node 5
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1,0,0,	// Node 6
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8,0.7,0.9,	// Node 7

		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 0.8,0.7,0.9,	// Node 7
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.8,0.6,0.5,	// Node 4
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.8,0.6,1,	// Node 5

		// -x face: CYAN
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	   1,0,0,	// Node 6
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.8,0.6,1,	// Node 5
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0,1,0,	// Node 1

		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0,1,0,	// Node 1
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8,0.4,0.7,	// Node 0
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1,0,0,	// Node 6

		// -y face: MAGENTA
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.8,0.6,0,	// Node 3
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.8,0.7,0.9,	// Node 7
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1,0,0,	// Node 6

		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 1,0,0,	// Node 6
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8,0.4,0.7,	// Node 0
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8,0.6,0,	// Node 3

		// -z face: YELLOW
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.8,0.5,0.6,	// Node 2
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8,0.6,0,	// Node 3
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8,0.4,0.7,	// Node 0

		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.8,0.4,0.7,	// Node 0
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0,1,0,	// Node 1
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0.8,0.5,0.6,	// Node 2

	]);
}


function makePyramid() {
	var c30 = Math.sqrt(0.75);
	var sq2	= Math.sqrt(2.0);
	pyramidShapes = new Float32Array( [
		// Vertex coordinates(x,y,z,w) and color (R,G,B) for a new color tetrahedron:
		//		Apex on +z axis; equilateral triangle base at z=0
		/*	Nodes:
                 0.0,	 0.0, sq2, 1.0,			0.0, 	0.0,	1.0,	// Node 0 (apex, +z axis;  blue)
             c30, -0.5, 0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 1 (base: lower rt; red)
             0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,	// Node 2 (base: +y axis;  grn)
            -c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
        */
		// Face 0: (right side)
		0.0,	 0.0, sq2, 1.0,		0.0, 	0.0,	1.0,	// Node 0 (apex, +z axis;  blue)
		c30, -0.5, 0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 1 (base: lower rt; red)
		0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,	// Node 2 (base: +y axis;  grn)
		// Face 1: (left side)
		0.0,	 0.0, sq2, 1.0,			0.0, 	0.0,	1.0,	// Node 0 (apex, +z axis;  blue)
		0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,	// Node 2 (base: +y axis;  grn)
		-c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
		// Face 2: (lower side)
		0.0,	 0.0, sq2, 1.0,			0.0, 	0.0,	1.0,	// Node 0 (apex, +z axis;  blue)
		-c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
		c30, -0.5, 0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 1 (base: lower rt; red)
		// Face 3: (base side)
		-c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
		0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,	// Node 2 (base: +y axis;  grn)
		c30, -0.5, 0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 1 (base: lower rt; red)
	]);
}

function makeAxis() {
	lineColors = new Float32Array([
		// Drawing Axes: Draw them using gl.LINES drawing primitive;
		// +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
		0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// X axis line (origin: gray)
		1.3,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// 						 (endpoint: red)

		0.0,  0.0,  0.0, 1.0,    0.3,  0.3,  0.3,	// Y axis line (origin: white)
		0.0,  1.3,  0.0, 1.0,		0.3,  1.0,  0.3,	//						 (endpoint: green)

		0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// Z axis line (origin:white)
		0.0,  0.0,  1.3, 1.0,		0.3,  0.3,  1.0,	//						 (endpoint: blue)
	]);
}


function makeRod() {
	var topColr = new Float32Array([0.8, 0.8, 0.0]);	// light yellow top,
	var walColr = new Float32Array([0.9, 0.9, 0.1]);	// dark green walls,
	var botColr = new Float32Array([0.2, 0.3, 0.7]);	// light blue bottom,
	var ctrColr = new Float32Array([0.1, 0.1, 0.1]); // near black end-cap centers,
	var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble color.

	var capVerts = 30;	// # of vertices around the topmost 'cap' of the shape
	var topRadius = 0.3;		// radius of top of cylinder (bottom is always 1.0)
	var length = 8;

	// Create a (global) array to hold all of this cylinder's vertices;
	rodVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);

	for(v=0,j=0;   v<(2*capVerts)-1;   v++,j+=floatsPerVertex) {
		if(v%2 ==0)
		{
			rodVerts[j  ] = topRadius * Math.cos(Math.PI*v/capVerts);			// x
			rodVerts[j+1] = topRadius * Math.sin(Math.PI*v/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			rodVerts[j+2] =0;	// z
			rodVerts[j+3] = 1.0;	// w.
			// r,g,b = botColr[]
			rodVerts[j+4]=botColr[0];
			rodVerts[j+5]=botColr[1];
			rodVerts[j+6]=botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			rodVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			rodVerts[j+1] = 0.0;
			rodVerts[j+2] =0;
			rodVerts[j+3] = 1.0;			// r,g,b = ctrColr[]
			rodVerts[j+4]=ctrColr[0];
			rodVerts[j+5]=ctrColr[1];
			rodVerts[j+6]=ctrColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for(v=0; v< 2*capVerts;   v++, j+=floatsPerVertex) {
		if(v%2==0)	// count verts from zero again,
		// and put all even# verts along outer edge of bottom cap:
		{
			rodVerts[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			rodVerts[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			rodVerts[j+2] =0;	// ==z  BOTTOM cap,
			rodVerts[j+3] = 1.0;	// w.
			// r,g,b = walColr[]
			rodVerts[j+4]=walColr[0];
			rodVerts[j+5]=walColr[1];
			rodVerts[j+6]=walColr[2];
			if(v==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				rodVerts[j+4] = errColr[0];
				rodVerts[j+5] = errColr[1];
				rodVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
			rodVerts[j  ] = topRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
			rodVerts[j+1] = topRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
			rodVerts[j+2] = length;	// == z TOP cap,
			rodVerts[j+3] = 1.0;	// w.
			// r,g,b = walColr;
			rodVerts[j+4]=walColr[0];
			rodVerts[j+5]=walColr[1];
			rodVerts[j+6]=walColr[2];
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		// count vertices from zero again, and
		if(v%2==0) {	// position even #'d vertices around top cap's outer edge.
			rodVerts[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			rodVerts[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			rodVerts[j+2] = length;	// z
			rodVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			rodVerts[j+4]=topColr[0];
			rodVerts[j+5]=topColr[1];
			rodVerts[j+6]=topColr[2];
			if(v==0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				rodVerts[j+4] = errColr[0];
				rodVerts[j+5] = errColr[1];
				rodVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else {				// position odd#'d vertices at center of the top cap:
			rodVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			rodVerts[j+1] = 0.0;
			rodVerts[j+2] = length;
			rodVerts[j+3] = 1.0;
			// r,g,b = topColr[]
			rodVerts[j+4]=ctrColr[0];
			rodVerts[j+5]=ctrColr[1];
			rodVerts[j+6]=ctrColr[2];
		}
	}
}


function makePivot() {
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//

	var topColr = new Float32Array([0.8, 0.8, 0.0]);	// light yellow top,
	var walColr = new Float32Array([0.2, 0.3, 0.1]);	// dark green walls,
	var botColr = new Float32Array([0.2, 0.3, 0.7]);	// light blue bottom,
	var ctrColr = new Float32Array([0.1, 0.1, 0.1]); // near black end-cap centers,
	var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble color.

	var capVerts = 6;	// # of vertices around the topmost 'cap' of the shape
	var topRadius = 0.9;		// radius of top of cylinder (bottom is always 1.0)
	var length = 1;

	// Create a (global) array to hold all of this cylinder's vertices;
	pivotVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);

	for(v=0,j=0;   v<(2*capVerts)-1;   v++,j+=floatsPerVertex) {
		if(v%2 ==0)
		{
			pivotVerts[j  ] = Math.cos(Math.PI*v/capVerts);			// x
			pivotVerts[j+1] = Math.sin(Math.PI*v/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			pivotVerts[j+2] =-1 * length;	// z
			pivotVerts[j+3] = 1.0;	// w.
			// r,g,b = botColr[]
			pivotVerts[j+4]=botColr[0];
			pivotVerts[j+5]=botColr[1];
			pivotVerts[j+6]=botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			pivotVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			pivotVerts[j+1] = 0.0;
			pivotVerts[j+2] =-1.0 * length;
			pivotVerts[j+3] = 1.0;			// r,g,b = ctrColr[]
			pivotVerts[j+4]=ctrColr[0];
			pivotVerts[j+5]=ctrColr[1];
			pivotVerts[j+6]=ctrColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for(v=0; v< 2*capVerts;   v++, j+=floatsPerVertex) {
		if(v%2==0)	// count verts from zero again,
		// and put all even# verts along outer edge of bottom cap:
		{
			pivotVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
			pivotVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
			pivotVerts[j+2] =-1.0 * length;	// ==z  BOTTOM cap,
			pivotVerts[j+3] = 1.0;	// w.
			// r,g,b = walColr[]
			pivotVerts[j+4]=walColr[0];
			pivotVerts[j+5]=walColr[1];
			pivotVerts[j+6]=walColr[2];
			if(v==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				pivotVerts[j+4] = errColr[0];
				pivotVerts[j+5] = errColr[1];
				pivotVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
			pivotVerts[j  ] = topRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
			pivotVerts[j+1] = topRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
			pivotVerts[j+2] = 1.0 * length;	// == z TOP cap,
			pivotVerts[j+3] = 1.0;	// w.
			// r,g,b = walColr;
			pivotVerts[j+4]=walColr[0];
			pivotVerts[j+5]=walColr[1];
			pivotVerts[j+6]=walColr[2];
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		// count vertices from zero again, and
		if(v%2==0) {	// position even #'d vertices around top cap's outer edge.
			pivotVerts[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			pivotVerts[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			pivotVerts[j+2] = 1.0 * length;	// z
			pivotVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			pivotVerts[j+4]=topColr[0];
			pivotVerts[j+5]=topColr[1];
			pivotVerts[j+6]=topColr[2];
			if(v==0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				pivotVerts[j+4] = errColr[0];
				pivotVerts[j+5] = errColr[1];
				pivotVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else {				// position odd#'d vertices at center of the top cap:
			pivotVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			pivotVerts[j+1] = 0.0;
			pivotVerts[j+2] = 1.0 * length;
			pivotVerts[j+3] = 1.0;
			// r,g,b = topColr[]
			pivotVerts[j+4]=ctrColr[0];
			pivotVerts[j+5]=ctrColr[1];
			pivotVerts[j+6]=ctrColr[2];
		}
	}
}

function makeCylinder2() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//

	var topColr = new Float32Array([0.8, 0.4, 0.6 ]);	// light yellow top,
	var midColr = new Float32Array([0.8, 0.5, 0]);
	var botColr = new Float32Array([0.7, 1, 0.7]);	// light blue bottom,
	var walColr = new Float32Array([0, 0, 0]);	// dark green walls,
	var ctrColr = new Float32Array([0.1, 0.1, 0.1]); // near black end-cap centers,
	var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble color.

	var capVerts = 50;	// # of vertices around the topmost 'cap' of the shape
	var sideVerts = 20;
	var bottomRadius = 1.0;

	// Create a (global) array to hold all of this cylinder's vertices;
	cylVerts = new Float32Array(  ((2*capVerts) +2 + 8 * sideVerts * capVerts + (2*capVerts) +2)* floatsPerVertex);
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	var j = 0;
	var cnt = 0;
	var total = 4 * sideVerts * capVerts;
	for(v=0; v< 2*sideVerts; v++) {
		for (var u = 0; u < 2 * capVerts - 1; u++, j += floatsPerVertex, cnt++) {
			// walColr[0] = cnt / total;
			// walColr[1] = cnt / total;
			// walColr[2] = cnt / total;
			if (u % 2 == 0) {
				cylVerts[j] = (bottomRadius * (1 + Math.cos(Math.PI/3 * v / sideVerts))) * Math.cos(Math.PI * u / capVerts);			// x
				cylVerts[j + 1] = (bottomRadius * (1 + Math.cos(Math.PI/3 * v / sideVerts))) * Math.sin(Math.PI * u / capVerts);			// y
				cylVerts[j + 2] = -1 + v / sideVerts;	// z
				cylVerts[j + 3] = 1.0;	// w.
				// r,g,b = botColr[]
				if (v <= 2 * sideVerts / 3) {
					cylVerts[j + 4] = botColr[0];
					cylVerts[j + 5] = botColr[1];
					cylVerts[j + 6] = botColr[2];
				}
				else if (v <= 4 * sideVerts / 3) {
					cylVerts[j + 4] = midColr[0];
					cylVerts[j + 5] = midColr[1];
					cylVerts[j + 6] = midColr[2];
				}
				else {
					cylVerts[j + 4] = topColr[0];
					cylVerts[j + 5] = topColr[1];
					cylVerts[j + 6] = topColr[2];
				}
				if(u==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
					// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = botColr[0];
					cylVerts[j+5] = botColr[1];
					cylVerts[j+6] = botColr[2];		// (make it red; see lecture notes)
				}
			} else {	// put odd# vertices at center of cylinder's bottom cap:
				cylVerts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
				cylVerts[j + 1] = 0.0;
				cylVerts[j + 2] = -1 + v / sideVerts;
				cylVerts[j + 3] = 1.0;			// r,g,b = ctrColr[]
				cylVerts[j + 4] = walColr[0];
				cylVerts[j + 5] = walColr[1];
				cylVerts[j + 6] = walColr[2];
			}
		}
	}

	//sides
	var cnt = 0;
	var total = 4 * sideVerts * capVerts;
	for(v=0; v< 2*sideVerts; v++) {
		for (var u = 0; u < 2 * capVerts + 2; u++, j += floatsPerVertex, cnt++) {
			// walColr[0] = cnt / total;
			// walColr[1] = cnt / total;
			// walColr[2] = cnt / total;
			if (u % 2 == 0) {
				cylVerts[j] = (bottomRadius * (1 + Math.cos(Math.PI / 3* v / sideVerts))) * Math.cos(Math.PI * u / capVerts);			// x
				cylVerts[j + 1] = (bottomRadius * (1 + Math.cos(Math.PI/3 * v / sideVerts))) * Math.sin(Math.PI * u / capVerts);			// y
				cylVerts[j + 2] = -1 + v / sideVerts;	// z
				cylVerts[j + 3] = 1.0;	// w.
				if (v <= 2 * sideVerts / 3) {
					cylVerts[j + 4] = botColr[0];
					cylVerts[j + 5] = botColr[1];
					cylVerts[j + 6] = botColr[2];
				}
				else if (v <= 4 * sideVerts / 3) {
					cylVerts[j + 4] = midColr[0];
					cylVerts[j + 5] = midColr[1];
					cylVerts[j + 6] = midColr[2];
				}
				else {
					cylVerts[j + 4] = topColr[0];
					cylVerts[j + 5] = topColr[1];
					cylVerts[j + 6] = topColr[2];
				}
				if(u==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
					// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = botColr[0];
					cylVerts[j+5] = botColr[1];
					cylVerts[j+6] = botColr[2];		// (make it red; see lecture notes)
				}
				if(u==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
					// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = botColr[0];
					cylVerts[j+5] = botColr[1];
					cylVerts[j+6] = botColr[2];		// (make it red; see lecture notes)
				}
			} else {	// put odd# vertices at center of cylinder's bottom cap:
				cylVerts[j] = (bottomRadius * (1 + Math.cos(Math.PI/3 * (v+1) / sideVerts))) * Math.cos(Math.PI * (u-1) / capVerts);			// x
				cylVerts[j + 1] = (bottomRadius * (1 + Math.cos(Math.PI/3 * (v+1) / sideVerts))) * Math.sin(Math.PI * (u-1) / capVerts);			// y
				cylVerts[j + 2] = -1 + (v+1) / sideVerts;	// z
				cylVerts[j + 3] = 1.0;	// w.
				cylVerts[j + 4] = walColr[0];
				cylVerts[j + 5] = walColr[1];
				cylVerts[j + 6] = walColr[2];
			}
		}
	}
}

function makeSphere2() {
//==============================================================================
// Make a sphere from one TRIANGLE_STRIP drawing primitive,  using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Sphere radius==1.0, centered at the origin, with 'south' pole at
// (x,y,z) = (0,0,-1) and 'north' pole at (0,0,+1).  The tri-strip starts at the
// south-pole end-cap spiraling upwards (in +z direction) in CCW direction as
// viewed from the origin looking down (from inside the sphere).
// Between the south end-cap and the north, it creates ring-like 'slices' that
// defined by parallel planes of constant z.  Each slice of the tri-strip
// makes up an equal-lattitude portion of the sphere, and the stepped-spiral
// slices follow the same design used to the makeCylinder2() function.
//
// (NOTE: you'll get better-looking results if you create a 'makeSphere3()
// function that uses the 'degenerate stepped spiral' design (Method 3 in
// lecture notes).
//

	var slices = 10;		// # of slices of the sphere along the z axis, including
	// the south-pole and north pole end caps. ( >=2 req'd)
	var sliceVerts = 21;	// # of vertices around the top edge of the slice
	// (same number of vertices on bottom of slice, too)
	// (HINT: odd# or prime#s help avoid accidental symmetry)
	var topColr = new Float32Array([0.3, 0.3, 0.3]);	// South Pole: dark-gray
	var botColr = new Float32Array([0.8, 0.8, 0.8]);	// North Pole: light-gray.
	var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble colr
	var sliceAngle = Math.PI/slices;	// One slice spans this fraction of the
	// 180 degree (Pi radian) lattitude angle between south pole and north pole.

	// Create a (global) array to hold this sphere's vertices:
	sphVerts = new Float32Array(  ((slices*2*sliceVerts) -2) * floatsPerVertex);
	// # of vertices * # of elements needed to store them.
	// Each end-cap slice requires (2*sliceVerts -1) vertices
	// and each slice between them requires (2*sliceVerts).
	// Create the entire sphere as one single tri-strip array. This first for() loop steps through each 'slice', and the for() loop it contains steps through each vertex in the current slice.
	// INITIALIZE:
	var cosBot = 0.0;					// cosine and sine of the lattitude angle for
	var sinBot = 0.0;					// 	the current slice's BOTTOM (southward) edge.
	// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
	var cosTop = 0.0;					// "	" " for current slice's TOP (northward) edge
	var sinTop = 0.0;
	// for() loop's s var counts slices;
	// 				  its v var counts vertices;
	// 					its j var counts Float32Array elements
	//					(vertices * elements per vertex)
	var j = 0;							// initialize our array index
	var isFirstSlice = 1;		// ==1 ONLY while making south-pole slice; 0 otherwise
	var isLastSlice = 0;		// ==1 ONLY while making north-pole slice; 0 otherwise
	for(s=0; s<slices; s++) {	// for each slice of the sphere,---------------------
		// For current slice's top & bottom edges, find lattitude angle sin,cos:
		if(s==0) {
			isFirstSlice = 1;		// true ONLY when we're creating the south-pole slice
			cosBot =  0.0; 			// initialize: first slice's lower edge is south pole.
			sinBot = -1.0;			// (cos(lat) sets slice diameter; sin(lat) sets z )
		}
		else {					// otherwise, set new bottom edge == old top edge
			isFirstSlice = 0;
			cosBot = cosTop;
			sinBot = sinTop;
		}								// then compute sine,cosine of lattitude of new top edge.
		cosTop = Math.cos((-Math.PI/2) +(s+1)*sliceAngle);
		sinTop = Math.sin((-Math.PI/2) +(s+1)*sliceAngle);
		// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
		// (       use cos(lat) to set slice radius, sin(lat) to set slice z coord)
		// Go around entire slice; start at x axis, proceed in CCW direction
		// (as seen from origin inside the sphere), generating TRIANGLE_STRIP verts.
		// The vertex-counter 'v' starts at 0 at the start of each slice, but:
		// --the first slice (the South-pole end-cap) begins with v=1, because
		// 		its first vertex is on the TOP (northwards) side of the tri-strip
		// 		to ensure correct winding order (tri-strip's first triangle is CCW
		//		when seen from the outside of the sphere).
		// --the last slice (the North-pole end-cap) ends early (by one vertex)
		//		because its last vertex is on the BOTTOM (southwards) side of slice.
		//
		if(s==slices-1) isLastSlice=1;// (flag: skip last vertex of the last slice).
		for(v=isFirstSlice;    v< 2*sliceVerts-isLastSlice;   v++,j+=floatsPerVertex)
		{						// for each vertex of this slice,
			if(v%2 ==0) { // put vertices with even-numbered v at slice's bottom edge;
				// by circling CCW along longitude (east-west) angle 'theta':
				// (0 <= theta < 360deg, increases 'eastward' on sphere).
				// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
				// where			theta = 2*PI*(v/2)/capVerts = PI*v/capVerts
				sphVerts[j  ] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
				sphVerts[j+1] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
				sphVerts[j+2] = sinBot;																			// z
				sphVerts[j+3] = 1.0;																				// w.
			}
			else {	// put vertices with odd-numbered v at the the slice's top edge
				// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
				// and thus we can simplify cos(2*PI* ((v-1)/2)*sliceVerts)
				// (why (v-1)? because we want longitude angle 0 for vertex 1).
				sphVerts[j  ] = cosTop * Math.cos(Math.PI * (v-1)/sliceVerts); 	// x
				sphVerts[j+1] = cosTop * Math.sin(Math.PI * (v-1)/sliceVerts);	// y
				sphVerts[j+2] = sinTop;		// z
				sphVerts[j+3] = 1.0;
			}
			// finally, set some interesting colors for vertices:
			if(v==0) { 	// Troublesome vertex: this vertex gets shared between 3
				// important triangles; the last triangle of the previous slice, the
				// anti-diagonal 'step' triangle that connects previous slice and next
				// slice, and the first triangle of that next slice.  Smooth (Gouraud)
				// shading of this vertex prevents us from choosing separate colors for
				// each slice.  For a better solution, use the 'Degenerate Stepped Spiral'
				// (Method 3) described in the Lecture Notes.
				sphVerts[j+4]=errColr[0];
				sphVerts[j+5]=errColr[1];
				sphVerts[j+6]=errColr[2];
			}
			else if(isFirstSlice==1) {
				sphVerts[j+4]=botColr[0];
				sphVerts[j+5]=botColr[1];
				sphVerts[j+6]=botColr[2];
			}
			else if(isLastSlice==1) {
				sphVerts[j+4]=topColr[0];
				sphVerts[j+5]=topColr[1];
				sphVerts[j+6]=topColr[2];
			}
			else {	// for all non-top, not-bottom slices, set vertex colors randomly
				sphVerts[j+4]= Math.random()/2;  	// 0.0 <= red <= 0.5
				sphVerts[j+5]= Math.random()/2;		// 0.0 <= grn <= 0.5
				sphVerts[j+6]= Math.random()/2;		// 0.0 <= blu <= 0.5
			}
		}
	}
}


function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at the origin.  Draw this shape using the GL_LINES primitive.

	var xcount = 200;			// # of lines to draw in x,y to make the grid.
	var ycount = 200;
	var xymax	= 500;			// grid size; extends to cover +/-xymax in x and y.
	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.

	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
	// draw a grid made of xcount+ycount lines; 2 vertices per line.

	var xgap = xymax/ (xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/ (ycount-1);		// (why half? because v==(0line number/2))

	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v)*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function drawTop(gl, n, currentAngle, currentPivotAngle, modelMatrix, u_ModelMatrix) {
//==============================================================================
	// Clear <canvas>  colors AND the depth buffer
	// Pass the view projection matrix
	// gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
	//-------Draw Spinning Cylinder:
	// save the previous modelMatrix for ground grid
	pushMatrix(modelMatrix);
	// save for the second object
	pushMatrix(modelMatrix);
	// save for the rod object
	pushMatrix(modelMatrix);
	// save for the sphere object
	pushMatrix(modelMatrix);
	// save for the axis

	modelMatrix.translate(move_x, move_y - 0.2, 0.4);  // 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to the lower-left corner of CVV.
	modelMatrix.scale(0.4, 0.4, 0.4);
	// if you DON'T scale, cyl goes outside the CVV; clipped!
	modelMatrix.rotate(-90, 0, 0, 1);
	modelMatrix.rotate(currentAngle, 1, 0, 1)
	// modelMatrix.rotate(currentAngle/3, 1, 0, 0);	// spin more slowly on x.
	// Drawing:
	// Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the the cylinder's vertices:
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		cylStart/floatsPerVertex, // start at this vertex number, and
		cylVerts.length/floatsPerVertex);	// draw this many vertices.
	pushMatrix(modelMatrix);

	modelMatrix.scale(3,3,3);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES,lineStart/floatsPerVertex,lineColors.length/floatsPerVertex);

	modelMatrix = popMatrix();

	pushMatrix(modelMatrix); // spinning sphere top1
	pushMatrix(modelMatrix); // spinning sphere top2
	pushMatrix(modelMatrix); // spinning sphere side
	pushMatrix(modelMatrix); // pivot

	pushMatrix(modelMatrix); // spinning sphere top1
	pushMatrix(modelMatrix); // spinning sphere top2
	pushMatrix(modelMatrix); // spinning sphere side
	pushMatrix(modelMatrix); // pivot


	// ------------------- draw the top spinning sphere
	modelMatrix = popMatrix();
	modelMatrix.rotate(currentAngle * 4, 0, 0, 1); // and at different rate on -X,Y
	modelMatrix.translate(0.8 , 1.5 , -1.2); // 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix.scale(0.2, 0.2, 0.2);
	// Make it smaller:
	modelMatrix.rotate(currentAngle * 10, 1, 1, 1); // and at different rate on -X,Y

	// modelMatrix2.rotate(currentAngle * 2, 1, 0, 1);  // Spin on XY diagonal axis

	// Drawing:
	// Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		sphStart2/floatsPerVertex,	// start at this vertex number, and
		sphVerts.length/floatsPerVertex);	// draw this many vertices.


	// -----------------draw the bottom spinning sphere
	modelMatrix4 = popMatrix();
	modelMatrix4.rotate(currentAngle * 3, 0, 0, 1); // and at different rate on -X,Y
	modelMatrix4.translate(0.8 , 1 , 0.5); // 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix4.scale(0.2, 0.2, 0.2);
	// Make it smaller:
	modelMatrix4.rotate(currentAngle * 20, 1, 1, 1); // and at different rate on -X,Y
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix4.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		sphStart3/floatsPerVertex,	// start at this vertex number, and
		sphVerts.length/floatsPerVertex);	// draw this many vertices.

	// ------------------draw the pivot
	modelMatrix5 = popMatrix();
	modelMatrix5.translate(0, 0, -1.2); // 'set' means DISCARD old matrix,
	modelMatrix5.rotate(g_angle01, 1, 0, 0);
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix5.scale(0.2, 0.2, 0.2);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix5.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		pivotStart/floatsPerVertex,	// start at this vertex number, and
		pivotVerts.length/floatsPerVertex);	// draw this many vertices.

	// --------------------- draw the rotating rod
	// modelMatrix5.translate(0, 0, 2);
	// modelMatrix6.rotate(90, 1, 0, 0);
	// modelMatrix6.rotate(currentAngle * 5,  0, 1, 0);
	// 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix5.rotate(90, 1, 0, 0);
	modelMatrix5.scale(1, 1, 1);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix5.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		RodStart/floatsPerVertex,	// start at this vertex number, and
		rodVerts.length/floatsPerVertex);	// draw this many vertices.

	// ---------------draw the sphere attached to the rod

	modelMatrix5.rotate(currentAngle, 0, 0, 1); // and at different rate on -X,Y
	modelMatrix5.translate(0, 0, 8);
	modelMatrix5.scale(1, 1, 1);
	gl.uniformMatrix4fv(u_ModelMatrix,false, modelMatrix5.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		sphStart4/floatsPerVertex,	// start at this vertex number, and
		sphVerts.length/floatsPerVertex);	// draw this many vertices.

	// ----------------- draw the symmetric cylinder
	modelMatrix = popMatrix();
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to the lower-left corner of CVV.
	// if you DON'T scale, cyl goes outside the CVV; clipped!
	modelMatrix.translate(0, 0, 2);
	modelMatrix.rotate(-180, 1, 0, 0);
	// modelMatrix.rotate(currentAngle/3, 1, 0, 0);	// spin more slowly on x.
	// Drawing:
	// Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the the cylinder's vertices:
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		cylStart2/floatsPerVertex, // start at this vertex number, and
		cylVerts.length/floatsPerVertex);	// draw this many vertices.

	// ----------------- draw the symmetric pivot
	modelMatrix5 = popMatrix();
	modelMatrix5.translate(0, 0, 3.1); // 'set' means DISCARD old matrix,

	modelMatrix5.rotate(g_angle01 + 180, 1, 0, 0);
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix5.scale(0.2, 0.2, 0.2);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix5.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		pivotStart2/floatsPerVertex,	// start at this vertex number, and
		pivotVerts.length/floatsPerVertex);	// draw this many vertices.

	// --------------------- draw the symmetric rotating rod
	modelMatrix5.rotate(90, 1, 0, 0);
	modelMatrix5.scale(1, 1, 1);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix5.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		RodStart2/floatsPerVertex,	// start at this vertex number, and
		rodVerts.length/floatsPerVertex);	// draw this many vertices.


	// --------------- draw the symmetric sphere attached to the rod

	modelMatrix5.rotate(currentAngle, 0, 0, 1); // and at different rate on -X,Y
	modelMatrix5.translate(0, 0, 8);
	modelMatrix5.scale(1, 1, 1);
	gl.uniformMatrix4fv(u_ModelMatrix,false, modelMatrix5.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		sphStart5/floatsPerVertex,	// start at this vertex number, and
		sphVerts.length/floatsPerVertex);	// draw this many vertices.

	// ---------------- draw the symmetric sphere side
	modelMatrix4 = popMatrix();
	modelMatrix4.rotate(-currentAngle * 3, 0, 0, 1); // and at different rate on -X,Y
	modelMatrix4.translate(-0.8 , -1 , 1.5); // 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix4.scale(0.2, 0.2, 0.2);
	// Make it smaller:
	modelMatrix4.rotate(currentAngle * 20, 1, 1, 1); // and at different rate on -X,Y
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix4.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		sphStart6/floatsPerVertex,	// start at this vertex number, and
		sphVerts.length/floatsPerVertex);	// draw this many vertices.

	// ----------------- draw the symmetric sphere rotating on the top1
	modelMatrix = popMatrix();
	modelMatrix.rotate(-currentAngle * 4, 0, 0, 1); // and at different rate on -X,Y
	modelMatrix.translate(0.8 , 1.5 , 3.2); // 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix.scale(0.2, 0.2, 0.2);
	// Make it smaller:
	modelMatrix.rotate(currentAngle * 10, 1, 1, 1); // and at different rate on -X,Y

	// modelMatrix2.rotate(currentAngle * 2, 1, 0, 1);  // Spin on XY diagonal axis

	// Drawing:
	// Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		sphStart7/floatsPerVertex,	// start at this vertex number, and
		sphVerts.length/floatsPerVertex);	// draw this many vertices.


	// ----------------- draw the symmetric sphere rotating on the top2
	modelMatrix2 = popMatrix();
	modelMatrix2.rotate(-currentAngle * 3, 0, 0, 1); // and at different rate on -X,Y
	modelMatrix2.translate(-0.5 , -0.6 , 3.2); // 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to 1e lower-left corner of CVV.
	modelMatrix2.scale(0.2, 0.2, 0.2);
	// Make it smaller:
	modelMatrix2.rotate(currentAngle * 7, 1, 1, 1); // and at different rate on -X,Y

	// modelMatrix2.rotate(currentAngle * 2, 1, 0, 1);  // Spin on XY diagonal axis

	// Drawing:
	// Pass our current matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix2.elements);
	// Draw just the sphere's vertices
	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		sphStart8/floatsPerVertex,	// start at this vertex number, and
		sphVerts.length/floatsPerVertex);	// draw this many vertices.

	// ---------Draw Ground Plane, without spinning --------------------------
	// position it.
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate( 0.4, -0.4, 0.0);
	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:
	// Drawing:
	// Pass our current matrix to the vertex shaders:
	// Draw just the ground-plane's vertices
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
		gndStart/floatsPerVertex,	// start at this vertex number, and
		gndVerts.length/floatsPerVertex);	// draw this many vertices.
}

function drawCube(gl, n, currentAngle, currentPivotAngle, modelMatrix, u_ModelMatrix) {
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(-2, 3, 0.5);
	modelMatrix.scale(0.5, 0.5, 0.5);
	modelMatrix.rotate(g_angle03, 0, 0, 1);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, cubeStart1/floatsPerVertex, cubeVerts1.length/floatsPerVertex);
}


function drawPyramid(gl, n, modelMatrix, u_ModelMatrix) {
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(1, 2, 0);
	modelMatrix.translate(pyramid_x, pyramid_y, 0);
	modelMatrix.scale(2, 2, 2);
	modelMatrix.rotate(60, 0, 0, 1);
	quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Quaternion-->Matrix
	modelMatrix.concat(quatMatrix);	// apply that matrix.

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.LINES,lineStart/floatsPerVertex,lineColors.length/floatsPerVertex);
	gl.drawArrays(gl.TRIANGLES, pyramidStart/floatsPerVertex, pyramidShapes.length/floatsPerVertex);
}

function drawCylinder(gl, n, modelMatrix, u_ModelMatrix) {
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.8, 0.8, 0.3);
	modelMatrix.translate(-2, -15, -1);  // 'set' means DISCARD old matrix,
	// convert to left-handed coord sys
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLE_STRIP, RodStart3/floatsPerVertex, rodVerts.length/floatsPerVertex);
}

function drawLine(gl, n, modelMatrix, u_ModelMatrix) {
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.scale(2, 2, 2);
	modelMatrix.translate(0, 0, 0.5);  // 'set' means DISCARD old matrix,
	//-------------------------------
	// Drawing:
	// Use the current ModelMatrix to transform & draw something new from our VBO:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw the last 2 faces of our tetrahedron: starting at vertex #6,
	// draw the next 6 vertices using the 'gl.TRIANGLES' drawing primitive
	// Next, use the gl.LINES drawing primitive on vertices 12 thru 18 to
	// depict our current 'drawing axes' onscreen:
	gl.drawArrays(gl.LINES,lineStart/floatsPerVertex,lineColors.length/floatsPerVertex);
}

function drawSphere(gl, n, modelMatrix, u_ModelMatrix) {
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.3, 0.3, 0.3);
	modelMatrix.translate(3, 6, 1);  // 'set' means DISCARD old matrix,
	modelMatrix.rotate(g_angle03, 0, 0, 1);
	// convert to left-handed coord sys
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLE_STRIP, sphStart/floatsPerVertex, sphVerts.length/floatsPerVertex);
}

function drawRobot(gl, n, modelMatrix, u_ModelMatrix) {
	// ------------------------ draw the second object ---------------------------
	// ------------------------ draw the body ------------------------------------
	// NEXT, create different drawing axes, and...
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	// convert to left-handed coord sys
	modelMatrix.translate(-2, -3, 1);
	modelMatrix.rotate(90, 1, 0, 0);;
	modelMatrix.scale(2, 2, 2);
	modelMatrix.translate(move_x2, move_y2, 0);
	modelMatrix.rotate(g_angle04, 0, 1, 0);
	modelMatrix.rotate(g_angle02, 1, 0, 1);  // Spin on XY diagonal axis
	modelMatrix.rotate(180, 0, 0, 1);
	modelMatrix.rotate(45, 0, 1, 0);
	modelMatrix.rotate(-20, 0, 0, 1);
	modelMatrix.scale(0.08,0.08,0.08);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, bodyStart/floatsPerVertex, bodyVerts.length/floatsPerVertex);

	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to the lower-left corner of CVV.
	// to match WebGL display canvas.
	pushMatrix(modelMatrix); // for the neck
	pushMatrix(modelMatrix); // for the arm1
	pushMatrix(modelMatrix); // for the arm2
	pushMatrix(modelMatrix); // for the leg1
	pushMatrix(modelMatrix); // for the leg2

	// ------------------------ draw neck ------------------------------------
	// NEXT, create different drawing axes, and...
	modelMatrix = popMatrix();
	modelMatrix.scale(0.8, 0.8, 0.8);
	modelMatrix.translate(0, 0, -5);  // 'set' means DISCARD old matrix,
	modelMatrix.rotate(g_angle03, 0, 0, 1);
	// convert to left-handed coord sys
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLE_STRIP, RodStart3/floatsPerVertex, rodVerts.length/floatsPerVertex);

	// ------------------------ draw head ------------------------------------
	// NEXT, create different drawing axes, and...
	modelMatrix.translate(0,0,-1);
	modelMatrix.scale(1.2, 1.2, 1.2);
	// Make it smaller:
	modelMatrix.rotate(90, 0, 1, 0);
	// DRAW CUBE:		Use ths matrix to transform & draw
	//						the second set of vertices stored in our VBO:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, cubeStart1/floatsPerVertex, cubeVerts1.length/floatsPerVertex);


	// ------------------------ draw arm 1 ------------------------------------
	// NEXT, create different drawing axes, and...
	modelMatrix = popMatrix();
	modelMatrix.rotate(90, 0, 1, 0);
	modelMatrix.translate(1, 0, -3.5);  // 'set' means DISCARD old matrix,
	modelMatrix.rotate(g_angle02 -90, 0, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, armStart/floatsPerVertex, armVerts.length/floatsPerVertex);

	// ------------------------ draw upper arm 1 ---------------------------
	modelMatrix.rotate(30, 0, 1, 0);
	modelMatrix.translate(-0.8, 0, -1);
	modelMatrix.rotate(g_angle03 - 10, 0, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, armStart/floatsPerVertex, armVerts.length/floatsPerVertex);

	// ------------------------ draw arm 2 ------------------------------------
	// NEXT, create different drawing axes, and...
	modelMatrix = popMatrix();
	modelMatrix.rotate(-90, 0, 1, 0);
	modelMatrix.translate(-1, 0, -3.5);  // 'set' means DISCARD old matrix,
	modelMatrix.rotate(-g_angle02 -90, 0, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, armStart/floatsPerVertex, armVerts.length/floatsPerVertex);

	// ------------------------ draw upper arm 2 ---------------------------
	modelMatrix.rotate(30, 0, 1, 0);
	modelMatrix.translate(0, 0, 2);
	modelMatrix.rotate(g_angle03 - 60, 0, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, armStart/floatsPerVertex, armVerts.length/floatsPerVertex);

	// ------------------------ draw leg 1 ------------------------------------
	// NEXT, create different drawing axes, and...
	modelMatrix = popMatrix();
	modelMatrix.translate(-1, 0, 5);  // 'set' means DISCARD old matrix,
	modelMatrix.rotate(g_angle02 - 90, 1, 0, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, legStart/floatsPerVertex, legVerts.length/floatsPerVertex);

	// ------------------------ draw leg 2 ------------------------------------
	// NEXT, create different drawing axes, and...
	modelMatrix = popMatrix();
	modelMatrix.translate(1, 0, 5);  // 'set' means DISCARD old matrix,
	modelMatrix.rotate(-g_angle02 - 90, 1, 0, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
	gl.drawArrays(gl.TRIANGLES, legStart/floatsPerVertex, legVerts.length/floatsPerVertex);

}


// Last time that this function was called:  (used for animation timing)
function animate(angle) {
//==============================================================================
	// Calculate the elapsed time
	var now = Date.now();
	var elapsed = now - g_last_cylinder;
	g_last_cylinder = now;

	// Update the current rotation angle (adjusted by the elapsed time)
	// limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

	var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
	return newAngle %= 360*3;   // keep angle finite; use 3*360 so that we can
	// use multiples of angle/3 on different axes.
}


// animation for rod
function animate2() {
//==============================================================================
// Calculate the elapsed time; update all animation angles & amounts.
	var now = Date.now();
	var elapsed = now - g_last_rod;
	g_last_rod = now;

	// Update the current rotation angle (adjusted by the elapsed time)
	// limit the angle to move smoothly between +20 and -85 degrees:
	//  if(angle >  120.0 && g_angleRate01 > 0) g_angleRate01 = -g_angleRate01;
	//  if(angle < -120.0 && g_angleRate01 < 0) g_angleRate01 = -g_angleRate01;
 if(g_angle01 >= 180 && g_angleRate01 > 0) g_angleRate01 = -g_angleRate01;
 if(g_angle01 <= 0 && g_angleRate01 < 0) g_angleRate01 = -g_angleRate01;
	g_angle01 = g_angle01 + (g_angleRate01 * elapsed) / 1000.0;
	// g_angle01 %= 360*3;
}

// animate function for body
function animate3() {
	var now = Date.now();
	var elapsed = now - g_last_robot;
	g_last_robot = now;
	// Update the current rotation angle (adjusted by the elapsed time)
	// limit the angle to move smoothly between +20 and -85 degrees:
	//  if(angle >  120.0 && g_angleRate01 > 0) g_angleRate01 = -g_angleRate01;
	//  if(angle < -120.0 && g_angleRate01 < 0) g_angleRate01 = -g_angleRate01;
	if(g_angle02 >= 120 && g_angleRate02 > 0) g_angleRate02 = -g_angleRate02;
	if(g_angle02 <= 60 && g_angleRate02 < 0) g_angleRate02 = -g_angleRate02;
	g_angle02 = g_angle02 + (g_angleRate02 * elapsed) / 1000.0;

	g_angle04 = g_angle04 + (g_angleRate04 * elapsed) / 1000.0;

	// if(g_angle03 >= 120 && g_angleRate03 > 0) g_angleRate03 = -g_angleRate03;
	// if(g_angle03 <= 60 && g_angleRate03 < 0) g_angleRate03 = -g_angleRate03;
	// g_angle03 = g_angle03 + (g_angleRate03 * elapsed) / 1000.0;
}


// animate function for legs
function animate4() {
	var now = Date.now();
	var elapsed = now - g_last_upper_arm;
	g_last_upper_arm = now;
	// Update the current rotation angle (adjusted by the elapsed time)
	// limit the angle to move smoothly between +20 and -85 degrees:
	//  if(angle >  120.0 && g_angleRate01 > 0) g_angleRate01 = -g_angleRate01;
	//  if(angle < -120.0 && g_angleRate01 < 0) g_angleRate01 = -g_angleRate01;
	if(g_angle03 >= 120 && g_angleRate03 > 0) g_angleRate03 = -g_angleRate03;
	if(g_angle03 <= 90 && g_angleRate03 < 0) g_angleRate03 = -g_angleRate03;
	g_angle03 = g_angle03 + (g_angleRate03 * elapsed) / 1000.0;

	// if(g_angle03 >= 120 && g_angleRate03 > 0) g_angleRate03 = -g_angleRate03;
	// if(g_angle03 <= 60 && g_angleRate03 < 0) g_angleRate03 = -g_angleRate03;
	// g_angle03 = g_angle03 + (g_angleRate03 * elapsed) / 1000.0;
}



//==================HTML Button Callbacks
function nextShape() {
	shapeNum += 1;
	if(shapeNum >= shapeMax) shapeNum = 0;
}

function spinDown() {
	ANGLE_STEP -= 25;
}

function spinUp() {
	ANGLE_STEP += 25;
}

function runStop() {
	if(ANGLE_STEP*ANGLE_STEP > 1) {
		myTmp = ANGLE_STEP;
		g_angleRateTmp = g_angleRate01;
		g_angleRate01 = 0;
		ANGLE_STEP = 0;
	}
	else {
		ANGLE_STEP = myTmp;
		g_angleRate01 = g_angleRateTmp;
	}
}

function controlSpinRobot() {
	if (g_angleRate04 * g_angleRate04 > 1) {
		tmp04 = g_angleRate04;
		g_angleRate04 = 0;
	}
	else {
		g_angleRate04 = tmp04;
	}
}


function spinDown2() {
	g_angleRate02 -= 10;
	g_angleRate03 -= 10;
}

function spinUp2() {
	g_angleRate02 += 10;
	g_angleRate03 += 10;
}

function runStop2() {
	if(g_angleRate02 * g_angleRate02 > 1) {
		g_angleRateTmp2 = g_angleRate02;
		g_angleRateTmp3 = g_angleRate03;
		g_angleRate02 = 0;
		g_angleRate03 = 0;
	}
	else {
		g_angleRate02 = g_angleRateTmp2;
		g_angleRate03 = g_angleRateTmp3;
	}
}



// function myMouseDown(ev) {
// //==============================================================================
// // Called when user PRESSES down any mouse button;
// // 									(Which button?    console.log('ev.button='+ev.button);   )
// // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
// //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
//
// // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
// 	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
// 	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
// 	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
// //  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
//
// 	// Convert to Canonical View Volume (CVV) coordinates too:
// 	var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
// 		(g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
// 	var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
// 		(g_canvas.height/2);
// //	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
//
// 	g_isDrag = true;											// set our mouse-dragging flag
// 	g_xMclik = x;													// record where mouse-dragging began
// 	g_yMclik = y;
// 	// report on webpage
// 	document.getElementById('MouseAtResult').innerHTML =
// 		'Mouse At: '+x.toFixed(5)+', '+y.toFixed(5);
// };
//
//
// function myMouseMove(ev) {
// //==============================================================================
// // Called when user MOVES the mouse with a button already pressed down.
// // 									(Which button?   console.log('ev.button='+ev.button);    )
// // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
// //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
//
// 	if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'
//
// 	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
// 	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
// 	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
// 	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
// //  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
//
// 	// Convert to Canonical View Volume (CVV) coordinates too:
// 	var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
// 		(g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
// 	var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
// 		(g_canvas.height/2);
// //	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);
//
// 	// find how far we dragged the mouse:
// 	g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
// 	g_yMdragTot += (y - g_yMclik);
// 	// Report new mouse position & how far we moved on webpage:
// 	document.getElementById('MouseAtResult').innerHTML =
// 		'Mouse At: '+x.toFixed(5)+', '+y.toFixed(5);
// 	document.getElementById('MouseDragResult').innerHTML =
// 		'Mouse Drag: '+(x - g_xMclik).toFixed(5)+', '+(y - g_yMclik).toFixed(5);
//
// 	g_xMclik = x;													// Make next drag-measurement from here.
// 	g_yMclik = y;
//
// 	move_x = x;
// 	move_y = y;
// };
//
// function myMouseUp(ev) {
// //==============================================================================
// // Called when user RELEASES mouse button pressed previously.
// // 									(Which button?   console.log('ev.button='+ev.button);    )
// // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
// //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
//
// // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
// 	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
// 	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
// 	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
// //  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
//
// 	// Convert to Canonical View Volume (CVV) coordinates too:
// 	var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
// 		(g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
// 	var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
// 		(g_canvas.height/2);
// 	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
//
// 	g_isDrag = false;											// CLEAR our mouse-dragging flag, and
// 	// accumulate any final bit of mouse-dragging we did:
// 	g_xMdragTot += (x - g_xMclik);
// 	g_yMdragTot += (y - g_yMclik);
// 	// Report new mouse position:
// 	document.getElementById('MouseAtResult').innerHTML =
// 		'Mouse At: '+x.toFixed(5)+', '+y.toFixed(5);
// 	console.log('myMouseUp: g_xMdragTot,g_yMdragTot =',g_xMdragTot,',\t',g_yMdragTot);
// };

function myMouseClick(ev) {
//=============================================================================
// Called when user completes a mouse-button single-click event
// (e.g. mouse-button pressed down, then released)
//
//    WHICH button? try:  console.log('ev.button='+ev.button);
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

	// STUB
	console.log("myMouseClick() on button: ", ev.button);
	rodlength += 0.2;
	console.log(rodlength);
}

function myMouseDblClick(ev) {
//=============================================================================
// Called when user completes a mouse-button double-click event
//
//    WHICH button? try:  console.log('ev.button='+ev.button);
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

	// STUB
	console.log("myMouse-DOUBLE-Click() on button: ", ev.button);
	console.log(g_angleRate01, g_angleRateTmp);

	if(ANGLE_STEP*ANGLE_STEP > 1) {
		Tmp = ANGLE_STEP;
		tmp2 = g_angleRate01;
		ANGLE_STEP = 0;
		g_angleRate01 = 0;
		document.getElementById("start-top").innerHTML = "Top stops";
	}
	else {
		ANGLE_STEP = Tmp;
		g_angleRate01 = tmp2;
		document.getElementById("start-top").innerHTML = "Top is spinning";
	}
	rodlength -= 0.2;
}

function myKeyDown(kev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard;
//
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of a mess of JavaScript keyboard event handling,
// see:    http://javascript.info/tutorial/keyboard-events
//
// NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
//        'keydown' event deprecated several read-only properties I used
//        previously, including kev.charCode, kev.keyCode.
//        Revised 2/2019:  use kev.key and kev.code instead.
//
// Report EVERYTHING in console:
	console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key,
		"\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
		"\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);

// and report EVERYTHING on webpage:
	document.getElementById('KeyDownResult').innerHTML = ''; // clear old results
	document.getElementById('KeyModResult' ).innerHTML = '';
	// key details:
	document.getElementById('KeyModResult' ).innerHTML =
		"   --kev.code:"+kev.code   +"      --kev.key:"+kev.key+
		"<br>--kev.ctrlKey:"+kev.ctrlKey+" --kev.shiftKey:"+kev.shiftKey+
		"<br>--kev.altKey:"+kev.altKey +"  --kev.metaKey:"+kev.metaKey;

	switch(kev.code) {
		case "KeyP":
			console.log("Pause/unPause!\n");                // print on console,
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found p/P key. Pause/unPause!';   // print on webpage
			if(g_isRun==true) {
				g_isRun = false;    // STOP animation
				runStop();
				runStop2();
				document.getElementById("stop/start").innerText = "both object stop spinning!"
			}
			else {
				g_isRun = true;     // RESTART animation
				runStop();
				runStop2();
				document.getElementById("stop/start").innerText = "both object start spinning!"
				// tick();
			}
			break;
		//------------------WASD navigation-----------------
		case "KeyD":
			theta += 0.03;
			break;
		case "KeyA":
			theta -= 0.03;
			break;
		case "KeyS":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
			turn_height -= 0.03;
			break;
		case "KeyW":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
			turn_height += 0.03;
			break;
		case "KeyH":
			g_EyeZ += 0.1;
			break;
		case "KeyG":
			g_EyeZ -= 0.1;
			break;
		// case "KeyS":
		// 	console.log("s/S key: Move BACK!\n");
		// 	document.getElementById('KeyDownResult').innerHTML =
		// 		'myKeyDown() found s/Sa key. Move BACK.';
		// 	if(g_robot_isRun == false) {
		// 		g_robot_isRun = true;    // start
		// 		controlSpinRobot();
		// 		document.getElementById("spin-the-robot").innerText = "Robot is spinning in a circle!"
		// 	}
		// 	else {
		// 		g_robot_isRun = false;     // stop-
		// 		controlSpinRobot();
		// 		document.getElementById("spin-the-robot").innerText = "";
		// 		// tick();
		// 	}
		// 	break;
		// case "KeyW":
		// 	console.log("w/W key: Move FWD!\n");
		// 	document.getElementById('KeyDownResult').innerHTML =
		// 		'myKeyDown() found w/W key. Move FWD!';
		// 	break;
		//----------------Arrow keys------------------------
		case "ArrowLeft":
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Left Arrow='+kev.keyCode;
			g_EyeX -= Math.cos(theta) * sideway;
			g_EyeY -= -Math.sin(theta) * sideway;
			break;
		case "ArrowRight":
			console.log('right-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():Right Arrow:keyCode='+kev.keyCode;
			g_EyeX -= -Math.cos(theta) * sideway;
			g_EyeY -= Math.sin(theta) * sideway;
			break;
		case "ArrowUp":
			console.log('   up-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():   Up Arrow:keyCode='+kev.keyCode;
			g_EyeX += Math.sin(theta) * forward;
			g_EyeY += Math.cos(theta) * forward;
			g_EyeZ += turn_height * forward;
			break;
		case "ArrowDown":
			console.log(' down-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Down Arrow:keyCode='+kev.keyCode;
			g_EyeX -= Math.sin(theta) * forward;
			g_EyeY -= Math.cos(theta) * forward;
			g_EyeZ -= turn_height * forward;
			break;
		default:
			console.log("UNUSED!");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): UNUSED!';
			break;
	}
}

