import { vec3, vec4, mat4 } from './gl-matrix.js';
import { makeVec, makeVec4, addVec } from './math_utils';
import { Car, Input } from 'src/app/game_objects/car';
import { Scene } from 'src/app/scene';


export class Ai {

    private readonly car: Car;
    private readonly scene: Scene;

    constructor(car: Car, scene: Scene) {
        this.car = car;
        this.scene = scene;
    }

    private delay = 1000;
    getInput(): Input {
        if (this.delay > 0) {
            this.delay--;
            return {
                isTurningLeft: false,
                isTurningRight: false,
                isGasPedalDown: false,
                isBrakePedalDown: false,
                isShooting: false,
            };
        }
        const random = Math.random();
        return {
            isTurningLeft: random > .3,
            isTurningRight: random > .3,
            isGasPedalDown: random > .1,
            isBrakePedalDown: false,
            isShooting: random > .9,
        };
    }
}