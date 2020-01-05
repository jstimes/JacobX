import {vec3, vec4, mat4} from 'src/app/gl-matrix.js';
import { GameObject } from 'src/app/game_objects/game_object';
import { makeVec, makeVec4 } from 'src/app/math_utils';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';
import { Light, PointLight, LightType } from 'src/app/lights/lights';
import { Material } from 'src/app/material';

export class StreetLight extends GameObject {

    color: vec4 = makeVec4(.3, .1, .3, 1.0);
    material: Material = {
        ambient: makeVec4(.3, .1, .3, 1.0),
        diffuse: makeVec4(.3, .1, .3, 1.0),
        specular: makeVec4(1, 1, 1, 1),
        shininess: 69,
    }

    baseScale: vec3 = makeVec(1, 10, 1);
    basePosition: vec3 = makeVec(5, 10, 0);

    crossBarScale: vec3 = makeVec(4, 1, 1);
    crossBarPosition: vec3 = makeVec(0, 19, 0);

    light: PointLight = {
        lightType: LightType.POINT,
        position: makeVec(-3, 17, 0),
        lightColor: {
            ambient: makeVec(.5, .5, .5),
            diffuse: makeVec(.5, .5, .5),
            specular: makeVec(.1, .1, .1),
        },
        constant: 1,
        linear: 0.009,
        quadratic: 0.0032,
    };

    constructor() {
        super();
    }

    update(elapsedTime: number): void {
        // No-op
        const model = this.getModel();
        this.light.position = vec3.transformMat4(vec3.create(), makeVec(-3, 17, 0), model);
    }

    getModel(): mat4 {
        const model = mat4.create();
        mat4.translate(model, model, this.position);
        return model;
    }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram) {
        program.setMaterialUniform(gl, this.material);

        const model = this.getModel();

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
        program.setColor(gl, makeVec4(1.0, 1.0, 1.0, 1.0));
        const model = mat4.create();
        mat4.translate(model, model, this.light.position);
        CUBE_RENDERABLE.render(gl, program, model);
    }
}