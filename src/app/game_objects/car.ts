import {vec3, mat4} from 'src/app/gl-matrix.js';

import {makeVec, makeVec4, addVec, hasSignChange, sign, Square, EPSILON} from 'src/app/math_utils';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { CAR_BODY_RENDERABLE } from 'src/app/renderables/car_body_renderable';
import { WHEEL_RENDERABLE } from 'src/app/renderables/wheel_renderable';
import { CONTROLS } from 'src/app/controls';
import { Key } from 'src/app/controls';
import {GameObject} from './game_object';
import {Projectile} from 'src/app/game_objects/projectile';
import { Floor } from 'src/app/game_objects/floor';
import { Light, SpotLight, LightType } from 'src/app/lights/lights';
import {Material} from 'src/app/material';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';
import {HALF_SPHERE_RENDERABLE} from 'src/app/renderables/half_sphere_renderable';
import { Gun } from 'src/app/game_objects/gun';
import { Box } from 'src/app/collision';
import {Ai} from 'src/app/ai';
import { PowerUp, PowerUpType } from 'src/app/game_objects/powerup';

const X_AXIS = makeVec(1, 0, 0);
const Y_AXIS = makeVec(0, 1, 0);
const Z_AXIS = makeVec(0, 0, -1);

export interface Input {
  isTurningLeft: boolean;
  isTurningRight: boolean;
  isGasPedalDown: boolean;
  isBrakePedalDown: boolean;
  isShooting: boolean;
}

export class Car extends GameObject {
  isRenderAabb: boolean = false;

  isUsingControls: boolean = false;
  ai: Ai;

  gun: Gun = new Gun();
  projectiles: Projectile[] = [];

  health: number = 100;
  private hasShield: boolean = false;
  private shieldHealth: number = 100;
  readonly MAX_SHIELD_HEALTH = 100;

  // Colors/materials
  readonly bodyColor = [1, 0, 0, 1];
  readonly wheelColor = [.2, .2, .2, 1];

  readonly bodyMaterial: Material = {
    ambient: makeVec4(1, 0, 0, 1),
    diffuse: makeVec4(1, 0, 0, 1),
    specular: makeVec4(1, 0, 1, 1),
    shininess: 1,
  };

  readonly wheelMaterial: Material = {
    ambient: makeVec4(.2, .2, .2, 1),
    diffuse: makeVec4(.2, .2, .2, 1),
    specular: makeVec4(1, 1, 1, 1),
    shininess: 69,
  };

  readonly headlightLocalPosition: vec3 = makeVec(0, CAR_BODY_RENDERABLE.groundOffset + CAR_BODY_RENDERABLE.height / 2.0, -CAR_BODY_RENDERABLE.zOffset + 0.25);
  readonly headlightDownRotation: mat4 = mat4.rotateX(mat4.create(), mat4.create(), -Math.PI / 16.0);
  readonly headlight: SpotLight = {
    lightType: LightType.SPOT,
    position: this.headlightLocalPosition,
    lightColor: {
      ambient: makeVec4(.3, .3, .3, 1.0),
      diffuse: makeVec4(1, 1, 1, 1.0),
      specular: makeVec4(1, 1, 1, 1.0),
    },
    direction: makeVec(0, 0, -1),
    lowerLimit: Math.cos(Math.PI / 8),
    upperLimit: Math.cos(Math.PI / 6),
    constant: 1,
    linear: 0.009,
    quadratic: 0.0032,
  };

  xRotationAngle: number = 0;
  yRotationAngle: number = 0;
  zRotationAngle: number = 0;

  velocity: vec3 = makeVec(0,0,0);
  acceleration: vec3 = makeVec(0, 0, 0);
  readonly accelerationPerGas: number = 1.1;
  readonly restDecelerationRate: number = 10;
  readonly brakeDecelerationRate: number = 30;
  readonly maxAccelerationMagnitude: number = 20;
  readonly maxVelocityMagnitude: number = 100;

  wheelTurn: number = 0;
  readonly wheelReturnToCenterRate: number = Math.PI / 80;
  readonly wheelTurnRate: number = Math.PI / 180;
  readonly maxWheelTurn: number = Math.PI / 6;

  // Car body params.
  readonly bodyWidth: number = 4;
  readonly xOffset: number = this.bodyWidth / 2;
  readonly groundOffset: number = 2;
  readonly wheelZOffset: number = 6;

