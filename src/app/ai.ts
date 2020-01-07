import {vec3, vec4, mat4} from './gl-matrix.js';
import { makeVec, makeVec4, addVec } from './math_utils';

// import { CONTROLS, Key } from 'src/app/controls';

// import {Camera} from './camera';

// import { GameObject } from 'src/app/game_objects/game_object';
import { Car, Input } from 'src/app/game_objects/car';
import { Scene } from 'src/app/scene';


export class Ai {

    car: Car;
    scene: Scene;

    constructor(car: Car, scene: Scene) {
        this.car = car;
        this.scene = scene;
    }

    wait = 2000;
    getInput(): Input {
        if (this.wait > 0) {
            this.wait--;
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
        // return {
        //     isTurningLeft: false,
        //     isTurningRight: false,
        //     isGasPedalDown: false,
        //     isBrakePedalDown: false,
        //     isShooting: false,
        // };
    }
}