import {vec3, vec4} from './gl-matrix.js';

export function makeVec(x: number, y: number, z: number): vec3 {
    const vector = vec3.create();
    vec3.set(vector, x, y, z);
    return vector;
}

export function makeVec4(x: number, y: number, z: number, w: number): vec4 {
    const vector = vec4.create();
    vec4.set(vector, x, y, z, w);
    return vector;
}
  
export function addVec(arr: number[], vec: vec3) {
    arr.push(vec[0]);
    arr.push(vec[1]);
    arr.push(vec[2]);
}