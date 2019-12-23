import { Component } from '@angular/core';
import {mat4, vec3, vec4} from './gl-matrix.js'
import {loadTexture, initShaderProgram, loadShader} from './gl_utils';

import {Square} from './square';
import {Triangle} from './triangle';
import {makeVec, addVec} from './math_utils';

interface AttribLocations {
  vertexPosition: number;
  vertexNormal: number;
}
interface UniformLocations {
  projectionMatrix: WebGLUniformLocation;
  modelViewMatrix: WebGLUniformLocation;
  normalMatrix: WebGLUniformLocation;
}
interface Program {
  program: WebGLProgram;
  attribLocations: AttribLocations;
  uniformLocations: UniformLocations;
}

interface Buffers {
  position: WebGLBuffer;
  normal: WebGLBuffer;
}

interface Point {
  x: number;
  y: number;
}

const VERTEX_SHADER_SOURCE = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec3 vLighting;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

    // Apply lighting effect
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  varying highp vec3 vLighting;

  uniform sampler2D uSampler;

  void main() {
    highp vec4 vColor = vec4(1.0, 0.0, 0.0, 1.0);
    gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
  }
`;

const HEIGHT = 300;
const WIDTH = 400;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'JacobX';
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: Program;
  buffers: Buffers;
  car: Car;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('width', `${WIDTH}`);
    this.canvas.setAttribute('height', `${HEIGHT}`);
    
    this.gl = this.canvas.getContext('webgl');
  
    // Only continue if WebGL is available and working
    if (this.gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  
    // Set clear color to black, fully opaque
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    const shaderProgram = initShaderProgram(this.gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexNormal: this.gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        normalMatrix: this.gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
      },
    };
    this.car = new Car();
    this.initBuffers();
    this.gameLoop(0);
  }

  lastTime = 0;

  gameLoop(now: number) {
    const elapsedMs = now - this.lastTime;
    this.lastTime = now;
    this.update(elapsedMs);
    this.render();

    window.requestAnimationFrame((elapsedTime: number) => {
      this.gameLoop(elapsedTime);
    });
  }
  
  update(elapsedMs: number) {
    // this.car.rotationAngle += elapsedMs / 1000;
  }

  private getProjectionMatrix(): mat4 {
    const projectionMatrix = mat4.create();

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
  
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
  
    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                      fieldOfView,
                      aspect,
                      zNear,
                      zFar);
    return projectionMatrix;
  }

  private render() {
    const gl = this.gl;
    this.resize();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    const projectionMatrix = this.getProjectionMatrix();
  
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();
    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(modelViewMatrix,     // destination matrix
                  modelViewMatrix,     // matrix to translate
                  [0, -6, -30]);  // amount to translate

    mat4.rotate(modelViewMatrix,  // destination matrix
      modelViewMatrix,  // matrix to rotate
      this.car.rotationAngle,   // amount to rotate in radians
      [0, 1, 0]);       // axis to rotate around

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
      const numComponents = 3;  // pull out 3 values per iteration
      const type = gl.FLOAT;    // the data in the buffer is 32bit floats
      const normalize = false;  // don't normalize
      const stride = 0;         // how many bytes to get from one set of values to the next
                                // 0 = use type and numComponents above
      const offset = 0;         // how many bytes inside the buffer to start from
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.vertexAttribPointer(
          this.program.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
        this.program.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the normals from
    // the normal buffer into the vertexNormal attribute.
    {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
      gl.vertexAttribPointer(
          this.program.attribLocations.vertexNormal,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          this.program.attribLocations.vertexNormal);
    }
  
    // Tell WebGL to use our program when drawing
    gl.useProgram(this.program.program);
  
    // Set the shader uniforms
    gl.uniformMatrix4fv(
        this.program.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        this.program.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    gl.uniformMatrix4fv(
        this.program.uniformLocations.normalMatrix,
        false,
        normalMatrix);
  
    {
      const vertexCount = this.car.positions.length / 3;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      // gl.LINE_STRIP
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }
  }

  private initBuffers() {
    const gl = this.gl;
    this.car.init();

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(this.car.positions),
                  gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.car.normals),
                  gl.STATIC_DRAW);
  
    this.buffers = {
      position: positionBuffer,
      normal: normalBuffer,
    };
  }

  // Thanks
  // https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
  private resize() {
    const realToCSSPixels = window.devicePixelRatio;

    // Lookup the size the browser is displaying the canvas in CSS pixels
    // and compute a size needed to make our drawingbuffer match it in
    // device pixels.
    const displayWidth  = Math.floor(this.gl.canvas.clientWidth  * realToCSSPixels);
    const displayHeight = Math.floor(this.gl.canvas.clientHeight * realToCSSPixels);
   
    // Check if the canvas is not the same size.
    if (this.canvas.width  !== displayWidth ||
      this.canvas.height !== displayHeight) {
   
      // Make the canvas the same size
      this.canvas.width  = displayWidth;
      this.canvas.height = displayHeight;
    }
  }
}

class Car {
  rotationAngle: number = 0;
  squares: Square[] = [];

  positions: number[] = [];
  normals: number[] = [];

  constructor() {
    const bodyWidth = 4;
    const xOffset = bodyWidth / 2;
    const groundOffset = 2;
    const height = 4;
    const yMin = groundOffset;
    const yMax = groundOffset + height;
    const length = 20;
    const zOffset = length / 2;

    const makeBody = true;

    if (makeBody) {

      // Front four car body vertices:
      const tlf = makeVec(-xOffset, yMax, -zOffset);
      const blf = makeVec(-xOffset, yMin, -zOffset);
      const trf = makeVec(xOffset, yMax, -zOffset);
      const brf = makeVec(xOffset, yMin, -zOffset);

      // Back four vertices
      const tlb = makeVec(-xOffset, yMax, zOffset);
      const blb = makeVec(-xOffset, yMin, zOffset);
      const trb = makeVec(xOffset, yMax, zOffset);
      const brb = makeVec(xOffset, yMin, zOffset);

      const frontFace: Square = new Square({
        a: trf, b: brf, c: blf, d: tlf,
      });
      this.squares.push(frontFace);

      const backFace: Square = new Square({
        a: tlb, b: blb, c: brb, d: trb,
      });
      this.squares.push(backFace);
      
      const topFace: Square = new Square({
        a: tlf, b: tlb, c: trb, d: trf,
      });
      this.squares.push(topFace);

      const bottomFace: Square =  new Square({
        a: brf, b: brb, c: blb, d: blf,
      });
      this.squares.push(bottomFace);
      
      const leftFace: Square =  new Square({
        a: tlf, b: blf, c: blb, d: tlb,
      });
      this.squares.push(leftFace);

      const rightFace: Square = new Square({
        a: trb, b: brb, c: brf, d: trf,
      });
      this.squares.push(rightFace);
    }

    // WHEELS:
    // Cylinder with circles on left,right
    const wheelWidth = 2;
    const wheelRadius = 2;
    const wheelXOffset = wheelWidth / 2;

    const wheelSquares: Square[] = [];
    const circleSquares: Square[] = [];
    const deltaTheta = Math.PI / 12;

    // First make a circle centered at 0,0,0, about the x-axis
    const circleCenter = makeVec(0, 0, 0);
    for(let theta = 0; theta < Math.PI * 2; theta += deltaTheta) {
      // X is fixed, z = cos, y = sin
      const cosA = Math.cos(theta);
      const sinA = Math.sin(theta);
      const ptA = makeVec(0, sinA * wheelRadius, cosA * wheelRadius);
      const cosB = Math.cos(theta + deltaTheta);
      const sinB = Math.sin(theta + deltaTheta);
      const ptB = makeVec(0, sinB * wheelRadius, cosB * wheelRadius);
      circleSquares.push(new Square({a: ptB, b: circleCenter, c: circleCenter, d: ptA}));
    }

    // Then copy and translate the circle to make left and right faces of wheel:
    circleSquares.forEach((sq: Square) => {
      const leftSquare = sq.clone().translate(makeVec(-wheelXOffset, 0, 0));
      // const rightSquare = sq.clone().translate(makeVec(wheelXOffset, 0, 0));
      // wheelSquares.push(leftSquare);
      // wheelSquares.push(rightSquare);

      this.squares.push(leftSquare);
    });

    // THen copy all squares of a wheel and move them to each of the wheel positions.
    const wheelZOffset = 6;
    const frontLeftTrans = makeVec(-xOffset, groundOffset, -wheelZOffset);
    wheelSquares.forEach((sq: Square) => {
      const frontLeftWheel = sq.clone().translate(frontLeftTrans);

      this.squares.push(frontLeftWheel);
    });

  }

  init() {
    this.positions = [];
    this.normals = [];
    const triangles: Triangle[] = [];
    for (let square of this.squares) {
      const triA = new Triangle(square.a, square.b, square.d);
      const triB = new Triangle(square.b, square.c, square.d);
      triangles.push(triA);
      triangles.push(triB);
    }
    for (let triangle of triangles) {
      const triNormal = triangle.getNormal();
      vec3.normalize(triNormal, triNormal);
      addVec(this.positions, triangle.a);
      addVec(this.positions, triangle.b);
      addVec(this.positions, triangle.c);
      addVec(this.normals, triNormal);
      addVec(this.normals, triNormal);
      addVec(this.normals, triNormal);
    }
  }
}

