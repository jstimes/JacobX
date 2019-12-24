import {vec3, mat4} from './gl-matrix.js';

import {Renderable} from './renderables/renderable';
import {Square} from './square';
import {Triangle} from './triangle';
import {makeVec, addVec} from './math_utils';
import { GlProgram } from 'src/app/gl_program';
import { CAR_BODY } from 'src/app/renderables/car_body';

export class Car { //extends Renderable {
  rotationAngle: number = 0;
  translation: number[] = [0, -6.0, -30];
  
  squares: Square[] = [];

  positions: number[] = [];
  normals: number[] = [];

  getPositions(): number[] {
    return this.positions;
  }

  getNormals(): number[] {
    return this.normals;
  }

  render(gl: WebGLRenderingContext, program: GlProgram) {
    const modelViewMatrix = mat4.create();
    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(modelViewMatrix,     // destination matrix
                  modelViewMatrix,     // matrix to translate
                  this.translation);  // amount to translate

    mat4.rotate(modelViewMatrix,  // destination matrix
      modelViewMatrix,  // matrix to rotate
      this.rotationAngle,   // amount to rotate in radians
      [0, 1, 0]);       // axis to rotate around

    CAR_BODY.render(gl, program, modelViewMatrix);
  }
}