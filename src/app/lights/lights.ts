import { vec3, vec4, mat4 } from 'gl-matrix';
import { makeVec, makeVec4, addVec } from 'src/app/math_utils';


export enum LightType {
    DIRECTIONAL,
    POINT,
    SPOT,
}

export interface LightColor {
    ambient: vec4;
    diffuse: vec4;
    specular: vec4;
}

export interface DirectionalLight {
    readonly lightType: LightType.DIRECTIONAL;

    direction: vec3;
    lightColor: LightColor;
}

export interface PointLight {
    readonly lightType: LightType.POINT;

    position: vec3;
    lightColor: LightColor;

    constant: 1,
    linear: number,
    quadratic: number,
}

export interface SpotLight {
    readonly lightType: LightType.SPOT;

    position: vec3;
    lightColor: LightColor;

    direction: vec3;
    lowerLimit: number;
    upperLimit: number;

    constant: 1,
    linear: number,
    quadratic: number,
}

export type Light = DirectionalLight | PointLight | SpotLight;