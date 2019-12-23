import {vec3} from './gl-matrix.js';

export function makeVec(x: number, y: number, z: number): vec3 {
    const vector = vec3.create();
    vec3.set(vector, x, y, z);
    return vector;
}
  
export function addVec(arr: number[], vec: vec3) {
    arr.push(vec[0]);
    arr.push(vec[1]);
    arr.push(vec[2]);
}