import {Renderable} from './renderable';
import {vec3, mat4} from '../gl-matrix.js';
import {makeVec, addVec, Square, Triangle, getTrianglesFromSquares} from '../math_utils';

class HalfSphereRenderable extends Renderable {

    constructor() {
        super();

        const squares: Square[] = [];
        const deltaPhi = Math.PI / 80;
        const TWO_PI = Math.PI * 2.0;
        const PI_OVER_TWO = Math.PI / 2.0;
        for (let yheda = 0; yheda < PI_OVER_TWO - deltaPhi; yheda += deltaPhi) {
            const y = Math.sin(yheda);
            const y2 = Math.sin(yheda + deltaPhi);
            const cosY = Math.cos(yheda);
            const cosY2 = Math.cos(yheda + deltaPhi);
            for (let theta = 0; theta < TWO_PI- deltaPhi; theta += deltaPhi) {
                const x = Math.cos(theta);
                const z = Math.sin(theta);
                const x2 = Math.cos(theta + deltaPhi);
                const z2 = Math.sin(theta + deltaPhi);
                const d = vec3.normalize(vec3.create(), makeVec(x*cosY2, y2, z*cosY2));
                const c = vec3.normalize(vec3.create(), makeVec(x*cosY, y, z*cosY));
                const b = vec3.normalize(vec3.create(), makeVec(x2*cosY, y, z2*cosY));
                const a = vec3.normalize(vec3.create(), makeVec(x2*cosY2, y2, z2*cosY2));
                squares.push(new Square({a, b, c, d}));
            }
        }
        const triangles = getTrianglesFromSquares(squares);
        this.addTriangles(triangles);
    }
}

export const HALF_SPHERE_RENDERABLE = new HalfSphereRenderable();