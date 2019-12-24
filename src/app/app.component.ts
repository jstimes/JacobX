import { Component } from '@angular/core';
import {mat4, vec3, vec4} from './gl-matrix.js'
import {loadTexture, initShaderProgram, loadShader} from './gl_utils';

import {GlProgram} from './gl_program';

import {Car} from './car';
import {Square} from './square';
import {Triangle} from './triangle';
import {makeVec, addVec} from './math_utils';
import { CAR_BODY } from 'src/app/renderables/car_body';


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
  car: Car;
  program: GlProgram;

  shouldUpdate = false;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('width', `${WIDTH}`);
    this.canvas.setAttribute('height', `${HEIGHT}`);

    document.onkeydown = (e: KeyboardEvent) => {
      console.log(e.keyCode);
      if (e.keyCode === 32) {
        // Space
        this.shouldUpdate = !this.shouldUpdate;
      }
      if (e.keyCode === 87) {
        this.car.translation[2] -= 1;
      }
      if (e.keyCode === 83) {
        this.car.translation[2] += 1;
      }
    };
    
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

    this.program = new GlProgram(this.gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.initRenderables();
    this.car = new Car();
    this.gameLoop(0);
  }

  initRenderables() {
    CAR_BODY.initBuffers(this.gl);
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
    if (this.shouldUpdate) {
      this.car.rotationAngle += elapsedMs / 1000;
    }
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
  
    // Tell WebGL to use our program when drawing
    gl.useProgram(this.program.program);
  
    // Set the shader uniforms
    gl.uniformMatrix4fv(
        this.program.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    this.car.render(this.gl, this.program);
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

