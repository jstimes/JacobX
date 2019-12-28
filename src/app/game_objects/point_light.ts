import {vec3, vec4, mat4} from 'src/app/gl-matrix.js';

import {makeVec, makeVec4, addVec} from 'src/app/math_utils';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import {CUBE_RENDERABLE} from 'src/app/renderables/cube_renderable';
import { GameObject } from 'src/app/game_objects/game_object';
import { CONTROLS, Key } from 'src/app/controls';

export class PointLight extends GameObject{
    position: vec3 = makeVec(0, 0, 0);
    color: vec4 = makeVec4(0, 0, 0, 0);

    constructor() {
        super();

        CONTROLS.addAssignedControl(Key.Z, 'point light x--');
        CONTROLS.addAssignedControl(Key.X, 'point light x++');
        CONTROLS.addAssignedControl(Key.C, 'point light y--');
        CONTROLS.addAssignedControl(Key.V, 'point light y++');
        CONTROLS.addAssignedControl(Key.B, 'point light z--');
        CONTROLS.addAssignedControl(Key.N, 'point light z++');
    }

    POSITION_UPDATE = .05;
    update(elapsedMs: number): void {
        if (CONTROLS.isKeyDown(Key.Z)) {
            this.position[0] -= this.POSITION_UPDATE;
        }
        if (CONTROLS.isKeyDown(Key.X)) {
            this.position[0] += this.POSITION_UPDATE;
        }
        if (CONTROLS.isKeyDown(Key.C)) {
            this.position[1] -= this.POSITION_UPDATE;
        }
        if (CONTROLS.isKeyDown(Key.V)) {
            this.position[1] += this.POSITION_UPDATE;
        }
        if (CONTROLS.isKeyDown(Key.B)) {
            this.position[2] -= this.POSITION_UPDATE;
        }
        if (CONTROLS.isKeyDown(Key.N)) {
            this.position[2] += this.POSITION_UPDATE;
        }
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
        CUBE_RENDERABLE.render(gl, program, carBodyModelViewMatrix);
    }
}