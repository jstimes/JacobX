import {vec3, vec4, mat4} from 'src/app/gl-matrix.js';
import {makeVec, makeVec4, addVec} from 'src/app/math_utils';


export enum LightType {
    POINT,
    SPOT,
}

export interface PointLight {
    readonly lightType: LightType.POINT;

    position: vec3;
    color: vec4;
}

export interface SpotLight {
    readonly lightType: LightType.SPOT;

    position: vec3;
    color: vec4;

    direction: vec3;
    lowerLimit: number;
    upperLimit: number;
}

export type Light = PointLight|SpotLight;

// TODO - each light should have a LightColor
export interface LightColor {
    ambient: vec3;
    diffuse: vec3;
    specular: vec3;
}