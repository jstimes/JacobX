import {vec3, vec4, mat4} from './gl-matrix.js';
import { LightColor, DirectionalLight } from 'src/app/lights/lights';

interface FogParams {
    fogColor: vec4;
    fogNear: number;
    fogFar: number;
}

export class Scene {

    clearColor: vec4;
    
    directionalLight: DirectionalLight;

    fog: FogParams;

    constructor() {}
}