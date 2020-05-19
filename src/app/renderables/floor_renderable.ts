import { Renderable } from './renderable';
import { vec3, mat4 } from 'gl-matrix';
import { makeVec, addVec, Square, Triangle } from '../math_utils';

class FloorRenderable extends Renderable {

  USE_GRID = false;
  constructor() {
    super();

    if (this.USE_GRID) {

    } else {
      const width = 1000;
      const squareSize = 10;
      const start = -(width / 2);
      const squares: Square[] = [];

      const Y = 0;
      const squaresPerRow = width / squareSize;
      for (let i = 0; i < squaresPerRow - 1; i++) {
        for (let j = 0; j < squaresPerRow - 1; j++) {
          const a = makeVec(i * squareSize + start, Y, j * squareSize + start);
          const b = makeVec(i * squareSize + start, Y, (j + 1) * squareSize + start);
          const c = makeVec((i + 1) * squareSize + start, Y, (j + 1) * squareSize + start);
          const d = makeVec((i + 1) * squareSize + start, Y, j * squareSize + start);
          squares.push(new Square({ a, b, c, d }));
        }
      }

      const triangles: Triangle[] = [];
      this.positions = [];
      this.normals = [];
      for (let square of squares) {
        const triA = new Triangle(square.a, square.b, square.d);
        const triB = new Triangle(square.b, square.c, square.d);
        triangles.push(triA);
        triangles.push(triB);
      }
      for (let triangle of triangles) {
        const triNormal = triangle.getNormal();
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
}

export const FLOOR_RENDERABLE = new FloorRenderable();