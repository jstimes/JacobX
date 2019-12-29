import { Component } from '@angular/core';

import { mat4, vec3, vec4 } from './gl-matrix.js'

import {Camera} from './camera';

import { GameObject } from 'src/app/game_objects/game_object';
import { Car } from 'src/app/game_objects/car';
import { Floor } from 'src/app/game_objects/floor';
import { PointLight } from 'src/app/game_objects/point_light';

import { makeVec, addVec } from './math_utils';

import { CAR_BODY_RENDERABLE } from 'src/app/renderables/car_body_renderable';
import { WHEEL_RENDERABLE } from 'src/app/renderables/wheel_renderable';
import  {FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';

import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { BaseShaderProgram } from 'src/app/shaders/base_shader_program';
import { SHADERS } from 'src/app/shaders/shaders';
import { SQUARE_RENDERABLE } from 'src/app/renderables/square_renderable';


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
  isChaseCam: boolean = true;

  // Lighting
  reverseLightDirection: vec3;
  // Smaller values = more spread out; high values = more focused highlight.
  specularShininess = 69;

  // GameObjects
  gameObjects: GameObject[] = [];
  car: Car;
  floor: Floor;
  pointLight: PointLight;

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
  
    this.gl.clearColor(0.1, 0.8, 0.1, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    SHADERS.init(this.gl);
    this.initRenderables();

    this.camera = new Camera();

    this.projectionMatrix = this.createProjectionMatrix();
    this.reverseLightDirection = makeVec(2, 3, 1);
    vec3.normalize(this.reverseLightDirection, this.reverseLightDirection);

    this.car = new Car();
    this.floor = new Floor();
    this.pointLight = new PointLight();
    this.pointLight.position = makeVec(4, 10, 0);
    this.gameObjects = [this.car, this.floor, this.pointLight];

    this.gameLoop(0);
  }

  initRenderables() {
    CAR_BODY_RENDERABLE.initBuffers(this.gl);
    WHEEL_RENDERABLE.initBuffers(this.gl);
    FLOOR_RENDERABLE.initBuffers(this.gl);
    CUBE_RENDERABLE.initBuffers(this.gl);
    SQUARE_RENDERABLE.initBuffers(this.gl);
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
    this.gameObjects.forEach((gameObject: GameObject) => {
      gameObject.update(elapsedMs);
    });
    if (this.isChaseCam) {
      this.camera.target = vec3.clone(this.car.position);
      this.camera.cameraPosition = vec3.add(vec3.create(), this.camera.target, makeVec(0, 15, 50));
    }
    this.camera.update(elapsedMs);
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
    const zFar = 1000.0;
  
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
    this.gl.clearColor(0.3, 0.4, 0.9, 1.0);
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.CULL_FACE);            // Don't draw back facing triangles.
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // Tell WebGL to use our program when drawing
    this.useProgram(SHADERS.standard);

    gl.uniform3fv(
      SHADERS.standard.standardShaderUniformLocations.reverseLightDirection,
      this.reverseLightDirection);

    gl.uniform3fv(
      SHADERS.standard.standardShaderUniformLocations.pointLightPosition,
      this.pointLight.position);

    gl.uniform3fv(
      SHADERS.standard.standardShaderUniformLocations.cameraPosition,
      this.camera.cameraPosition);

    gl.uniform1f(
      SHADERS.standard.standardShaderUniformLocations.specularShininess, 
      this.specularShininess);
    
    this.car.render(this.gl, SHADERS.standard);
    this.floor.render(this.gl, SHADERS.standard);

    this.useProgram(SHADERS.light);
    this.pointLight.render(this.gl, SHADERS.light);
  }

  private useProgram(program: BaseShaderProgram) {
    this.gl.useProgram(program.program);
    // Set the shader uniforms
    this.gl.uniformMatrix4fv(
      program.uniformLocations.projectionMatrix,
      false,
      this.projectionMatrix);

    this.gl.uniformMatrix4fv(
      program.uniformLocations.viewMatrix,
      false,
      this.camera.getViewMatrix());
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

