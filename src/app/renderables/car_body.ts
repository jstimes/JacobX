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

    const makeBody = true;
    const squares = [];

    if (makeBody) {

      // Front four car body vertices:
      const tlf = makeVec(-xOffset, yMax, -zOffset);
      const blf = makeVec(-xOffset, yMin, -zOffset);
      const trf = makeVec(xOffset, yMax, -zOffset);
      const brf = makeVec(xOffset, yMin, -zOffset);

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
    }

    // WHEELS:
    // Cylinder with circles on left,right
    const wheelWidth = 2;
    const wheelRadius = 2;
    const wheelXOffset = wheelWidth / 2;

    const wheelSquares: Square[] = [];
    const circleSquares: Square[] = [];
    const deltaTheta = Math.PI / 8;

    // First make a circle centered at 0,0,0, about the x-axis
    const circleCenter = makeVec(0, 0, 0);
    for(let theta = 0; theta < Math.PI * 2; theta += deltaTheta) {
      // X is fixed, z = cos, y = sin
      const cosA = Math.cos(theta);
      const sinA = Math.sin(theta);
      const ptA = makeVec(0, sinA * wheelRadius, cosA * wheelRadius);
      const cosB = Math.cos(theta + deltaTheta);
      const sinB = Math.sin(theta + deltaTheta);
      const ptB = makeVec(0, sinB * wheelRadius, cosB * wheelRadius);
      circleSquares.push(new Square({
          a: ptB, 
          b: vec3.clone(circleCenter), 
          c: vec3.clone(circleCenter), 
          d: ptA,
      }));
    }

    // Then copy and translate the circle to make left and right faces of wheel:
    circleSquares.forEach((sq: Square) => {
      const leftSquare = sq.clone().translate(makeVec(-wheelXOffset, 0, 0));
      const rightSquare = sq.clone().translate(makeVec(wheelXOffset, 0, 0));
      const cylinderSquare = new Square({
          a: vec3.clone(leftSquare.a),
          b: vec3.clone(leftSquare.d),
          c: vec3.clone(rightSquare.d),
          d: vec3.clone(rightSquare.a),
      });
      wheelSquares.push(leftSquare);
      wheelSquares.push(rightSquare);
      wheelSquares.push(cylinderSquare);
    });

    // THen copy all squares of a wheel and move them to each of the wheel positions.
    const wheelZOffset = 6;
    const frontLeftTrans = makeVec(-xOffset, groundOffset, -wheelZOffset);
    const backLeftTrans = makeVec(-xOffset, groundOffset, wheelZOffset);
    const backRightTrans = makeVec(xOffset, groundOffset, wheelZOffset);
    const frontRightTrans = makeVec(xOffset, groundOffset, -wheelZOffset);
    wheelSquares.forEach((sq: Square) => {
      const frontLeftWheel = sq.clone().translate(frontLeftTrans);
      const backLeftWheel = sq.clone().translate(backLeftTrans);
      const backRightWheel = sq.clone().translate(backRightTrans);
      const frontRightWheel = sq.clone().translate(frontRightTrans);

      squares.push(frontLeftWheel);
      squares.push(backLeftWheel);
      squares.push(backRightWheel);
      squares.push(frontRightWheel);
    });

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