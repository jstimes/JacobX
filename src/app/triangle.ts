import {vec3} from './gl-matrix.js';
import {makeVec, addVec} from './math_utils';

export class Triangle {
    constructor(
      public a: vec3, 
      public b: vec3, 
      public c: vec3) {}
  
    getNormal(): vec3 {
      const u = vec3.create();
      vec3.sub(u, this.b, this.a);
      const v = vec3.create();
      vec3.sub(v, this.c, this.a);
      return makeVec(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]);
    }
}