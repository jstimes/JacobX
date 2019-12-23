import {vec3, mat4} from './gl-matrix.js';

import {Renderable} from './renderable';
import {Square} from './square';
import {Triangle} from './triangle';
import {makeVec, addVec} from './math_utils';
import { GlProgram } from 'src/app/gl_program';

export class Car extends Renderable {
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
  
    constructor(gl: WebGLRenderingContext) {
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
        this.squares.push(frontFace);
  
        const backFace: Square = new Square({
          a: tlb, b: blb, c: brb, d: trb,
        });
        this.squares.push(backFace);
        
        const topFace: Square = new Square({
          a: tlf, b: tlb, c: trb, d: trf,
        });
        this.squares.push(topFace);
  
        const bottomFace: Square =  new Square({
          a: brf, b: brb, c: blb, d: blf,
        });
        this.squares.push(bottomFace);
        
        const leftFace: Square =  new Square({
          a: tlf, b: blf, c: blb, d: tlb,
        });
        this.squares.push(leftFace);
  
        const rightFace: Square = new Square({
          a: trb, b: brb, c: brf, d: trf,
        });
        this.squares.push(rightFace);
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
  
        this.squares.push(frontLeftWheel);
        this.squares.push(backLeftWheel);
        this.squares.push(backRightWheel);
        this.squares.push(frontRightWheel);
      });
  
      this.positions = [];
      this.normals = [];
      const triangles: Triangle[] = [];
      for (let square of this.squares) {
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

      this.initBuffers(gl);
    }

    ren(gl: WebGLRenderingContext, program: GlProgram) {
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

      this.render(gl, program, modelViewMatrix);
    }
  }