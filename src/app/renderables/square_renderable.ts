import {Renderable} from './renderable';
import {vec3, mat4} from '../gl-matrix.js';
import {makeVec, addVec, Square, Triangle, getTrianglesFromSquares} from '../math_utils';

/** Square centered at (0, 0, 0) on the xy plane, with it's normal in the +z direction. */
class SquareRenderable extends Renderable {

    constructor() {
        super();

        const halfWidth = 1;
        const topLeft = makeVec(-halfWidth, halfWidth, 0);
        const bottomLeft = makeVec(-halfWidth, -halfWidth, 0);
        const bottomRight = makeVec(halfWidth, -halfWidth, 0);
        const topRight = makeVec(halfWidth, halfWidth, 0);
        const squares = [new Square({a: topLeft, b: bottomLeft, c: bottomRight, d: topRight})];
        const triangles = getTrianglesFromSquares(squares);
        this.addTriangles(triangles);
    }
}

export const SQUARE_RENDERABLE = new SquareRenderable();