import {vec3} from './gl-matrix.js';
import {makeVec, addVec} from './math_utils';

export class Square {
    a: vec3;
    b: vec3;
    c: vec3;
    d: vec3;

    constructor({a, b, c, d}: {a: vec3; b: vec3; c: vec3; d: vec3}) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    clone(): Square {
        return new Square({
        a: this.a,
        b: this.b,
        c: this.c,
        d: this.d,
        });
    }

    translate(vec: vec3): Square {
        vec3.add(this.a, this.a, vec);
        vec3.add(this.b, this.b, vec);
        vec3.add(this.c, this.c, vec);
        vec3.add(this.d, this.d, vec);
        return this;
    }
}