import {mat4} from 'src/app/gl-matrix.js';
import { GlProgram } from 'src/app/gl_program';
import { FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';


export class Floor {
    translation = [0, -6, 0];
    rotationAngle = 0;
    rotationAxis = [1, 0, 0];

    floorColor = [.05, .2, .05, 1.0];

    update(elapsedMs: number) {}

    render(gl: WebGLRenderingContext, program: GlProgram) {
        const model = mat4.create();
        mat4.translate(model, model, this.translation);

        mat4.rotate(model,  // destination matrix
            model,  // matrix to rotate
            this.rotationAngle,   // amount to rotate in radians
            this.rotationAxis);       // axis to rotate around
        
        gl.uniform4fv(program.uniformLocations.colorVec, this.floorColor);
        FLOOR_RENDERABLE.render(gl, program, model);
    }
}