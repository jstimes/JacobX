import { vec3, mat4 } from 'gl-matrix';

import { makeVec, makeVec4, addVec, hasSignChange, sign, Square, EPSILON } from 'src/app/math_utils';
import { GameObject } from 'src/app/game_objects/game_object';
import { Material } from 'src/app/material';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';

import { CUBE_RENDERABLE } from 'src/app/renderables/cube_renderable';

export class Projectile extends GameObject {

    private readonly material: Material = {
        ambient: makeVec4(1, .8, 0, 1.0),
        diffuse: makeVec4(1, .8, 0, 1.0),
        specular: makeVec4(1, 1.0, 1.0, 1.0),
        shininess: .1,
    }

    readonly damage = 20;
    readonly fireSpeed: number = .08;
    readonly initialVelocity: vec3;
    readonly initialPosition: vec3;
    timeElapsedMs: number;

    position: vec3;

    constructor(initialPosition: vec3, initialDirection: vec3) {
        super();
        this.initialPosition = vec3.clone(initialPosition);
        this.position = vec3.clone(initialPosition);
        const direction = vec3.normalize(vec3.create(), vec3.clone(initialDirection));
        this.initialVelocity = vec3.scale(vec3.create(), direction, this.fireSpeed);
        this.timeElapsedMs = 0;
    }

    // DeltaX = v0 * t + .5 * a * t^2
    update(elapsedMs: number) {
        this.timeElapsedMs += elapsedMs;

        const positionUpdate = vec3.create();
        const v0t = vec3.scale(vec3.create(), this.initialVelocity, this.timeElapsedMs);
        const halfAtSquared = makeVec(0, 0, 0);
        vec3.add(positionUpdate, v0t, halfAtSquared);
        vec3.add(this.position, this.position, positionUpdate);
    }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram): void {
        program.setMaterialUniform(gl, this.material);

        const model = mat4.create();

        const scaleAmount = makeVec(.25, .25, .55);
        const scale = mat4.scale(mat4.create(), mat4.create(), scaleAmount);

        const direction = vec3.add(vec3.create(), this.position, this.initialVelocity);
        const orientation = mat4.targetTo(mat4.create(), this.position, direction, [0, 1, 0]);

        mat4.multiply(model, orientation, scale);
        CUBE_RENDERABLE.render(gl, program, model);
    }
}