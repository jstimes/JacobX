import { mat4, vec3, vec4 } from 'gl-matrix'

import { Camera } from 'src/app/camera';

import { GameObject } from 'src/app/game_objects/game_object';
import { Car } from 'src/app/game_objects/car';
import { Floor } from 'src/app/game_objects/floor';
import { StreetLight } from 'src/app/game_objects/street_light';
import { PointLight, LightType, Light, DirectionalLight } from 'src/app/lights/lights';

import { makeVec, makeVec4, addVec } from 'src/app/math_utils';

import { CAR_BODY_RENDERABLE } from 'src/app/renderables/car_body_renderable';
import { WHEEL_RENDERABLE } from 'src/app/renderables/wheel_renderable';
import { FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';

import { StandardShaderProgram, MAX_POINT_LIGHTS, MAX_SPOT_LIGHTS } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { BaseShaderProgram } from 'src/app/shaders/base_shader_program';
import { SHADERS } from 'src/app/shaders/shaders';
import { SQUARE_RENDERABLE } from 'src/app/renderables/square_renderable';
import { CONTROLS, Key } from 'src/app/controls';
import { Scene } from 'src/app/scene';
import { HALF_SPHERE_RENDERABLE } from 'src/app/renderables/half_sphere_renderable';
import { Ai } from 'src/app/ai';

export class Main {
  private readonly title = 'JacobX';
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext;
  private lastTime: number = 0;
  private scene: Scene;

  constructor() {
    document.body.style.backgroundColor = '#000000';

    this.canvas = document.createElement('canvas');
    this.canvas.style.backgroundColor = '#FF0000';
    this.canvas.style.width = `100vw`;
    this.canvas.style.height = `100vh`;
    this.canvas.style.display = 'block';
    document.body.appendChild(this.canvas);

    const controls = document.createElement('div');
    controls.innerHTML = 'A/D - steer<br>W/S - accelerate/break<br>SPACE - shoot';
    controls.style.position = 'absolute';
    controls.style.color = '#fdaaaa';
    const controlMargin = `12px`;
    controls.style.top = controlMargin;
    controls.style.left = controlMargin;
    document.body.appendChild(controls);

    this.gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });

    // Only continue if WebGL is available and working
    if (this.gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    SHADERS.init(this.gl);
    this.initRenderables();
    this.initScene();

    this.gameLoop(0);
  }

  gameLoop(now: number) {
    const elapsedMs = now - this.lastTime;
    this.scene.update(elapsedMs);
    this.scene.render();
    this.lastTime = now;

    window.requestAnimationFrame((elapsedTime: number) => {
      this.gameLoop(elapsedTime);
    });
  }

  initRenderables() {
    CAR_BODY_RENDERABLE.initBuffers(this.gl);
    WHEEL_RENDERABLE.initBuffers(this.gl);
    FLOOR_RENDERABLE.initBuffers(this.gl);
    CUBE_RENDERABLE.initBuffers(this.gl);
    SQUARE_RENDERABLE.initBuffers(this.gl);
    HALF_SPHERE_RENDERABLE.initBuffers(this.gl);
  }

  private initScene() {
    const maxDirectionalLight = 0.3;
    const clearColor = makeVec4(0.3, 0.4, 0.9, 1.0);
    const floor = new Floor();
    const directionalLight: DirectionalLight = {
      lightType: LightType.DIRECTIONAL,
      direction: makeVec(-2, -3, -1),
      lightColor: {
        ambient: makeVec4(.1, .1, .1, 1.0),
        diffuse: makeVec4(maxDirectionalLight, maxDirectionalLight, maxDirectionalLight, 1.0),
        specular: makeVec4(maxDirectionalLight, maxDirectionalLight, maxDirectionalLight, 1.0),
      },
    };
    const sceneParams = {
      clearColor,
      fog: {
        fogColor: clearColor,
        fogNear: 25.0,
        fogFar: 750.0,
      },
      directionalLight,
      floor,
    };
    this.scene = new Scene(this.canvas, this.gl, sceneParams);

    const playerCar = new Car(floor);
    playerCar.bindControls();
    // playerCar.activateShield();
    this.scene.setPlayerCar(playerCar);

    const carMats = [
      {
        ambient: makeVec4(.2, 0, .2, 1),
        diffuse: makeVec4(.2, 0, .2, 1),
        specular: makeVec4(.2, 0, .2, 1),
        shininess: 1,
      },
      {
        ambient: makeVec4(.14, .4, 0, 1),
        diffuse: makeVec4(.14, .4, 0, 1),
        specular: makeVec4(.14, .4, 0, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0, .7, .2, 1),
        diffuse: makeVec4(0, .7, .2, 1),
        specular: makeVec4(0, .7, .2, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0, .27, .62, 1),
        diffuse: makeVec4(0, .27, .62, 1),
        specular: makeVec4(0, .27, .62, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.1, .107, .42, 1),
        diffuse: makeVec4(0.1, .107, .42, 1),
        specular: makeVec4(0.1, .107, .42, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.3, .37, .32, 1),
        diffuse: makeVec4(0.3, .37, .32, 1),
        specular: makeVec4(0.3, .37, .32, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.4, .2, .2, 1),
        diffuse: makeVec4(0.4, .2, .2, 1),
        specular: makeVec4(0.4, .2, .2, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(.1, .9, .1, 1),
        diffuse: makeVec4(.1, .9, .1, 1),
        specular: makeVec4(.1, .9, .1, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(.8, .7, .5, 1),
        diffuse: makeVec4(.8, .7, .5, 1),
        specular: makeVec4(.8, .7, .5, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(.4, .4, .4, 1),
        diffuse: makeVec4(.4, .4, .4, 1),
        specular: makeVec4(.4, .4, .4, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.6, .78, .82, 1),
        diffuse: makeVec4(0.6, .78, .82, 1),
        specular: makeVec4(0.6, .78, .82, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.35, .53, .33, 1),
        diffuse: makeVec4(0.35, .53, .33, 1),
        specular: makeVec4(0.35, .53, .33, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.123, .456, .789, 1),
        diffuse: makeVec4(0.123, .456, .789, 1),
        specular: makeVec4(0.123, .456, .789, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.555, .222, .669, 1),
        diffuse: makeVec4(0.555, .222, .669, 1),
        specular: makeVec4(0.555, .222, .669, 1),
        shininess: 1,
      }, {
        ambient: makeVec4(0.2, .765, .299, 1),
        diffuse: makeVec4(0.2, .765, .299, 1),
        specular: makeVec4(0.2, .765, .299, 1),
        shininess: 1,
      }
    ];
    for (let i = 0; i < MAX_SPOT_LIGHTS - 1; i++) {
      const car = new Car(floor);
      car.bodyMaterial = carMats[i];
      car.position = makeVec(Math.random() * 50 - 50, 0.0, i * 50 - 50);
      const randRot = Math.random() * -Math.PI / 4;
      car.yRotationAngle = randRot;
      car.ai = new Ai(car, this.scene);
      this.scene.addCar(car);
    }
  }
}

let isInitialized = false;
document.onreadystatechange = () => {
  if (document.readyState === 'complete' && !isInitialized) {
    new Main();
    isInitialized = true;
  }
}