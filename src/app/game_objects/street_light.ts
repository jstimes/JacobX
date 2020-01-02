import {vec3, vec4, mat4} from 'src/app/gl-matrix.js';
import { GameObject } from 'src/app/game_objects/game_object';
import { makeVec, makeVec4 } from 'src/app/math_utils';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';
import { Light, PointLight, LightType } from 'src/app/lights/lights';

export class StreetLight extends GameObject {

    color: vec4 = makeVec4(.3, .1, .3, 1.0);

    baseScale: vec3 = makeVec(1, 10, 1);
    basePosition: vec3 = makeVec(5, 10, 0);

    crossBarScale: vec3 = makeVec(4, 1, 1);
    crossBarPosition: vec3 = makeVec(0, 19, 0);

    light: PointLight = {
        lightType: LightType.POINT,
        position: makeVec(-3, 17, 0),
        color: makeVec4(0, 0, 0, 0),
    };

    constructor() {
        super();
    }

    update(elapsedTime: number): void {
        // No-op
        this.light.position = makeVec(-3, 17, 0);
    }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram) {
        gl.uniform4fv(program.uniformLocations.colorVec, this.color);

        const model = mat4.create();
        mat4.translate(model, model, this.position);

        const baseModel = mat4.create();
        mat4.translate(baseModel, model, this.basePosition);
        mat4.scale(baseModel, baseModel, this.baseScale);
        CUBE_RENDERABLE.render(gl, program, baseModel);

        const crossBarModel = mat4.create();
        mat4.translate(crossBarModel, model, this.crossBarPosition);
        mat4.scale(crossBarModel, crossBarModel, this.crossBarScale);
        CUBE_RENDERABLE.render(gl, program, crossBarModel);
    }

    getLights(): Light[] {
        return [this.light];
    }

    renderLight(gl: WebGLRenderingContext, program: LightShaderProgram) {
        const model = mat4.create();
        mat4.translate(model, model, this.position);
        mat4.translate(model, model, this.light.position);
        CUBE_RENDERABLE.render(gl, program, model);
    }
}