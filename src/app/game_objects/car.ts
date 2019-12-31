import {vec3, mat4} from 'src/app/gl-matrix.js';

import {makeVec, addVec, hasSignChange, sign, Square} from 'src/app/math_utils';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { CAR_BODY_RENDERABLE } from 'src/app/renderables/car_body_renderable';
import { WHEEL_RENDERABLE } from 'src/app/renderables/wheel_renderable';
import { CONTROLS } from 'src/app/controls';
import { Key } from 'src/app/controls';
import {GameObject} from './game_object';
import { Floor } from 'src/app/game_objects/floor';

const X_AXIS = makeVec(1, 0, 0);
const Y_AXIS = makeVec(0, 1, 0);
const Z_AXIS = makeVec(0, 0, -1);

export class Car extends GameObject {
  bodyColor = [1, 0, 0, 1];
  wheelColor = [.2, .2, .2, 1];

  frontLeftWheelPosition: vec3;
  backLeftWheelPosition: vec3;
  backRightWheelPosition: vec3;
  frontRightWheelPosition: vec3;

  xRotationAngle: number = 0;
  yRotationAngle: number = 0;
  zRotationAngle: number = 0;
  
  constructor(private readonly floor: Floor) {
    super();
    const bodyWidth = 4;
    const xOffset = bodyWidth / 2;
    const groundOffset = 2;
    const wheelZOffset = 6;
    this.frontLeftWheelPosition = makeVec(-xOffset, groundOffset, -wheelZOffset);
    this.backLeftWheelPosition = makeVec(-xOffset, groundOffset, wheelZOffset);
    this.backRightWheelPosition = makeVec(xOffset, groundOffset, wheelZOffset);
    this.frontRightWheelPosition = makeVec(xOffset, groundOffset, -wheelZOffset);

    CONTROLS.addAssignedControl(Key.W, "gas");
    CONTROLS.addAssignedControl(Key.S, "brake");
    CONTROLS.addAssignedControl(Key.A, "turn left");
    CONTROLS.addAssignedControl(Key.D, "turn right");
  }

  velocity: vec3 = makeVec(0,0,0);
  acceleration: vec3 = makeVec(0, 0, 0);
  accelerationPerGas: number = 1.1;
  restDecelerationRate: number = 10;
  brakeDecelerationRate: number = 30;
  maxAccelerationMagnitude: number = 20;
  maxVelocityMagnitude: number = 100;

  wheelReturnToCenterRate: number = Math.PI / 80;
  wheelTurnRate: number = Math.PI / 180;
  maxWheelTurn: number = Math.PI / 6;
  wheelTurn: number = 0;

  EPSILON = .001;

  getUpVector(): vec3 {
    const backWheelToFront = vec3.sub(vec3.create(), this.frontRightWheelPosition, this.backRightWheelPosition);
    const leftWheelToRight = vec3.sub(vec3.create(), this.backRightWheelPosition, this.backLeftWheelPosition);
    const up = vec3.cross(vec3.create(), leftWheelToRight, backWheelToFront);
    return vec3.normalize(vec3.create(), up);
  }

