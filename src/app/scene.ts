import {vec3, vec4, mat4} from './gl-matrix.js';
import { makeVec, makeVec4, addVec } from './math_utils';

import { CONTROLS, Key } from 'src/app/controls';

import {Camera} from './camera';

import { GameObject } from 'src/app/game_objects/game_object';
import { Car } from 'src/app/game_objects/car';
import { Floor } from 'src/app/game_objects/floor';
import {Projectile} from 'src/app/game_objects/projectile';
import {PowerUp, Shield} from 'src/app/game_objects/powerup';
import { StreetLight } from 'src/app/game_objects/street_light';
import { LightColor, DirectionalLight, PointLight, LightType, Light, SpotLight } from 'src/app/lights/lights';

import { SHADERS } from 'src/app/shaders/shaders';
import { StandardShaderProgram, MAX_POINT_LIGHTS, MAX_SPOT_LIGHTS } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { BaseShaderProgram } from 'src/app/shaders/base_shader_program';
import { COLLISION, Ray, Box } from 'src/app/collision';

interface FogParams {
    fogColor: vec4;
    fogNear: number;
    fogFar: number;
}

interface SceneParams {
    clearColor: vec4;
    floor: Floor;
    fog: FogParams;
    directionalLight: DirectionalLight;
}

export class Scene {
    gl: WebGLRenderingContext;
    canvas: HTMLCanvasElement;

    projectionMatrix: mat4;
    camera: Camera;
    isChaseCam: boolean = true;
    
    sceneParams: SceneParams;

    // GameObjects
    gameObjects: GameObject[] = [];
    playerCar: Car;
    cars: Car[] = [];
    streetLights: StreetLight[] = [];
    projectiles: Projectile[] = [];

    powerUps: PowerUp[] = [];
    powerUpSpawns: vec3[]
    maxPowerUps = 5;

    constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, sceneParams: SceneParams) {
        this.canvas = canvas;
        this.gl = gl;
        this.sceneParams = sceneParams;

        this.projectionMatrix = this.createProjectionMatrix();

        this.camera = new Camera();
        CONTROLS.addAssignedControl(Key.M, 'Toggle chase cam');
        
        this.gameObjects = [this.sceneParams.floor];

        for (let i=0; i < MAX_POINT_LIGHTS / 2; i++) {
            const streetLight = new StreetLight();
            streetLight.position = makeVec(50, 0, i * 50 - 50);
            this.streetLights.push(streetLight);
            this.gameObjects.push(streetLight);
        }

        this.powerUpSpawns = [];
        this.maxPowerUps = MAX_POINT_LIGHTS / 2;
        for (let j=0; j<this.maxPowerUps; j++) {
            const x = j * 125 - 250;
            const z = -275; //j * 50 - 250;
            const y = this.sceneParams.floor.getYAtXZ(x, z) + 4.0;
            const pos = makeVec(x, y, z)
            this.powerUpSpawns.push(pos);
            const powerUp = this.getRandomPowerUp();
            powerUp.position = pos;
            this.powerUps.push(powerUp);
            this.gameObjects.push(powerUp);
        }
    }

    getRandomPowerUp(): PowerUp {
        return new Shield();
    }

    setPlayerCar(car: Car) {
        this.playerCar = car;
        this.cars.push(this.playerCar);
        this.gameObjects.push(this.playerCar);
    }

    addCar(car: Car) {
        this.cars.push(car);
        this.gameObjects.push(car);
    }
      
    update(elapsedMs: number) {
        this.gameObjects.forEach((gameObject: GameObject) => {
            gameObject.update(elapsedMs);
        });
        const carBoxes: Box[] = [];
        this.cars.forEach((car: Car) => {
            car.getProjectiles().forEach((proj: Projectile) => {
                this.projectiles.push(proj);
                this.gameObjects.push(proj);
            });
            carBoxes.push(car.getAxisAlignedBox());
        });

        // Check for projectile-car collisions.
        for (let i=this.projectiles.length - 1; i>=0; i--) {
            const proj = this.projectiles[i];
            if (proj.timeElapsedMs > 2000) {
                this.projectiles.splice(i, 1);
                this.gameObjects.splice(this.gameObjects.indexOf(proj), 1);
                continue;
            }
            const ray = new Ray(proj.position, proj.initialVelocity);
            carBoxes.forEach((box: Box, index: number) => {
                let hit = false;
                const car = this.cars[index];
                if (car.getHasShield()) {
                    hit = vec3.length(vec3.sub(vec3.create(), car.position, proj.position)) < car.shieldRadius;
                } else if (COLLISION.pointInBox(proj.position, box)) {  
                   hit = true;
                }
                if (hit) {
                    console.log("target hit");
                    car.onHit(proj);
                    this.projectiles.splice(i, 1);
                    this.gameObjects.splice(this.gameObjects.indexOf(proj), 1);
                }
            });
        }
        // Check for dead cars.
        for (let j=this.cars.length - 1; j>=0; j--) {
            const car = this.cars[j];
            if (car.health <= 0) {
                this.cars.splice(j, 1);
                this.gameObjects.splice(this.gameObjects.indexOf(car), 1);
            }
        }

        // Check for cars picking up power ups.
        for (let j=this.cars.length - 1; j>=0; j--) {
            const car = this.cars[j];
            for (let p = this.powerUps.length - 1; p >= 0; p--) {
                const powerUp = this.powerUps[p];
                if (vec3.length(vec3.sub(vec3.create(), powerUp.position, car.position)) < 10) {
                    car.onPowerUp(powerUp);
                    this.powerUps.splice(p, 1);
                    this.gameObjects.splice(this.gameObjects.indexOf(powerUp), 1);
                }
            }
        }
        this.camera.update(elapsedMs); 
        this.updateChaseCam();
    }

    render() {
        const gl = this.gl;
        this.resize();
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        this.gl.clearColor(this.sceneParams.clearColor[0], this.sceneParams.clearColor[1], this.sceneParams.clearColor[2], this.sceneParams.clearColor[3]);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.CULL_FACE);            // Don't draw back facing triangles.
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      
        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
        this.useProgram(SHADERS.standard);
        this.setSceneParamsUniforms();

        let pointLightCount = 0;
        let spotLightCount = 0;
        const lights = this.getAllLights();
        SHADERS.standard.setPointLights(this.gl,lights.filter(light => light.lightType === LightType.POINT) as PointLight[]);
        SHADERS.standard.setSpotLights(this.gl, lights.filter(light => light.lightType === LightType.SPOT) as SpotLight[]);
    
        gl.uniform3fv(
          SHADERS.standard.standardShaderUniformLocations.cameraPosition,
          this.camera.cameraPosition);
        
        this.gameObjects.forEach((gameObject: GameObject) => {
          gameObject.render(this.gl, SHADERS.standard);
        });
        this.gameObjects.forEach((gameObject: GameObject) => {
            gameObject.renderTranslucents(this.gl, SHADERS.standard);
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

    private updateChaseCam(): void {
        if (this.isChaseCam) {
            this.camera.target = vec3.clone(this.playerCar.position);
            const carOffsetBack = vec3.scale(vec3.create(), this.playerCar.getBackwardVector(), 40);
            const carOffsetUp = vec3.scale(vec3.create(), this.playerCar.getUpVector(), 13);
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

    private setSceneParamsUniforms() {
        const gl = this.gl;
        SHADERS.standard.setDirectionalLight(gl, this.sceneParams.directionalLight);
        gl.uniform1f(SHADERS.standard.standardShaderUniformLocations.fogNear, this.sceneParams.fog.fogNear);
        gl.uniform1f(SHADERS.standard.standardShaderUniformLocations.fogFar, this.sceneParams.fog.fogFar);
        gl.uniform4fv(SHADERS.standard.standardShaderUniformLocations.fogColor, this.sceneParams.fog.fogColor);
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