// HelloPoint1.js (c) 2012 matsuda
// Vertex shader program
/*
// MODIFIED J. Tumblin 1/2017  'HelloMatrixDegen.js'

to demonstrate that matrices have finite precision, and thus contain tiny errors that can accumulate. THUS you should never write code that endlessly concatenates rotation-only matrices (e.g. an 'orientation' matrix made by continually re-applying rotation matrices), because eventually the result accumulates numerical errors that cause wholly unpredictable non-rotation transforms, including non-uniform scale, translation, shear, skew, and even unwanted projective distortions.  These matrices 'degenerate' -- they're no longer pure 3D  rotations.

In the example below, we start with an identity matrix, create a tiny rotation of 360degrees/mySiz, then concatenate it 'mySiz' times.  Instead of the
identity matrix you might expect, we get something significantly different: our matrix has become 'degenerate' as a result of concatenating vast numbers of seemingly insignificant errors due to computing with finite precision (e.g. 64 bit floats). because concatenating vast numbers of matrices will also concatenate vast numbers of errors.

*/

var VSHADER_SOURCE = 
  'void main() {\n' +
  '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);\n' + // Set the vertex coordinates of the one and only point
  '  gl_PointSize = 10.0;\n' +                    // Set the point size. CAREFUL! MUST be float, not integer value!!
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'void main() {\n' +
  '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' + // Set the point color
  '}\n';

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
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
  console.log('Hey! we have all our shaders initialized!');

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw a point
  gl.drawArrays(gl.POINTS, 0, 1);
  
  //============================================================
  // Lets play around with Vector4 objects:
  //============================================================
  /*
  var aVec = new Vector4();   
  var bVec = new Vector4();
  aVec[0] = 4.0; aVec[1] = 3.0; aVec[2] = 2.0; aVec[3] = 0.0;   
  bVec[0] = 1.0; bVec[1] = 2.0; bVec[2] = 3.0; bVec[3] = 0.0;
  // x,y,z,w=0 (vector, not point)
  console.log('\n---------------Vector4 Ops------------\n');
  res = 3;		// number of digits we will print on console log
  tmp = aVec;
  console.log('aVec: x=', tmp[0].toFixed(res), 
										'y=', tmp[1].toFixed(res), 
									  'z=', tmp[2].toFixed(res), 
									 	'w=', tmp[3].toFixed(res),'\n');
  tmp = bVec;
  console.log('bVec: x=', tmp[0].toFixed(res), 
										'y=', tmp[1].toFixed(res), 
										'z=', tmp[2].toFixed(res), 
									 	'w=', tmp[3].toFixed(res),'\n');
	// You add more here ... see our HTML file for instructions...
	*/
	
  //============================================================
	// Lets play around with Matrix 4 objects
  //============================================================
  var aMat = new Matrix4();
	aMat.setIdentity();
	var mySiz = 3000;
	var count;
	
	console.log('Rotate aMat by (360/'+mySiz+') degrees around the (1,3,5) axis,'+mySiz+' times:');
	for(count = 0; count < mySiz; count++) {
			aMat.rotate(-360.0/mySiz, 1.0, 3.0, 5.0);
		}
		console.log('Result SHOULD be a perfect identity matrix, but it is not:');
		aMat.printMe();
		console.log('Instead, this degenerate matrix accumulated errors that');
		console.log('cause other, unpredictable, non-rotation transforms.  BAD!');
		console.log('THUS you should never use matrix multiplies to combine a');
		console.log('long series of rotations.  Instead, use quaternions.');
	}

