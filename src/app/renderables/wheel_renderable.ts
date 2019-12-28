import {vec3, mat4} from '../gl-matrix.js';
import {Renderable} from './renderable';
import {Square} from '../square';
import {Triangle} from '../triangle';
import {makeVec, addVec} from '../math_utils';

class WheelRenderable extends Renderable {
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

    const squares: Square[] = [];
    const triangles: Triangle[] = [];

    // WHEELS:
    // Cylinder with circles on left,right
    const wheelWidth = 2;
    const wheelRadius = 2;
    const wheelXOffset = wheelWidth / 2;

    const wheelSquares: Square[] = [];
    const deltaTheta = Math.PI / 12;

    // First make a circle centered at 0,0,0, about the x-axis
    // Normal is going left, negative x axis.
    const circleTriangles = [];
    const circleCenter = makeVec(0, 0, 0);
    for(let theta = 0; theta < Math.PI * 2; theta += deltaTheta) {
      // X is fixed, z = cos, y = sin
      const cosA = Math.cos(theta);
      const sinA = Math.sin(theta);
      const ptA = makeVec(0, sinA * wheelRadius, cosA * wheelRadius);
      const cosB = Math.cos(theta + deltaTheta);
      const sinB = Math.sin(theta + deltaTheta);
      const ptB = makeVec(0, sinB * wheelRadius, cosB * wheelRadius);
      circleTriangles.push(new Triangle(ptB,  vec3.clone(circleCenter), ptA));
    }

    // Then copy and translate the circle to make left and right faces of wheel:
    circleTriangles.forEach((tri: Triangle) => {
      const leftTriangle = tri.clone().translate(makeVec(-wheelXOffset, 0, 0));
      const rightTriangle = tri.clone().translate(makeVec(wheelXOffset, 0, 0)).flip();
      const cylinderSquare = new Square({
          a: vec3.clone(leftTriangle.a),
          b: vec3.clone(leftTriangle.c),
          c: vec3.clone(rightTriangle.a),
          d: vec3.clone(rightTriangle.c),
      });
      triangles.push(leftTriangle);
      triangles.push(rightTriangle);
      squares.push(cylinderSquare);
    });

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

export const WHEEL = new WheelRenderable();