import {vec3, mat4} from 'src/app/gl-matrix.js';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';
import {GameObject} from './game_object';
import { SQUARE_RENDERABLE } from 'src/app/renderables/square_renderable';
import { makeVec, makeVec4, Square } from 'src/app/math_utils';
import { Material } from 'src/app/material';

interface Tile {
    model: mat4;
    material: Material;
    square: Square;
}

export class Floor extends GameObject {

    floorColor = [.05, .2, .05, 1.0];

    useGrid = true;
    gridTiles: Tile[] = [];

    width = 1000;

    constructor() {
        super();
        const scaling = this.width / 2;
        this.scale = [scaling, scaling, scaling];

        if (this.useGrid) {
            const gridColors = [
                {
                    ambient: makeVec4(1, 1, 1, 1),
                    diffuse: makeVec4(1, 1, 1, 1),
                    specular: makeVec4(1, 1, 1, 1),
                    shininess: 32,
                }, 
                {
                    ambient: makeVec4(0.2, 0.2, 0.2, 1),
                    diffuse: makeVec4(0.2, 0.2, 0.2, 1),
                    specular: makeVec4(1, 1, 1, 1),
                    shininess: 32,
                },
            ];

            const squareSize = 50;
            const scale = squareSize / 2;
            const start = -(this.width / 2);
            const squaresPerRow = this.width / squareSize;
            const initialPosition = [start, 0, start];
            const elevationStartZ = squaresPerRow / 2 + 2;
            const deltaY = 8;
            const halfDeltaY = deltaY / 2;
            for (let i=0; i<squaresPerRow; i++) {
                for (let j=0; j<squaresPerRow; j++) {
                    let yFront = 0;
                    let yBack = 0;
                    if (j < 4) {
                        yFront = deltaY * (j);
                        yBack = deltaY * (j + 1);
                    } else  if (j === 4) {
                        yFront = yBack = deltaY *4;
                    } else if (j <= 8) {
                        yFront = deltaY * (8-j+1)
                        yBack = deltaY * (8-j);
                    }
                    // const position = [initialPosition[0] + squareSize * i, y, initialPosition[2] + squareSize * j];
                    
                    const leftX = initialPosition[0] + squareSize * i;
                    const rightX = leftX + squareSize;
                    const frontZ = initialPosition[2] + squareSize * j;
                    const backZ = frontZ + squareSize;
                    const square = new Square({
                        a: makeVec(leftX, yFront, frontZ),
                        b: makeVec(leftX, yBack, backZ), 
                        c: makeVec(rightX, yBack, backZ),
                        d: makeVec(rightX, yFront, frontZ),
                    });
                    const bToA = vec3.sub(vec3.create(), square.a, square.b);
                    let rotAngleAboutXAxis = vec3.angle(bToA, makeVec(0, 0, -1.0));
                    if (yFront < yBack) {
                        rotAngleAboutXAxis *= -1.0;
                    }
                    const squareCenter = makeVec(leftX + scale, (yFront + yBack) / 2.0, frontZ + scale);
                    const model = mat4.create();
                    mat4.translate(model, model, squareCenter);
                    mat4.rotate(model,  
                        model,
                        rotAngleAboutXAxis,
                        makeVec(1, 0, 0));
                    const zScale = vec3.length(bToA) / 2.0;
                    mat4.scale(model, model, [scale, scale, zScale]);
                    const colorIndex = (i + j) % 2;
                    const tile = {
                        model,
                        material: gridColors[colorIndex],
                        square,
                    };
                    this.gridTiles.push(tile);
                }
            }
        }
    }

    getYAtXZ(x: number, z: number): number {
        for (let tile of this.gridTiles) {
            if (x >= tile.square.a[0] && x <= tile.square.d[0] && z >= tile.square.a[2] && z <= tile.square.b[2]) {
                const tileZLength = Math.abs(tile.square.a[2] - tile.square.b[2]);
                const zRatio = (z - tile.square.a[2]) / tileZLength;

                const aToB = vec3.sub(vec3.create(), tile.square.b, tile.square.a);
                const interpolated = vec3.scale(vec3.create(), aToB, zRatio);
                return interpolated[1] + tile.square.a[1];
            }
        }
        console.log("XZ not found");
        return -1;
    }

    render(gl: WebGLRenderingContext, program: StandardShaderProgram): void {
        if (this.useGrid) {
            this.gridTiles.forEach((tile: Tile) => {
                program.setMaterialUniform(gl, tile.material);
                SQUARE_RENDERABLE.render(gl, program, tile.model);
            })
            return;
        }

        const model = mat4.create();
        mat4.translate(model, model, this.position);
        
        gl.uniform4fv(program.uniformLocations.colorVec, this.floorColor);
        // FLOOR_RENDERABLE.render(gl, program, model);

        mat4.scale(model, model, this.scale);
        SQUARE_RENDERABLE.render(gl, program, model);
    }
}