  // These are relative to local space.
  readonly frontLeftWheelPosition: vec3;
  readonly backLeftWheelPosition: vec3;
  readonly backRightWheelPosition: vec3;
  readonly frontRightWheelPosition: vec3;
  
  constructor(private readonly floor: Floor) {
    super();
    this.frontLeftWheelPosition = makeVec(-this.xOffset, this.groundOffset, -this.wheelZOffset);
    this.backLeftWheelPosition = makeVec(-this.xOffset, this.groundOffset,this. wheelZOffset);
    this.backRightWheelPosition = makeVec(this.xOffset, this.groundOffset, this.wheelZOffset);
    this.frontRightWheelPosition = makeVec(this.xOffset, this.groundOffset, -this.wheelZOffset);
  }

  bindControls() {
    this.isUsingControls = true;
    CONTROLS.addAssignedControl(Key.W, "gas");
    CONTROLS.addAssignedControl(Key.S, "brake");
    CONTROLS.addAssignedControl(Key.A, "turn left");
    CONTROLS.addAssignedControl(Key.D, "turn right");
    CONTROLS.addAssignedControl(Key.SPACE, "shoot");
  }

  getUpVector(): vec3 {
    const backWheelToFront = vec3.sub(vec3.create(), this.frontRightWheelPosition, this.backRightWheelPosition);
    const leftWheelToRight = vec3.sub(vec3.create(), this.backRightWheelPosition, this.backLeftWheelPosition);
    const up = vec3.cross(vec3.create(), leftWheelToRight, backWheelToFront);
    return vec3.normalize(vec3.create(), up);
  }

  getForwardVector(): vec3 {
    const backToFront = vec3.sub(vec3.create(), this.frontRightWheelPosition, this.backRightWheelPosition);
    const localForward = vec3.normalize(vec3.create(), backToFront);
    const worldForward = vec3.transformMat4(vec3.create(), localForward, this.getRotationMatrix());
    return vec3.normalize(worldForward, worldForward);
  }

  getBackwardVector(): vec3 {
    const frontToBack = vec3.sub(vec3.create(), this.backRightWheelPosition, this.frontRightWheelPosition)
    const localBackward = vec3.normalize(vec3.create(), frontToBack);
    const worldBackward = vec3.transformMat4(vec3.create(), localBackward, this.getRotationMatrix());
    return vec3.normalize(worldBackward, worldBackward);
  }

  getInput(): Input {
    if (this.isUsingControls) {
      const isTurningLeft = CONTROLS.isKeyDown(Key.A);
      const isTurningRight = CONTROLS.isKeyDown(Key.D);
      const isGasPedalDown = CONTROLS.isKeyDown(Key.W);
      const isBrakePedalDown = CONTROLS.isKeyDown(Key.S);
      const isShooting = CONTROLS.isKeyDown(Key.SPACE);
      return {
        isTurningLeft,
        isTurningRight,
        isGasPedalDown,
        isBrakePedalDown,
        isShooting,
      };
    }
    return this.ai.getInput();
  }

