import { vec4, mat4 } from 'src/app/gl-matrix.js';
import { makeVec } from 'src/app/math_utils';

// Thank you Joey DeVries - https://learnopengl.com/Lighting/Materials
export interface Material {
    readonly ambient: vec4;
    readonly diffuse: vec4;
    readonly specular: vec4;
    // Smaller values = more spread out; high values = more focused highlight.
    readonly shininess: number;
}