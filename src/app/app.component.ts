import { Component } from '@angular/core';

import { mat4, vec3, vec4 } from './gl-matrix.js'

import {Camera} from './camera';

import { GameObject } from 'src/app/game_objects/game_object';
import { Car } from 'src/app/game_objects/car';
import { Floor } from 'src/app/game_objects/floor';
import { StreetLight } from 'src/app/game_objects/street_light';
import { PointLight, LightType, Light, DirectionalLight } from 'src/app/lights/lights';

import { makeVec, makeVec4, addVec } from './math_utils';

import { CAR_BODY_RENDERABLE } from 'src/app/renderables/car_body_renderable';
import { WHEEL_RENDERABLE } from 'src/app/renderables/wheel_renderable';
import  {FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';

import { StandardShaderProgram, MAX_POINT_LIGHTS, MAX_SPOT_LIGHTS } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { BaseShaderProgram } from 'src/app/shaders/base_shader_program';
import { SHADERS } from 'src/app/shaders/shaders';
import { SQUARE_RENDERABLE } from 'src/app/renderables/square_renderable';
import { CONTROLS, Key } from 'src/app/controls';
import { Scene } from 'src/app/scene';
import { HALF_SPHERE_RENDERABLE } from 'src/app/renderables/half_sphere_renderable';
import {Ai} from 'src/app/ai';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'JacobX';
  canvas: HTMLCanvasElement;

  gl: WebGLRenderingContext;
  lastTime: number = 0;

  scene: Scene;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.gl = this.canvas.getContext('webgl', {alpha: true, premultipliedAlpha: false});
  
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
    playerCar.hasShield = true;
    this.scene.setPlayerCar(playerCar);
    for (let i=0; i<MAX_SPOT_LIGHTS-1; i++) {
        const car = new Car(floor);
        car.position = makeVec(Math.random() * 50 - 50, 0.0, i * 50 - 50);
        const randRot = Math.random() * -Math.PI / 4;
        car.yRotationAngle = randRot;
        car.ai = new Ai(car, this.scene);
        this.scene.addCar(car);
    }
  }
}