  update(elapsedMs: number): void {
    const elapsedSeconds = elapsedMs / 1000;
    // First update position based on current velocity.
    const deltaPosition = vec3.scale(vec3.create(), this.velocity, elapsedSeconds);
    vec3.add(this.position, this.position, deltaPosition);

    // Then calculate new acceleration.
    const velocityNormalized = vec3.normalize(vec3.create(), this.velocity);
    const velocityMag = vec3.length(this.velocity);

    const {
        isTurningLeft,
        isTurningRight,
        isGasPedalDown,
        isBrakePedalDown,
        isShooting,
      } = this.getInput();

    // Handle shooting:
    this.gun.update(elapsedMs);
    if (isShooting && this.gun.isReadyToShoot()) {
      const gunPosition = vec3.create();
      const forward = this.getForwardVector();
      const offset = vec3.clone(forward);
      vec3.scale(offset, offset, CAR_BODY_RENDERABLE.zOffset + 8.0);
      vec3.add(offset, offset, makeVec(0, 3, 0));
      vec3.add(gunPosition, this.position, offset);
      this.projectiles.push(this.gun.shoot(gunPosition, forward, this.getRotationMatrix()));
      console.log("shot fired");
    }
    
    // Determine wheel orientation:
    const areWheelsStraight = Math.abs(this.wheelTurn) < EPSILON;
    if (isTurningRight && !isTurningLeft) {
      this.wheelTurn = Math.max(-this.maxWheelTurn, this.wheelTurn - this.wheelTurnRate);
    } else if (isTurningLeft && !isTurningRight) {
      this.wheelTurn = Math.min(this.maxWheelTurn, this.wheelTurn + this.wheelTurnRate);
    } else if (!areWheelsStraight && !isTurningLeft && !isTurningRight) {
      const newWheelTurn = this.wheelReturnToCenterRate * -sign(this.wheelTurn) + this.wheelTurn;
      if (hasSignChange(this.wheelTurn, newWheelTurn)) {
        this.wheelTurn = 0.0;
      } else {
        this.wheelTurn = newWheelTurn;
      }
    }

    const accelerationMag = vec3.length(this.acceleration);

    if (!areWheelsStraight) {
      const distanceBetweenWheelsVec = vec3.create();
      vec3.sub(distanceBetweenWheelsVec, this.frontLeftWheelPosition, this.backLeftWheelPosition);
      const distanceBetweenWheels = vec3.length(distanceBetweenWheelsVec);
      const turnCircleRadius = distanceBetweenWheels / Math.sin((Math.PI / 2) - this.wheelTurn);
      const angularVelocity = velocityMag / turnCircleRadius;
      const rotationAngleUpdate = sign(this.wheelTurn) * angularVelocity * elapsedSeconds;

      // TODO should use this.getUpVector()
      const rotatedVelocity = vec3.rotateY(
          vec3.create(), 
          velocityNormalized, 
          makeVec(0, 0, 0), 
          rotationAngleUpdate);
      this.velocity = vec3.scale(rotatedVelocity, rotatedVelocity, velocityMag);

      const accelerationNormalized = vec3.normalize(vec3.create(), this.acceleration);
      const rotatedAcceleration = vec3.rotateY(
        vec3.create(), accelerationNormalized, makeVec(0, 0, 0), rotationAngleUpdate);
      this.acceleration = vec3.scale(rotatedAcceleration, rotatedAcceleration, accelerationMag);

      this.yRotationAngle += rotationAngleUpdate;
    }

    const oppositeVelocityNormalized = vec3.scale(vec3.create(), velocityNormalized, -1.0);
    const isCoasting = !isBrakePedalDown && !isGasPedalDown && velocityMag > EPSILON;
    const forward = this.getForwardVector();
    if (isGasPedalDown && !isBrakePedalDown) {
      const acclerationUpdate = vec3.scale(forward, forward, this.accelerationPerGas);
      const newAcceleration = vec3.add(vec3.create(), this.acceleration, acclerationUpdate);
      if (vec3.length(newAcceleration) < this.maxAccelerationMagnitude) {
        this.acceleration = newAcceleration;
      }
      console.log("accelerating");
    } else if (isBrakePedalDown && !isGasPedalDown && velocityMag > EPSILON) {
      vec3.scale(this.acceleration, oppositeVelocityNormalized, this.brakeDecelerationRate);
      console.log("braking");
    } else if (isCoasting) {
      vec3.scale(this.acceleration, oppositeVelocityNormalized, this.restDecelerationRate);
      console.log("coasting");
    }

    // Update velocity based on acceleration:
    const prevVelocity = vec3.clone(this.velocity);
    const newVelocity = vec3.add(vec3.create(), this.velocity, vec3.scale(vec3.create(), this.acceleration, elapsedSeconds));
    const prevNewDot = vec3.dot(prevVelocity, newVelocity);
    if ((isCoasting || isBrakePedalDown) && prevNewDot <= 0.0) {
      console.log("stopping");
      this.velocity = makeVec(0.0, 0.0, 0.0);
      this.acceleration = makeVec(0.0, 0.0, 0.0);
    } else {
      this.velocity = newVelocity;
      const newVelocityMagnitude = vec3.length(this.velocity);
      if (newVelocityMagnitude > this.maxVelocityMagnitude) {
        vec3.normalize(this.velocity, this.velocity);
        vec3.scale(this.velocity, this.velocity, this.maxVelocityMagnitude);
        console.log('reached max velocity');
      }
    }
    
    // Update car body's y position:
    this.position[1] = this.floor.getYAtXZ(this.position[0], this.position[2]);

    // Now rotate so wheels are on ground:
    // First, figure out the rotation about the car's x-axis
    const model = this.getCarBodyModelWithJustYRotation();
    const frontLeftWheelPosWorld = vec3.create();
    const backLeftWheelPosWorld = vec3.create();
    vec3.transformMat4(frontLeftWheelPosWorld, this.frontLeftWheelPosition, model);
    const frontLeftY = this.floor.getYAtXZ(frontLeftWheelPosWorld[0], frontLeftWheelPosWorld[2]);
    vec3.transformMat4(backLeftWheelPosWorld, this.backLeftWheelPosition, model);
    const backLeftY = this.floor.getYAtXZ(backLeftWheelPosWorld[0], backLeftWheelPosWorld[2]);
    const frontLeftWheelWorldWithY = makeVec(frontLeftWheelPosWorld[0], frontLeftY, frontLeftWheelPosWorld[2]);
    let backLeftWheelWorldWithY = makeVec(backLeftWheelPosWorld[0], backLeftY, backLeftWheelPosWorld[2]);

    const backToFront = vec3.sub(vec3.create(), frontLeftWheelWorldWithY, backLeftWheelWorldWithY);
    const backToFrontFlat = vec3.sub(vec3.create(), frontLeftWheelPosWorld, backLeftWheelPosWorld);

    this.xRotationAngle = vec3.angle(backToFront, backToFrontFlat);
    if (backToFrontFlat[1] > backToFront[1]) {
      this.xRotationAngle *= -1.0;
    }

    // Then update model matrix and use to calc rotation about car's Z-axis.
    const xRot = mat4.rotate(mat4.create(), mat4.create(), this.xRotationAngle, X_AXIS);
    mat4.multiply(model, model, xRot);
    vec3.transformMat4(backLeftWheelPosWorld, this.backLeftWheelPosition, model);
    backLeftWheelWorldWithY = makeVec(backLeftWheelPosWorld[0], backLeftY, backLeftWheelPosWorld[2]);
    const backRightWheelPosWorld = vec3.create();
    vec3.transformMat4(backRightWheelPosWorld, this.backRightWheelPosition, model);
    const backRightY = this.floor.getYAtXZ(backRightWheelPosWorld[0], backRightWheelPosWorld[2]);
    const backRightWheelPosWorldWithY = makeVec(backRightWheelPosWorld[0], backRightY, backRightWheelPosWorld[2]);

    const leftToRight = vec3.sub(vec3.create(), backRightWheelPosWorldWithY, backLeftWheelWorldWithY);
    const leftToRightFlat = vec3.sub(vec3.create(), backRightWheelPosWorld, backLeftWheelPosWorld);

    this.zRotationAngle = vec3.angle(leftToRight, leftToRightFlat);
    if (leftToRightFlat[1] < leftToRight[1]) {
      this.zRotationAngle *= -1.0;
    }

    // Finally, update the headlights:
    const finalModel = this.getCarBodyModel();
    this.headlight.position = vec3.transformMat4(vec3.create(), this.headlightLocalPosition, finalModel);
    // Tilt downwards slightly.
    this.headlight.direction = vec3.transformMat4(vec3.create(), this.getForwardVector(), this.headlightDownRotation);
  }

