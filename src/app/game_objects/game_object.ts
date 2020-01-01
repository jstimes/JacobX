import {vec3, mat4} from 'src/app/gl-matrix.js';
import {makeVec, addVec} from 'src/app/math_utils';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import {PointLight} from 'src/app/lights/point_light';

export class GameObject {
    position: vec3 = makeVec(0, 0, 0);
    scale: number[] = [1, 1, 1];

    update(elapsedTime: number): void {}

    render(gl: WebGLRenderingContext, program: StandardShaderProgram): void {}

    getLights(): PointLight[] {
        return [];
    }

    renderLight(gl: WebGLRenderingContext, program: LightShaderProgram): void {}
}