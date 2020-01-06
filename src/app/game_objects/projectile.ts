import {vec3, mat4} from 'src/app/gl-matrix.js';

import {makeVec, makeVec4, addVec, hasSignChange, sign, Square, EPSILON} from 'src/app/math_utils';
import {GameObject} from 'src/app/game_objects/game_object';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';

export class Projectile extends GameObject {

    fireSpeed: number = 200;
    initialVelocity: vec3;
    initialPosition: vec3;
    timeElapsedMs: number;

    position: vec3;

    constructor(initialPosition: vec3, initialDirection: vec3) {
        super();
        this.initialPosition = vec3.clone(initialPosition);
        this.position = vec3.clone(initialPosition);
        this.initialVelocity = vec3.scale(vec3.create(), initialDirection, this.fireSpeed);
        this.timeElapsedMs = 0;
    }

    // DeltaX = v0 * t + .5 * a * t^2
    update(elapsedMs: number) {
        this.timeElapsedMs += elapsedMs;

        const positionUpdate = vec3.create();
        const v0t = vec3.scale(vec3.create(), vec3.create(), this.timeElapsedMs);
        const halfAtSquared = makeVec(0, -9.8 * .5 * this.timeElapsedMs * this.timeElapsedMs, 0);
        vec3.add(positionUpdate, v0t, halfAtSquared);
        vec3.add(this.position, this.position, positionUpdate);
    }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram): void {

    }
}