import { Component } from '@angular/core';

import { mat4, vec3, vec4 } from './gl-matrix.js'

import {Camera} from './camera';

import { GameObject } from 'src/app/game_objects/game_object';
import { Car } from 'src/app/game_objects/car';
import { Floor } from 'src/app/game_objects/floor';
import { PointLight } from 'src/app/lights/point_light';

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
import { CONTROLS, Key } from 'src/app/controls';
import { StreetLight } from 'src/app/game_objects/street_light';


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
  isChaseCam: boolean = false;

  lastTime = 0;

  // Lighting
  reverseLightDirection: vec3;
  // Smaller values = more spread out; high values = more focused highlight.
  specularShininess = 69;

  // GameObjects
  gameObjects: GameObject[] = [];
  car: Car;
  floor: Floor;
  streetLight: StreetLight;

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
    CONTROLS.addAssignedControl(Key.M, 'Toggle chase cam');
    this.camera.target = makeVec(0, 0, -250)
    this.camera.cameraPosition = makeVec(550, 100, -250);

    this.projectionMatrix = this.createProjectionMatrix();
    this.reverseLightDirection = makeVec(2, 3, 1);
    vec3.normalize(this.reverseLightDirection, this.reverseLightDirection);

    this.floor = new Floor();
    this.car = new Car(this.floor);
    this.streetLight = new StreetLight();
    this.streetLight.position = makeVec(25, 0, -25);
    this.gameObjects = [this.car, this.floor, this.streetLight];

    this.gameLoop(0);
  }

  private getHeadlightPosition(): vec3 {
    const localPosition = makeVec(0, CAR_BODY_RENDERABLE.groundOffset + CAR_BODY_RENDERABLE.height / 2.0, -CAR_BODY_RENDERABLE.zOffset - 1.0);
    return vec3.transformMat4(vec3.create(), localPosition, this.car.getCarBodyModel());
  }

  initRenderables() {
    CAR_BODY_RENDERABLE.initBuffers(this.gl);
    WHEEL_RENDERABLE.initBuffers(this.gl);
    FLOOR_RENDERABLE.initBuffers(this.gl);
    CUBE_RENDERABLE.initBuffers(this.gl);
    SQUARE_RENDERABLE.initBuffers(this.gl);
  }

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
    this.camera.update(elapsedMs);
    this.updateChaseCam();
  }

  private updateChaseCam(): void {
    if (this.isChaseCam) {
      this.camera.target = vec3.clone(this.car.position);
      const carOffsetBack = vec3.scale(vec3.create(), this.car.getBackwardVector(), 40);
      const carOffsetUp = vec3.scale(vec3.create(), this.car.getUpVector(), 15);
      const carOffset = vec3.add(vec3.create(), carOffsetBack, carOffsetUp);
      this.camera.cameraPosition = vec3.add(vec3.create(), this.camera.target, carOffset);
    }
    if (CONTROLS.isKeyDown(Key.M)) {
      this.isChaseCam = !this.isChaseCam;
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

    // TODO - need array of light positions.
    this.getAllLights().forEach(light => {
      gl.uniform3fv(
          SHADERS.standard.standardShaderUniformLocations.pointLightPosition,
          light.position);
    });

    gl.uniform3fv(
      SHADERS.standard.standardShaderUniformLocations.cameraPosition,
      this.camera.cameraPosition);

    gl.uniform1f(
      SHADERS.standard.standardShaderUniformLocations.specularShininess, 
      this.specularShininess);
    
    this.gameObjects.forEach((gameObject: GameObject) => {
      gameObject.render(this.gl, SHADERS.standard);
    });

    this.useProgram(SHADERS.light);
    this.gameObjects.forEach((gameObject: GameObject) => {
      gameObject.renderLight(this.gl, SHADERS.light);
    });
    
  }

  private getAllLights(): PointLight[] {
    const lights = [];
    this.gameObjects.forEach((gameObject: GameObject) => {
      gameObject.getLights().forEach((light: PointLight) => {
        lights.push(light);
      });
    });
    return lights;
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

