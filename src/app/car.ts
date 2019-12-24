import {vec3, mat4} from './gl-matrix.js';

import {Renderable} from './renderables/renderable';
import {Square} from './square';
import {Triangle} from './triangle';
import {makeVec, addVec} from './math_utils';
import { GlProgram } from 'src/app/gl_program';
import { CAR_BODY } from 'src/app/renderables/car_body';
import { WHEEL } from 'src/app/renderables/wheel_renderable';

export class Car {
  rotationAngle: number = 0;
  translation: number[] = [0, -6.0, -30];

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

  render(gl: WebGLRenderingContext, program: GlProgram) {
    const carBodyModelViewMatrix = mat4.create();
    mat4.translate(carBodyModelViewMatrix,
        carBodyModelViewMatrix,
        this.translation);

    mat4.rotate(carBodyModelViewMatrix,  // destination matrix
        carBodyModelViewMatrix,  // matrix to rotate
        this.rotationAngle,   // amount to rotate in radians
        [0, 1, 0]);       // axis to rotate around

    CAR_BODY.render(gl, program, carBodyModelViewMatrix);

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