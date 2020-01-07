import {vec3, mat4} from 'src/app/gl-matrix.js';
import { GameObject } from 'src/app/game_objects/game_object';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { Material } from 'src/app/material';
import { makeVec4, makeVec } from 'src/app/math_utils';
import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';
import { Light, PointLight, LightType } from 'src/app/lights/lights';
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';

export enum PowerUpType {
    SHIELD = 'Shield',
    OTHER = 'Other',
}

class BasePowerUp extends GameObject {
    powerUpType: PowerUpType;
    
    material: Material;
    yRotation: number;

    light: PointLight = {
        position: this.position,
        lightType: LightType.POINT,
        lightColor: {
            ambient: makeVec4(0, 0, 1, 1),
            diffuse: makeVec4(0, 0, 1, 1),
            specular: makeVec4(0, 0, 1, 1),
        },
        constant: 1,
        linear: .002,
        quadratic: .03,
    }

    constructor() {
        super();
        const s = 3;
        this.scale = [s, s, s];

        this.yRotation = Math.random() * Math.PI / 2.0;
    }

    update(elapsedMs: number) {
        this.yRotation += (elapsedMs / 800);
        this.light.position = this.position;
    }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram) {
        program.setMaterialUniform(gl, this.material);

        const model = mat4.create();
        mat4.translate(model, model, this.position);
        mat4.rotate(model, model, this.yRotation, [0, 1, 0]);
        mat4.scale(model, model, this.scale);
        CUBE_RENDERABLE.render(gl, program, model);
    }

    getLights(): Light[] {
        return [this.light];
    }

    renderLight(gl: WebGLRenderingContext, program: LightShaderProgram) {
        const lightColor = makeVec4(this.material.ambient[0], this.material.ambient[1], this.material.ambient[2], .5);
        program.setColor(gl, lightColor);
        const model = mat4.create();
        mat4.translate(model, model, this.position);
        mat4.rotate(model, model, this.yRotation, [0, 1, 0]);
        const sf = .5
        const scaleL = vec3.add(vec3.create(), this.scale, makeVec(sf, sf, sf));
        mat4.scale(model, model, scaleL);
        CUBE_RENDERABLE.render(gl, program, model);
    }
}

export class Shield extends BasePowerUp {
    powerUpType: PowerUpType.SHIELD = PowerUpType.SHIELD;

    constructor() {
        super();
        this.material = {
            ambient: makeVec4(0.0, 0.0, .8, 1.0),
            diffuse: makeVec4(0.0, 0.0, .8, 1.0),
            specular: makeVec4(0.0, 0.0, .8, 1.0),
            shininess: 6,
        };
    }
}

export type PowerUp = Shield;