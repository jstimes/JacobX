import {vec3, mat4} from './gl-matrix.js';

import {Renderable} from './renderables/renderable';
import {Square} from './square';
import {Triangle} from './triangle';
import {makeVec, addVec} from './math_utils';
import { GlProgram } from 'src/app/gl_program';
import { CAR_BODY } from 'src/app/renderables/car_body_renderable';
import { WHEEL } from 'src/app/renderables/wheel_renderable';
import { CONTROLS } from 'src/app/controls';
import { Key } from 'src/app/controls';

export class Car {
  bodyColor = [1, 0, 0, 1];
  wheelColor = [.2, .2, .2, 1];
  rotationAngle: number = 0;
  translation: number[] = [0, 0.0, 0.0];

  frontLeftWheelPosition: vec3;
  backLeftWheelPosition: vec3;
  backRightWheelPosition: vec3;
  frontRightWheelPosition: vec3;
  
  constructor() {
    const bodyWidth = 4;
    const xOffset = bodyWidth / 2;
    const groundOffset = 2;
    const wheelZOffset = 6;
    this.frontLeftWheelPosition = makeVec(-xOffset, groundOffset, -wheelZOffset);
    this.backLeftWheelPosition = makeVec(-xOffset, groundOffset, wheelZOffset);
    this.backRightWheelPosition = makeVec(xOffset, groundOffset, wheelZOffset);
    this.frontRightWheelPosition = makeVec(xOffset, groundOffset, -wheelZOffset);
  }

  velocity: vec3 = makeVec(0,0,0);
  acceleration: vec3 = makeVec(0, 0, 0);
  accelerationPerGas: number = -.002;
  decelerationRate: number = .001;
  maxAccelerationMagnitude: number = 30;
  maxVelocityMagnitude: number = 1;
  gas() {

  }

  update(elapsedMs: number) {
    const velocityMag = vec3.length(this.velocity);
    if (CONTROLS.isKeyDown(Key.W)) {
      this.acceleration[2] += this.accelerationPerGas;
    } else if (velocityMag > 0) {
      if (velocityMag < this.decelerationRate) {
        this.velocity[2] = 0;
        return;
      }
      const isPositive = this.velocity[2] > 0;
      let accelerationUpdate = this.decelerationRate;
      if (isPositive) {
        accelerationUpdate *= -1.0;
      }
      this.acceleration[2] += accelerationUpdate;
    }

    if (vec3.length(this.acceleration) > 0) {
      const newVelocity = makeVec(0, 0, this.velocity[2] + this.acceleration[2]);
      if (vec3.length(newVelocity) < this.maxVelocityMagnitude) {
        this.velocity = newVelocity;
      }
    }

    this.translation[2] += this.velocity[2];
  }

  render(gl: WebGLRenderingContext, program: GlProgram) {
    const carBodyModelViewMatrix = mat4.create();
    mat4.translate(carBodyModelViewMatrix,
        carBodyModelViewMatrix,
        this.translation);

    mat4.rotate(carBodyModelViewMatrix,  // destination matrix
        carBodyModelViewMatrix,  // matrix to rotate
        this.rotationAngle,   // amount to rotate in radians
        [0, 1, 0]);       // axis to rotate around

    gl.uniform4fv(program.uniformLocations.colorVec, this.bodyColor);
    CAR_BODY.render(gl, program, carBodyModelViewMatrix);

    gl.uniform4fv(program.uniformLocations.colorVec, this.wheelColor);
    this.renderWheel(carBodyModelViewMatrix, this.frontLeftWheelPosition, gl, program);
    this.renderWheel(carBodyModelViewMatrix, this.backLeftWheelPosition, gl, program);
    this.renderWheel(carBodyModelViewMatrix, this.backRightWheelPosition, gl, program);
    this.renderWheel(carBodyModelViewMatrix, this.frontRightWheelPosition, gl, program);
  }

  renderWheel(carBodyModelViewMatrix: mat4, wheelPos: vec3, gl: WebGLRenderingContext, program: GlProgram) {
    const wheelTransMat = mat4.create();
    mat4.translate(wheelTransMat,
      wheelTransMat,
      wheelPos);
    const wheelModelMatrix = mat4.create();
    mat4.multiply(wheelModelMatrix, carBodyModelViewMatrix, wheelTransMat);
    WHEEL.render(gl, program, wheelModelMatrix);
  }
}