  getProjectiles(): Projectile[] {
    const projs = [];
    this.projectiles.forEach(proj => {
      projs.push(proj);
    });
    this.projectiles = [];
    return projs;
  }

  onHit(projectile: Projectile): void {
    if (this.hasShield) {
      this.shieldHealth -= projectile.damage;
      if (this.shieldHealth < 0) {
        this.hasShield = false;
      }
      return;
    }
    this.health -= projectile.damage;
    this.bodyMaterial.diffuse[0] -= 0.1;
  }

  onPowerUp(powerUp: PowerUp): void {
    debugger;
    switch(powerUp.powerUpType) {
      case PowerUpType.SHIELD:
        this.activateShield();
        console.log("ass");
        break;
    }
  }

  getAxisAlignedBox(): Box {
    const min = makeVec(0, 0, 0);
    const max = makeVec(0, 0, 0);
    const model = this.getCarBodyModel();
    const bottomOffset = makeVec(0, -2, 0);
    const leftFrontBottom = vec3.transformMat4(vec3.create(), makeVec(-this.bodyWidth, 0, -CAR_BODY_RENDERABLE.zOffset), model);
    const leftBackBottom = vec3.transformMat4(vec3.create(), makeVec(-this.bodyWidth, 0, CAR_BODY_RENDERABLE.zOffset), model);
    const rightBackBottom = vec3.transformMat4(vec3.create(), makeVec(this.bodyWidth, 0, CAR_BODY_RENDERABLE.zOffset), model);
    const rightFrontBottom = vec3.transformMat4(vec3.create(), makeVec(this.bodyWidth, 0, -CAR_BODY_RENDERABLE.zOffset), model);
    const yMax = CAR_BODY_RENDERABLE.yMax;
    const leftFrontTop = vec3.transformMat4(vec3.create(), makeVec(-this.bodyWidth, yMax, -CAR_BODY_RENDERABLE.zOffset), model);
    const leftBackTop = vec3.transformMat4(vec3.create(), makeVec(-this.bodyWidth, yMax, CAR_BODY_RENDERABLE.zOffset), model);
    const rightBackTop = vec3.transformMat4(vec3.create(), makeVec(this.bodyWidth, yMax, CAR_BODY_RENDERABLE.zOffset), model);
    const rightFrontTop = vec3.transformMat4(vec3.create(), makeVec(this.bodyWidth, yMax, -CAR_BODY_RENDERABLE.zOffset), model);
    min[0] = Math.min(leftFrontBottom[0], leftBackBottom[0], rightBackBottom[0], rightFrontBottom[0], leftFrontTop[0], leftBackTop[0], rightBackTop[0], rightFrontTop[0]);
    min[1] = Math.min(leftFrontBottom[1], leftBackBottom[1], rightBackBottom[1], rightFrontBottom[1], leftFrontTop[1], leftBackTop[1], rightBackTop[1], rightFrontTop[1]);
    min[2] = Math.min(leftFrontBottom[2], leftBackBottom[2], rightBackBottom[2], rightFrontBottom[2], leftFrontTop[2], leftBackTop[2], rightBackTop[2], rightFrontTop[2]);

    max[0] = Math.max(leftFrontBottom[0], leftBackBottom[0], rightBackBottom[0], rightFrontBottom[0], leftFrontTop[0], leftBackTop[0], rightBackTop[0], rightFrontTop[0]);
    max[1] = Math.max(leftFrontBottom[1], leftBackBottom[1], rightBackBottom[1], rightFrontBottom[1], leftFrontTop[1], leftBackTop[1], rightBackTop[1], rightFrontTop[1]);
    max[2] = Math.max(leftFrontBottom[2], leftBackBottom[2], rightBackBottom[2], rightFrontBottom[2], leftFrontTop[2], leftBackTop[2], rightBackTop[2], rightFrontTop[2]);

    return new Box(min, max);
  }

