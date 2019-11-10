//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 7: HelloCube.js (c) 2012 matsuda
// became:
//
// HelloCube_Resize.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		--replaced cuon-matrix.js library with cuon-matrix-quat.js library
//				(has push-down stack and quaternions, demonstrated in 
//				starter code  '5.04jt.ControlQuaternion.html'
//		--resize 'canvas' to fill top 3/4 of browser window's available space
//		--demonstrate multiple viewports (see 'gl.viewport()' functions
//		--Adjust camera aspect ratios to match viewport aspect ratios
//		--NOTE how 'drawResize()' fcn has NO arguments -- instead, it uses WebGL
//				commands to get its own local vars for the 'canvas' and 'gl' objects.
//
//	1/2017 J. Tumblin fix:
//		--moved 'draw()' command inside drawResize() to ensure initial on-screen
//			result is correct, as well as re-drawing when browser gets re-sized.
//------------------------------------------------------------------------------

// Vertex shader program:
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

//Global vars (so we can call draw() without arguments)
var canvas;
var mvpMatrix = new Matrix4();
var n, u_MvpMatrix;

function main() {
//==============================================================================
  // Retrieve <canvas> element 
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL; 
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set the vertex coordinates and color
  n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set clear color and enable hidden surface removal
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage location of u_MvpMatrix
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }
	// NEW! -- make new canvas to fit the browser-window size;
  drawResize();   // On this first call, Chrome browser seems to use the
  								// initial fixed canvas size we set in the HTML file;
  								// But by default Chrome opens its browser at the same
  								// size & location where you last closed it, so
  drawResize();   // Call drawResize() a SECOND time to re-size canvas to
  								// match the current browser size.
  // Don't Worry!
  // The program only does this 'double-call' when the program begins.
  // All subsequent screen re-drawing is done when user re-sizes the browser,
  // which is  done by this line in the HTML file:
  //         <body onload="main()" onresize="drawResize()">
  
  // CHALLENGE:  Suppose we draw something ANIMATED (e.g. Week3, BasicShapes);
  //						How can you do this double-call when the program starts, but
  //						call drawResize() only once for all subsequent re-drawing?
}

function initVertexBuffers(gl) {
//==============================================================================
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  var verticesColors = new Float32Array([
    // Vertex coordinates and color
     1.0,  1.0,  1.0,     1.0,  1.0,  1.0,  // v0 White
    -1.0,  1.0,  1.0,     1.0,  0.0,  1.0,  // v1 Magenta
    -1.0, -1.0,  1.0,     1.0,  0.0,  0.0,  // v2 Red
     1.0, -1.0,  1.0,     1.0,  1.0,  0.0,  // v3 Yellow
     1.0, -1.0, -1.0,     0.0,  1.0,  0.0,  // v4 Green
     1.0,  1.0, -1.0,     0.0,  1.0,  1.0,  // v5 Cyan
    -1.0,  1.0, -1.0,     0.0,  0.0,  1.0,  // v6 Blue
    -1.0, -1.0, -1.0,     0.0,  0.0,  0.0   // v7 Black
  ]);

  // Indices of the vertices
  var indices = new Uint8Array([
    0, 1, 2,   0, 2, 3,    // front
    0, 3, 4,   0, 4, 5,    // right
    0, 5, 6,   0, 6, 1,    // up
    1, 6, 7,   1, 7, 2,    // left
    7, 4, 3,   7, 3, 2,    // down
    4, 7, 6,   4, 6, 5     // back
 ]);

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  var indexBuffer = gl.createBuffer();
  if (!vertexColorBuffer || !indexBuffer) {
    return -1;
  }

  // Write the vertex coordinates and color to the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);
  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function draw(gl) {
//==============================================================================
// re-draw contents of all viewports.

  // Clear color and depth buffer for ENTIRE canvas:
  // (careful! clears contents of ALL viewports!)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
	//----------------------Create, fill UPPER viewport------------------------
	gl.viewport(0,											 				// Viewport lower-left corner
							gl.drawingBufferHeight/2, 			// location(in pixels)
  						gl.drawingBufferWidth, 					// viewport width,
  						gl.drawingBufferHeight/2);			// viewport height in pixels.

	var vpAspect = gl.drawingBufferWidth /			// On-screen aspect ratio for
								(gl.drawingBufferHeight/2);		// this camera: width/height.

  // For this viewport, set camera's eye point and the viewing volume:
  mvpMatrix.setPerspective(30, 				// fovy: y-axis field-of-view in degrees 	
  																		// (top <-> bottom in view frustum)
  													vpAspect, // aspect ratio: width/height
  													1, 100);	// near, far (always >0).
  mvpMatrix.lookAt(	3, 3, 7, 					// 'Center' or 'Eye Point',
  									0, 0, 0, 					// look-At point,
  									0, 1, 0);					// View UP vector, all in 'world' coords.

  // Pass the model view projection matrix to graphics hardware thru u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Draw the cube
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
  
	//----------------------Create, fill LOWER viewport------------------------
	gl.viewport(0,											 				// Viewport lower-left corner
							0, 															// location(in pixels)
  						gl.drawingBufferWidth, 					// viewport width,
  						gl.drawingBufferHeight/2);			// viewport height in pixels.

	vpAspect = gl.drawingBufferWidth /					// On-screen aspect ratio for
						(gl.drawingBufferHeight/2);				// this camera: width/height.

  // For this viewport, set camera's eye point and the viewing volume:
  mvpMatrix.setPerspective(24.0, 				// fovy: y-axis field-of-view in degrees 	
  																		// (top <-> bottom in view frustum)
  													vpAspect, // aspect ratio: width/height
  													1, 100);	// near, far (always >0).
  mvpMatrix.lookAt(	4, 2, 8, 					// 'Center' or 'Eye Point',
  									0, 0, 0, 					// look-At point,
  									0, 1, 0);					// View UP vector, all in 'world' coords.

  // Pass the model view projection matrix to graphics hardware thru u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  // Draw the cube
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function drawResize() {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	var nuCanvas = document.getElementById('webgl');	// get current canvas
	var nuGL = getWebGLContext(nuCanvas);							// and context:

	//Report our current browser-window contents:

	console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);		
 console.log('Browser window: innerWidth,innerHeight=', 
																innerWidth, innerHeight);	// http://www.w3schools.com/jsref/obj_window.asp

	
	//Make canvas fill the top 3/4 of our browser window:
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*3/4;
	// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
	draw(nuGL);				// draw in all viewports.
}
