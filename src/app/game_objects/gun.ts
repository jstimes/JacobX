import { vec3, mat4 } from 'gl-matrix';

import { makeVec, makeVec4, addVec, hasSignChange, sign, Square, EPSILON } from 'src/app/math_utils';
import { Projectile } from 'src/app/game_objects/projectile';
import { GameObject } from 'src/app/game_objects/game_object';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';

export class Gun extends GameObject {

    private readonly timeBetweenShotsMs: number = 100;
    private timeSinceLastShot: number = 0;

    update(elapsedMs: number) {
        this.timeSinceLastShot += elapsedMs;
    }

    isReadyToShoot(): boolean {
        return this.timeSinceLastShot > this.timeBetweenShotsMs;
    }

    shoot(origin: vec3, forwardDirection: vec3, orientation: mat4): Projectile {
        this.timeSinceLastShot = 0;
        const projectile = new Projectile(origin, forwardDirection);
        return projectile;
    }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram): void {

    }
}