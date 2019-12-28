import {vec3, mat4} from '../gl-matrix.js';
import {Renderable} from './renderable';
import {makeVec, addVec, Square, Triangle} from 'src/app/math_utils';

class CubeRenderable extends Renderable {

  constructor() {
    super();

    const squares = [];

    // Front four vertices:
    const tlf = makeVec(-1, 1, -1);
    const blf = makeVec(-1, -1, -1);
    const trf = makeVec(1, 1, -1);
    const brf = makeVec(1, -1, -1);

    // Back four vertices
    const tlb = makeVec(-1, 1, 1);
    const blb = makeVec(-1, -1, 1);
    const trb = makeVec(1, 1, 1);
    const brb = makeVec(1, -1, 1);

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

export const CUBE_RENDERABLE = new CubeRenderable();