  getCarBodyModel(): mat4 {
    const carBodyModelMatrix = mat4.create();
    mat4.translate(carBodyModelMatrix,
        carBodyModelMatrix,
        this.position);
  
    mat4.multiply(carBodyModelMatrix, carBodyModelMatrix, this.getRotationMatrix());
    return carBodyModelMatrix;
  }

  getRotationMatrix(): mat4 {
    const rotationMatrix = mat4.create();
    mat4.rotate(rotationMatrix,
      rotationMatrix,
      this.yRotationAngle,
      Y_AXIS);

    mat4.rotate(rotationMatrix,
        rotationMatrix,
        this.xRotationAngle,
        X_AXIS);

    mat4.rotate(rotationMatrix,
        rotationMatrix,
        this.zRotationAngle,
        Z_AXIS);
    return rotationMatrix;
  }

  getCarBodyModelWithJustYRotation(): mat4 {
    const carBodyModelMatrix = mat4.create();
    mat4.translate(carBodyModelMatrix,
        carBodyModelMatrix,
        this.position);

    mat4.rotate(carBodyModelMatrix,
        carBodyModelMatrix,
        this.yRotationAngle,
        Y_AXIS);
    return carBodyModelMatrix;
  }

  getLights(): Light[] {
    return [this.headlight];
  }

