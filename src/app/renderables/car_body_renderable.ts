import {vec3, mat4} from '../gl-matrix.js';

import {Renderable} from './renderable';
import {Square} from '../square';
import {Triangle} from '../triangle';
import {makeVec, addVec} from '../math_utils';
import { GlProgram } from 'src/app/gl_program';

class CarBodyRenderable extends Renderable {
  positions: number[] = [];
  normals: number[] = [];

  getPositions(): number[] {
    return this.positions;
  }

  getNormals(): number[] {
    return this.normals;
  }

  constructor() {
    super();

    const bodyWidth = 4;
    const xOffset = bodyWidth / 2;
    const groundOffset = 2;
    const height = 4;
    const yMin = groundOffset;
    const yMax = groundOffset + height;
    const length = 20;
    const zOffset = length / 2;

    const squares = [];

    // Front four car body vertices:
    const tlf = makeVec(-xOffset, yMax, -zOffset);
    const blf = makeVec(-xOffset, yMin, -zOffset);
    const trf = makeVec(xOffset, yMax, -zOffset);
    const brf = makeVec(xOffset, yMin, -zOffset);

    const indent = true;
    if (indent) {
      const xIndent = .5;
      tlf[0] += xIndent;
      trf[0] -= xIndent;
      blf[0] += xIndent;
      brf[0] -= xIndent;
      const yIndent = 1.5;
      tlf[1] -= yIndent;
      trf[1] -= yIndent;
    }

    // Back four vertices
    const tlb = makeVec(-xOffset, yMax, zOffset);
    const blb = makeVec(-xOffset, yMin, zOffset);
    const trb = makeVec(xOffset, yMax, zOffset);
    const brb = makeVec(xOffset, yMin, zOffset);

    const frontFace: Square = new Square({
      a: trf, b: brf, c: blf, d: tlf,
    });
    squares.push(frontFace);

    const backFace: Square = new Square({
      a: tlb, b: blb, c: brb, d: trb,
    });
    squares.push(backFace);
    
    const topFace: Square = new Square({
      a: tlf, b: tlb, c: trb, d: trf,
    });
    squares.push(topFace);

    const bottomFace: Square =  new Square({
      a: brf, b: brb, c: blb, d: blf,
    });
    squares.push(bottomFace);
    
    const leftFace: Square =  new Square({
      a: tlf, b: blf, c: blb, d: tlb,
    });
    squares.push(leftFace);

    const rightFace: Square = new Square({
      a: trb, b: brb, c: brf, d: trf,
    });
    squares.push(rightFace);

    this.positions = [];
    this.normals = [];
    const triangles: Triangle[] = [];
    for (let square of squares) {
      const triA = new Triangle(square.a, square.b, square.d);
      const triB = new Triangle(square.b, square.c, square.d);
      triangles.push(triA);
      triangles.push(triB);
    }
    for (let triangle of triangles) {
      const triNormal = triangle.getNormal();
      vec3.normalize(triNormal, triNormal);
      vec3.normalize(triNormal, triNormal);
      addVec(this.positions, triangle.a);
      addVec(this.positions, triangle.b);
      addVec(this.positions, triangle.c);
      addVec(this.normals, triNormal);
      addVec(this.normals, triNormal);
      addVec(this.normals, triNormal);
    }
  }
}

export const CAR_BODY = new CarBodyRenderable();