import { Component } from '@angular/core';
import {mat4, vec3, vec4} from './gl-matrix.js'
import {loadTexture, initShaderProgram, loadShader} from './gl_utils';

import {GlProgram} from './gl_program';

import {Camera} from './camera';

import {Car} from './car';
import {Floor} from './floor';

import {Square} from './square';
import {Triangle} from './triangle';
import {makeVec, addVec} from './math_utils';

import { CAR_BODY } from 'src/app/renderables/car_body_renderable';
import { WHEEL } from 'src/app/renderables/wheel_renderable';
import {FLOOR_RENDERABLE} from 'src/app/renderables/floor_renderable';


interface Point {
  x: number;
  y: number;
}

const VERTEX_SHADER_SOURCE = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform vec4 uColor;
  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec3 vLighting;
  varying highp vec4 vColor;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    // Apply lighting effect
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);
    vColor = uColor;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  varying highp vec3 vLighting;
  varying highp vec4 vColor;

  void main() {
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
  projectionMatrix: mat4;
  camera: Camera;

  car: Car;
  floor: Floor;
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
      } else if (e.keyCode === 87) {
        // 'W'
        this.car.translation[2] -= 1;
      } else if (e.keyCode === 83) {
        // 'S'
        this.car.translation[2] += 1;
      } else if (e.keyCode === 73) {
        // 'I'
        this.camera.moveUp();
      } else if (e.keyCode === 75) {
        // 'K'
        this.camera.moveDown();
      } else if (e.keyCode === 79) {
        // 'O'
        this.camera.zoomIn();
      } else if (e.keyCode === 80) {
        // 'P'
        this.camera.zoomOut();
      } else if (e.keyCode === 74) {
        // 'J'
        this.camera.orbitLeft();
      }else if (e.keyCode === 76) {
        // 'K'
        this.camera.orbitRight();
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

    this.camera = new Camera();

    this.projectionMatrix = this.createProjectionMatrix();

    this.car = new Car();
    this.floor = new Floor();
    this.gameLoop(0);
  }

  initRenderables() {
    CAR_BODY.initBuffers(this.gl);
    WHEEL.initBuffers(this.gl);
    FLOOR_RENDERABLE.initBuffers(this.gl);
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
      this.floor.update(elapsedMs);
    }
  }

  private createProjectionMatrix(): mat4 {
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
    gl.enable(gl.CULL_FACE);            // Don't draw back facing triangles.
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // Tell WebGL to use our program when drawing
    gl.useProgram(this.program.program);
  
    // Set the shader uniforms
    gl.uniformMatrix4fv(
        this.program.uniformLocations.projectionMatrix,
        false,
        this.projectionMatrix);

    gl.uniformMatrix4fv(
      this.program.uniformLocations.viewMatrix,
      false,
      this.camera.getViewMatrix());
    
    this.car.render(this.gl, this.program);
    this.floor.render(this.gl, this.program);
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

    this.projectionMatrix = this.createProjectionMatrix();
  }
}

