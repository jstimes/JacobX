import { Component } from '@angular/core';

import { mat4, vec3, vec4 } from './gl-matrix.js'

import {Camera} from './camera';

import { GameObject } from 'src/app/game_objects/game_object';
import { Car } from 'src/app/game_objects/car';
import { Floor } from 'src/app/game_objects/floor';
import { PointLight, LightType, Light } from 'src/app/lights/lights';

import { makeVec, makeVec4, addVec } from './math_utils';

import { CAR_BODY_RENDERABLE } from 'src/app/renderables/car_body_renderable';
import { WHEEL_RENDERABLE } from 'src/app/renderables/wheel_renderable';
import  {FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';

import { StandardShaderProgram, MAX_POINT_LIGHTS } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { BaseShaderProgram } from 'src/app/shaders/base_shader_program';
import { SHADERS } from 'src/app/shaders/shaders';
import { SQUARE_RENDERABLE } from 'src/app/renderables/square_renderable';
import { CONTROLS, Key } from 'src/app/controls';
import { StreetLight } from 'src/app/game_objects/street_light';
import { Scene } from 'src/app/scene';


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

  lastTime = 0;

  // Lighting
  scene: Scene;

  // GameObjects
  gameObjects: GameObject[] = [];
  car: Car;
  floor: Floor;

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

    SHADERS.init(this.gl);
    this.initRenderables();

    this.camera = new Camera();
    CONTROLS.addAssignedControl(Key.M, 'Toggle chase cam');

    this.projectionMatrix = this.createProjectionMatrix();
    this.initScene();

    this.floor = new Floor();
    this.car = new Car(this.floor);
    this.car.bindControls();
    
    this.gameObjects = [this.car, this.floor];
    for (let i=0; i< 20; i++) {
      const car = new Car(this.floor);
      car.position = makeVec(Math.random() * 500 - 250, 0.0, Math.random() * 500 - 250);
      this.gameObjects.push(car);
    }

    for (let i=0; i < MAX_POINT_LIGHTS; i++) {
      const streetLight = new StreetLight();
      streetLight.position = makeVec(50, 0, i * 50 - 50);
      this.gameObjects.push(streetLight);
    }

    this.gameLoop(0);
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
      const carOffsetUp = vec3.scale(vec3.create(), this.car.getUpVector(), 13);
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
    this.gl.clearColor(this.scene.clearColor[0], this.scene.clearColor[1], this.scene.clearColor[2], this.scene.clearColor[3]);
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.CULL_FACE);            // Don't draw back facing triangles.
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    this.useProgram(SHADERS.standard);

    SHADERS.standard.setDirectionalLight(this.gl, this.scene.directionalLight);

    // TODO - need array of light positions.
    let pointLightCount = 0;
    this.getAllLights().forEach(light => {
      switch(light.lightType) {
        case LightType.POINT:
          SHADERS.standard.setPointLight(this.gl, light, pointLightCount++);
          break;
        case LightType.SPOT:
          SHADERS.standard.setSpotLight(this.gl, light);
          break;
      }
    });

    gl.uniform3fv(
      SHADERS.standard.standardShaderUniformLocations.cameraPosition,
      this.camera.cameraPosition);

    gl.uniform1f(SHADERS.standard.standardShaderUniformLocations.fogNear, this.scene.fog.fogNear);
    gl.uniform1f(SHADERS.standard.standardShaderUniformLocations.fogFar, this.scene.fog.fogFar);
    gl.uniform4fv(SHADERS.standard.standardShaderUniformLocations.fogColor, this.scene.fog.fogColor);
    
    this.gameObjects.forEach((gameObject: GameObject) => {
      gameObject.render(this.gl, SHADERS.standard);
    });

    this.useProgram(SHADERS.light);
    this.gameObjects.forEach((gameObject: GameObject) => {
      gameObject.renderLight(this.gl, SHADERS.light);
    });
  }

  // Note - doesn't include the directional light (sun)
  private getAllLights(): Light[] {
    const lights = [];
    this.gameObjects.forEach((gameObject: GameObject) => {
      gameObject.getLights().forEach((light: Light) => {
        lights.push(light);
      });
    });
    return lights;
  }

  private initScene() {
    this.scene = new Scene();
    this.scene.clearColor = makeVec4(0.3, 0.4, 0.9, 1.0);
    this.scene.fog = {
      fogColor: this.scene.clearColor,
      fogNear: 25.0,
      fogFar: 750.0,
    }
    const maxDirectionalLight = 0.3;
    this.scene.directionalLight = {
      lightType: LightType.DIRECTIONAL,
      direction: makeVec(-2, -3, -1),
      lightColor: {
        ambient: makeVec(.1, .1, .1),
        diffuse: makeVec(maxDirectionalLight, maxDirectionalLight, maxDirectionalLight),
        specular: makeVec(maxDirectionalLight, maxDirectionalLight, maxDirectionalLight),
      },
    };
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