  render(gl: WebGLRenderingContext, program: StandardShaderProgram): void {
    const carBodyModelMatrix = this.getCarBodyModel();
    program.setMaterialUniform(gl, this.bodyMaterial);
    CAR_BODY_RENDERABLE.render(gl, program, carBodyModelMatrix);

    program.setMaterialUniform(gl, this.wheelMaterial);
    this.renderWheel(true, carBodyModelMatrix, this.frontLeftWheelPosition, gl, program);
    this.renderWheel(false, carBodyModelMatrix, this.backLeftWheelPosition, gl, program);
    this.renderWheel(false, carBodyModelMatrix, this.backRightWheelPosition, gl, program);
    this.renderWheel(true, carBodyModelMatrix, this.frontRightWheelPosition, gl, program);

    this.renderGun(gl, program);
  }

  renderLight(gl: WebGLRenderingContext, program: LightShaderProgram) {
    program.setColor(gl, makeVec4(1.0, 1.0, 1.0, 1.0));
    const translation = mat4.create();
    mat4.translate(translation, translation, this.headlight.position);
    const scale = .3;
    const model = mat4.create();
    mat4.scale(model, model, [scale, scale ,scale]);
    mat4.multiply(model, this.getRotationMatrix(), model);
    mat4.multiply(model, translation, model);
    CUBE_RENDERABLE.render(gl, program, model);
  }

  private renderGun(gl: WebGLRenderingContext, program: StandardShaderProgram) {

  }

  activateShield() {
    this.hasShield = true;
    this.shieldHealth = this.MAX_SHIELD_HEALTH;
  }

  renderTranslucents(gl: WebGLRenderingContext, program: StandardShaderProgram): void {
    if (this.hasShield) {
      this.renderShield(gl, program);
    }
    if (!this.isRenderAabb) {
      return;
    }

    // Render the AABB
    const box = this.getAxisAlignedBox();
    const model = mat4.create();
    const x = box.bounds[1][0] - box.bounds[0][0]; 
    const y = box.bounds[1][1] - box.bounds[0][1];
    const z = box.bounds[1][2] - box.bounds[0][2];
    mat4.translate(model, model, makeVec(this.position[0], this.position[1] + y/2, this.position[2]));
    mat4.scale(model, model, [
      x/2, y/2, z/2
    ]);
    const shieldMaterial: Material = {
      ambient: makeVec4(.0, .3, .7, .1),
      diffuse: makeVec4(.0, .3, .7, .1),
      specular: makeVec4(.0, .3, .7, .3),
      shininess: 2.0,
    };
    program.setMaterialUniform(gl, shieldMaterial);
    CUBE_RENDERABLE.render(gl, program, model);
  }

  private renderShield(gl: WebGLRenderingContext, program: StandardShaderProgram) {
    const model = this.getCarBodyModel();
    const shieldPercentage = this.shieldHealth / this.MAX_SHIELD_HEALTH;
    const shieldMaterial: Material = {
      ambient: makeVec4(.0, .3, .7, .1 * shieldPercentage),
      diffuse: makeVec4(.0, .3, .7, .1 * shieldPercentage),
      specular: makeVec4(.0, .3, .7, .3 * shieldPercentage),
      shininess: 2.0,
    };
    program.setMaterialUniform(gl, shieldMaterial);
    const scale = mat4.scale(mat4.create, mat4.create(), [12, 12, 12]);
    mat4.multiply(model, model, scale);
    HALF_SPHERE_RENDERABLE.render(gl, program, model);
  }

  private renderWheel(
      isFront: boolean, 
      carBodyModelMatrix: mat4, 
      wheelPos: vec3, 
      gl: WebGLRenderingContext, 
      program: StandardShaderProgram) {
    const wheelTransMat = mat4.create();
    mat4.translate(wheelTransMat,
      wheelTransMat,
      wheelPos);
    const wheelModelMatrix = mat4.create();
    mat4.multiply(wheelModelMatrix, carBodyModelMatrix, wheelTransMat);
    if (isFront) {
      const wheelRotMat = mat4.create();
      mat4.rotate(wheelRotMat, wheelRotMat, this.wheelTurn, [0,1,0]);
      mat4.multiply(wheelModelMatrix, wheelModelMatrix, wheelRotMat);
    }
    WHEEL_RENDERABLE.render(gl, program, wheelModelMatrix);
  }
}