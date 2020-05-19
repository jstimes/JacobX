import { vec3, mat4 } from 'src/app/gl-matrix.js';
import { makeVec } from 'src/app/math_utils';


export class Ray {
    readonly origin: vec3;
    readonly direction: vec3;
    readonly inverseDirection: vec3;
    readonly sign: number[];

    constructor(origin: vec3, direction: vec3) {
        this.origin = origin;
        this.direction = direction;
        this.inverseDirection = makeVec(1 / this.direction[0], 1 / this.direction[1], 1 / this.direction[2]);
        this.sign = [
            this.inverseDirection[0] < 0 ? 1 : 0,
            this.inverseDirection[1] < 0 ? 1 : 0,
            this.inverseDirection[2] < 0 ? 1 : 0,
        ];
    }
}

export class Box {
    bounds: vec3[];

    constructor(min: vec3, max: vec3) {
        this.bounds = [vec3.clone(min), vec3.clone(max)];
    }
}

class Collision {

    // Thanks http://www.cs.utah.edu/~awilliam/box/box.pdf
    rayIntersectsBox(ray: Ray, box: Box, t0: number, t1: number): boolean {

        let tMin = (box.bounds[ray.sign[0]][0] - ray.origin[0]) * ray.inverseDirection[0];
        let tMax = (box.bounds[1 - ray.sign[0]][0] - ray.origin[0]) * ray.inverseDirection[0];
        const tyMin = (box.bounds[ray.sign[1]][1] - ray.origin[1]) * ray.inverseDirection[1];
        const tyMax = (box.bounds[1 - ray.sign[1]][1] - ray.origin[1]) * ray.inverseDirection[1];
        if (tMin > tyMax || tyMin > tMax) {
            return false;
        }
        if (tyMin > tMin) {
            tMin = tyMin;
        }
        if (tyMax < tMax) {
            tMax = tyMax;
        }
        const tzMin = (box.bounds[ray.sign[2]][2] - ray.origin[2]) * ray.inverseDirection[2];
        const tzMax = (box.bounds[1 - ray.sign[2]][2] - ray.origin[2]) * ray.inverseDirection[2];
        if (tMin > tzMax || tzMin > tMax) {
            return false;
        }
        if (tzMin > tMin) {
            tMin = tzMin;
        }
        if (tzMax < tMax) {
            tMax = tzMax;
        }

        return tMin < t1 && tMax > t0;
    }

    pointInBox(point: vec3, box: Box): boolean {
        return point[0] > box.bounds[0][0] && point[0] < box.bounds[1][0] &&
            point[1] > box.bounds[0][1] && point[1] < box.bounds[1][1] &&
            point[2] > box.bounds[0][2] && point[2] < box.bounds[1][2];
    }
}

export const COLLISION = new Collision();