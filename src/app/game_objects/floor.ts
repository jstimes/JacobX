import {mat4} from 'src/app/gl-matrix.js';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';
import {GameObject} from './game_object';
import { SQUARE_RENDERABLE } from 'src/app/renderables/square_renderable';

export class Floor extends GameObject {

    floorColor = [.05, .2, .05, 1.0];

    constructor() {
        super();
        this.rotationAxis = [1, 0, 0];
        this.rotationAngle = -Math.PI / 2.0;
        const scaling = 500;
        this.scale = [scaling, scaling, scaling];
    }

    update(elapsedMs: number): void {}

    render(gl: WebGLRenderingContext, program: StandardShaderProgram) {
        const model = mat4.create();
        mat4.translate(model, model, this.position);

        mat4.rotate(model,  // destination matrix
            model,  // matrix to rotate
            this.rotationAngle,   // amount to rotate in radians
            this.rotationAxis);       // axis to rotate around
        
        gl.uniform4fv(program.uniformLocations.colorVec, this.floorColor);
        // FLOOR_RENDERABLE.render(gl, program, model);

        mat4.scale(model, model, this.scale);
        SQUARE_RENDERABLE.render(gl, program, model);
    }
}