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

    clone() {
      return new Triangle(vec3.clone(this.a), vec3.clone(this.b), vec3.clone(this.c));
    }

    translate(trans: vec3): Triangle {
      vec3.add(this.a, this.a, trans);
      vec3.add(this.b, this.b, trans);
      vec3.add(this.c, this.c, trans);
      return this;
    }

    flip(): Triangle {
      const copy = this.clone();
      this.a = copy.c;
      this.b = copy.b;
      this.c = copy.a;
      return this;
    }
}