import {vec3, vec4, mat4} from 'src/app/gl-matrix.js';
import {makeVec, makeVec4, addVec} from 'src/app/math_utils';

export class PointLight {
    position: vec3 = makeVec(0, 0, 0);
    color: vec4 = makeVec4(0, 0, 0, 0);
}