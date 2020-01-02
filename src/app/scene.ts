import {vec3, vec4, mat4} from './gl-matrix.js';

interface FogParams {
    fogColor: vec4;
    fogNear: number;
    fogFar: number;
}

export class Scene {

    clearColor: vec4;
    directionalLightDirection: vec3;
    fog: FogParams;

    constructor() {

    }
}