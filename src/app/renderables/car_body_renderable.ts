import {vec3, mat4} from '../gl-matrix.js';

import {Renderable} from './renderable';
import {makeVec, addVec, getTrianglesFromSquares, Square, Triangle} from '../math_utils';

class CarBodyRenderable extends Renderable {

  readonly LENGTH = 20;
  readonly bodyWidth = 4;
  readonly  xOffset = this.bodyWidth / 2;
  readonly  groundOffset = 2;
  readonly  height = 4;
  readonly  yMin = this.groundOffset;
  readonly  yMax = this.groundOffset + this.height;
  readonly  length = 20;
  readonly  zOffset = this.LENGTH / 2;

  constructor() {
    super();

    const squares = [];

    // Front four car body vertices:
    const tlf = makeVec(-this.xOffset, this.yMax, -this.zOffset);
    const blf = makeVec(-this.xOffset, this.yMin, -this.zOffset);
    const trf = makeVec(this.xOffset, this.yMax, -this.zOffset);
    const brf = makeVec(this.xOffset, this.yMin, -this.zOffset);

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
    const tlb = makeVec(-this.xOffset, this.yMax, this.zOffset);
    const blb = makeVec(-this.xOffset, this.yMin, this.zOffset);
    const trb = makeVec(this.xOffset, this.yMax, this.zOffset);
    const brb = makeVec(this.xOffset, this.yMin, this.zOffset);

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
    const triangles: Triangle[] = getTrianglesFromSquares(squares);
    this.addTriangles(triangles);
  }
}

export const CAR_BODY_RENDERABLE = new CarBodyRenderable();