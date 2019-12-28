import {vec3, vec4, mat4} from 'src/app/gl-matrix.js';

import {makeVec, makeVec4, addVec} from 'src/app/math_utils';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import {CUBE} from 'src/app/renderables/cube';
import { GameObject } from 'src/app/game_objects/game_object';

export class PointLight extends GameObject{
    position: vec3 = makeVec(0, 0, 0);
    color: vec4 = makeVec4(0, 0, 0, 0);

    update(elapsedMs: number): void {
        
    }

    render(gl: WebGLRenderingContext, program: LightShaderProgram) {
        const carBodyModelViewMatrix = mat4.create();
        mat4.translate(carBodyModelViewMatrix,
            carBodyModelViewMatrix,
            this.position);

        mat4.rotate(carBodyModelViewMatrix,  // destination matrix
            carBodyModelViewMatrix,  // matrix to rotate
            this.rotationAngle,   // amount to rotate in radians
            [0, 1, 0]);       // axis to rotate around

        gl.uniform4fv(program.uniformLocations.colorVec, this.color);
        CUBE.render(gl, program, carBodyModelViewMatrix);
    }
}