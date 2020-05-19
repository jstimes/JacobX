import { vec3, mat4 } from 'gl-matrix';
import { makeVec, addVec } from 'src/app/math_utils';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { Light } from 'src/app/lights/lights';

export class GameObject {
    position: vec3 = makeVec(0, 0, 0);
    scale: Float32Array = new Float32Array([1, 1, 1]);

    update(elapsedTime: number): void { }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram): void { }

    getLights(): Light[] {
        return [];
    }

    renderLight(gl: WebGLRenderingContext, program: LightShaderProgram): void { }

    renderTranslucents(gl: WebGLRenderingContext, program: StandardShaderProgram): void { }
}