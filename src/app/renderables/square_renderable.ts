import {Renderable} from './renderable';
import {vec3, mat4} from '../gl-matrix.js';
import {makeVec, addVec, Square, Triangle, getTrianglesFromSquares} from '../math_utils';

/** Square centered at (0, 0, 0) on the xz plane, with it's normal in the +y direction. */
class SquareRenderable extends Renderable {

    constructor() {
        super();

        const halfWidth = 1;
        const topLeft = makeVec(-halfWidth, 0, -halfWidth);
        const bottomLeft = makeVec(-halfWidth, 0, halfWidth);
        const bottomRight = makeVec(halfWidth, 0, halfWidth);
        const topRight = makeVec(halfWidth, 0, -halfWidth);
        const squares = [new Square({a: topLeft, b: bottomLeft, c: bottomRight, d: topRight})];
        const triangles = getTrianglesFromSquares(squares);
        console.log(triangles[0].getNormal());
        this.addTriangles(triangles);
    }
}

export const SQUARE_RENDERABLE = new SquareRenderable();