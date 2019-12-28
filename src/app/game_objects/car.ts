import {vec3, mat4} from 'src/app/gl-matrix.js';

import {makeVec, addVec} from 'src/app/math_utils';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { CAR_BODY } from 'src/app/renderables/car_body_renderable';
import { WHEEL } from 'src/app/renderables/wheel_renderable';
import { CONTROLS } from 'src/app/controls';
import { Key } from 'src/app/controls';
import {GameObject} from './game_object';

export class Car extends GameObject {
  bodyColor = [1, 0, 0, 1];
  wheelColor = [.2, .2, .2, 1];

  frontLeftWheelPosition: vec3;
  backLeftWheelPosition: vec3;
  backRightWheelPosition: vec3;
  frontRightWheelPosition: vec3;
  
  constructor() {
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
  accelerationPerGas: number = -.05;
  restDecelerationRate: number = .01;
  brakeDecelerationRate: number = 3.2;
  maxAccelerationMagnitude: number = 30;
  maxVelocityMagnitude: number = 1;

  wheelTurnRate: number = Math.PI / 80;
  maxWheelTurn: number = Math.PI / 4;
  wheelTurn: number = 0;

  EPSILON = .001;

  // v = v0 + a*t
  // DeltaX = ((v + v0) / 2) * t
  // DeltaX = v0 * t + .5 * a * t^2
  // v^2 = v0^2 + 2* a * DeltaX
  update(elapsedMs: number): void {
    const elapsedSeconds = elapsedMs / 1000;
    // First update position based on current velocity.
    this.position[2] += this.velocity[2] * elapsedSeconds;

    // Then calculate new acceleration.
    const velocityMag = vec3.length(this.velocity);
    const isGasPedalDown = CONTROLS.isKeyDown(Key.W);
    const isBrakePedalDown = CONTROLS.isKeyDown(Key.S);
    const isCoasting = !isBrakePedalDown && !isGasPedalDown && velocityMag > 0;
    if (isGasPedalDown && !isBrakePedalDown) {
      this.acceleration[2] += this.accelerationPerGas;
      console.log("accelerating");
    } else if (isBrakePedalDown && !isGasPedalDown && velocityMag > 0) {
      this.acceleration[2] = this.brakeDecelerationRate;
      console.log("braking");
    } else if (isCoasting) {
      this.acceleration[2] = this.restDecelerationRate;
      console.log("coasting");
    }

    // Determine wheel orientation:
    const isTurningLeft = CONTROLS.isKeyDown(Key.A);
    const isTurningRight = CONTROLS.isKeyDown(Key.D);
    if (isTurningRight && !isTurningLeft) {
      this.wheelTurn = Math.max(-this.maxWheelTurn, this.wheelTurn - this.wheelTurnRate);
    } else if (isTurningLeft && !isTurningRight) {
      this.wheelTurn = Math.min(this.maxWheelTurn, this.wheelTurn + this.wheelTurnRate);
    }

    // Update velocity based on acceleration:
    const prevVelocity = this.velocity[2];
    const newVelocity = this.velocity[2] + this.acceleration[2] * elapsedSeconds;
    if ((isCoasting || isBrakePedalDown) && this.signChange(prevVelocity, newVelocity)) {
      this.velocity[2] = 0;
      this.acceleration[2] = 0;
    } else {
      this.velocity[2] = newVelocity;
    }
  }

  signChange(a: number, b: number) {
    return a >= 0 && b < 0 || a < 0 && b >= 0;
  }

  render(gl: WebGLRenderingContext, program: StandardShaderProgram) {
    const carBodyModelMatrix = mat4.create();
    mat4.translate(carBodyModelMatrix,
        carBodyModelMatrix,
        this.position);

    mat4.rotate(carBodyModelMatrix,  // destination matrix
        carBodyModelMatrix,  // matrix to rotate
        this.rotationAngle,   // amount to rotate in radians
        [0, 1, 0]);       // axis to rotate around

    gl.uniform4fv(program.uniformLocations.colorVec, this.bodyColor);
    CAR_BODY.render(gl, program, carBodyModelMatrix);

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
    WHEEL.render(gl, program, wheelModelMatrix);
  }
}