  // TODO NEED TO APPLY CURRENT ROTATION FIRST
  getForwardVector(): vec3 {
    const localForward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.frontRightWheelPosition, this.backRightWheelPosition));
    // TODO should use up vector instead of Y axis
    const worldForward = vec3.rotateY(vec3.create(), localForward, makeVec(0, 0, 0), this.yRotationAngle);
    return vec3.normalize(worldForward, worldForward);
  }

  getBackwardVector(): vec3 {
    const localBackward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.backRightWheelPosition, this.frontRightWheelPosition));
    // TODO should use up vector instead of Y axis
    const worldBackward = vec3.rotateY(vec3.create(), localBackward, makeVec(0, 0, 0), this.yRotationAngle);
    return vec3.normalize(worldBackward, worldBackward);
  }

  // v = v0 + a*t
  // DeltaX = ((v + v0) / 2) * t
  // DeltaX = v0 * t + .5 * a * t^2
  // v^2 = v0^2 + 2* a * DeltaX
  update(elapsedMs: number): void {
    const elapsedSeconds = elapsedMs / 1000;
    // First update position based on current velocity.
    const deltaPosition = vec3.scale(vec3.create(), this.velocity, elapsedSeconds);
    vec3.add(this.position, this.position, deltaPosition);

    // Then calculate new acceleration.
    const velocityNormalized = vec3.normalize(vec3.create(), this.velocity);
    const velocityMag = vec3.length(this.velocity);

    // Determine wheel orientation:
    const isTurningLeft = CONTROLS.isKeyDown(Key.A);
    const isTurningRight = CONTROLS.isKeyDown(Key.D);
    const areWheelsStraight = Math.abs(this.wheelTurn) < this.EPSILON;
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

    const isGasPedalDown = CONTROLS.isKeyDown(Key.W);
    const isBrakePedalDown = CONTROLS.isKeyDown(Key.S);
    const isCoasting = !isBrakePedalDown && !isGasPedalDown && velocityMag > this.EPSILON;
    const forward = this.getForwardVector();
    if (isGasPedalDown && !isBrakePedalDown) {
      const acclerationUpdate = vec3.scale(forward, forward, this.accelerationPerGas);
      const newAcceleration = vec3.add(vec3.create(), this.acceleration, acclerationUpdate);
      if (vec3.length(newAcceleration) < this.maxAccelerationMagnitude) {
        this.acceleration = newAcceleration;
      }
      console.log("accelerating");
    } else if (isBrakePedalDown && !isGasPedalDown && velocityMag > this.EPSILON) {
      vec3.scale(this.acceleration, this.getBackwardVector(), this.brakeDecelerationRate);
      // this.acceleration[2] = this.brakeDecelerationRate;
      console.log("braking");
    } else if (isCoasting) {
      vec3.scale(this.acceleration, this.getBackwardVector(), this.restDecelerationRate);
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
    const model = this.getCarBodyModel2();
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
  }

  getCarBodyModel(): mat4 {
    const carBodyModelMatrix = mat4.create();
    mat4.translate(carBodyModelMatrix,
        carBodyModelMatrix,
        this.position);
    
    mat4.rotate(carBodyModelMatrix,  // destination matrix
        carBodyModelMatrix,  // matrix to rotate
        this.yRotationAngle,   // amount to rotate in radians
        Y_AXIS);       // axis to rotate around

        mat4.rotate(carBodyModelMatrix,  // destination matrix
          carBodyModelMatrix,  // matrix to rotate
          this.xRotationAngle,   // amount to rotate in radians
          X_AXIS);       // axis to rotate around

          mat4.rotate(carBodyModelMatrix,  // destination matrix
            carBodyModelMatrix,  // matrix to rotate
            this.zRotationAngle,   // amount to rotate in radians
            Z_AXIS);       // axis to rotate around
    return carBodyModelMatrix;
  }

  getCarBodyModel2(): mat4 {
    const carBodyModelMatrix = mat4.create();
    mat4.translate(carBodyModelMatrix,
        carBodyModelMatrix,
        this.position);

    mat4.rotate(carBodyModelMatrix,  // destination matrix
        carBodyModelMatrix,  // matrix to rotate
        this.yRotationAngle,   // amount to rotate in radians
        Y_AXIS);       // axis to rotate around
    return carBodyModelMatrix;
  }

  render(gl: WebGLRenderingContext, program: StandardShaderProgram) {
    const carBodyModelMatrix = this.getCarBodyModel();
    gl.uniform4fv(program.uniformLocations.colorVec, this.bodyColor);
    CAR_BODY_RENDERABLE.render(gl, program, carBodyModelMatrix);

    gl.uniform4fv(program.uniformLocations.colorVec, this.wheelColor);
    this.renderWheel(true, carBodyModelMatrix, this.frontLeftWheelPosition, gl, program);
    this.renderWheel(false, carBodyModelMatrix, this.backLeftWheelPosition, gl, program);
    this.renderWheel(false, carBodyModelMatrix, this.backRightWheelPosition, gl, program);
    this.renderWheel(true, carBodyModelMatrix, this.frontRightWheelPosition, gl, program);
  }

  renderWheel(
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