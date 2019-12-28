import {vec3, mat4} from 'src/app/gl-matrix.js';
import {makeVec, addVec} from 'src/app/math_utils';

export abstract class GameObject {
    position: vec3 = makeVec(0, 0, 0);
    rotationAngle: number = 0;
    rotationAxis: number[] = [1, 0, 0];
    scale: number[] = [1, 1, 1];

    abstract update(elapsedTime: number): void;
}