import {mat4} from 'src/app/gl-matrix.js';
import { StandardShaderProgram } from 'src/app/shaders/standard_shader_program';
import { FLOOR_RENDERABLE } from 'src/app/renderables/floor_renderable';
import {GameObject} from './game_object';
import { SQUARE_RENDERABLE } from 'src/app/renderables/square_renderable';

interface Tile {
    model: mat4;
    color: number[];
}

export class FlatFloor extends GameObject {

    floorColor = [.05, .2, .05, 1.0];

    useGrid = true;
    gridTiles = [];

    width = 1000;

    constructor() {
        super();
        this.rotationAxis = [1, 0, 0];
        this.rotationAngle = 0.0;
        const scaling = this.width / 2;
        this.scale = [scaling, scaling, scaling];

        if (this.useGrid) {
            const gridColors = [[1, 1, 1, 1], [0, 0, 0, 1]];

            const squareSize = 50;
            const scale = squareSize / 2;
            const start = -(this.width / 2);
            const squaresPerRow = this.width / squareSize;
            const initialPosition = [start + scale, 0, start + scale];
            for (let i=0; i<squaresPerRow; i++) {
                for (let j=0; j<squaresPerRow; j++) {
                    const position = [initialPosition[0] + squareSize * i, 0, initialPosition[2] + squareSize * j];
                    const model = mat4.create();
                    mat4.translate(model, model, position);
                    mat4.rotate(model,  // destination matrix
                        model,  // matrix to rotate
                        this.rotationAngle,   // amount to rotate in radians
                        this.rotationAxis);       // axis to rotate around
                    mat4.scale(model, model, [scale, scale, scale]);
                    const colorIndex = (i + j) % 2;
                    const tile = {
                        model,
                        color: gridColors[colorIndex],
                    };
                    this.gridTiles.push(tile);
                }
            }
        }
    }

    update(elapsedMs: number): void {}

    render(gl: WebGLRenderingContext, program: StandardShaderProgram) {
        if (this.useGrid) {
            this.gridTiles.forEach((tile: Tile) => {
                gl.uniform4fv(program.uniformLocations.colorVec, tile.color);
                SQUARE_RENDERABLE.render(gl, program, tile.model);
            })
            return;
        }

        const model = mat4.create();
        mat4.translate(model, model, this.position);

        mat4.rotate(model,  // destination matrix
            model,  // matrix to rotate
            this.rotationAngle,   // amount to rotate in radians
            this.rotationAxis);       // axis to rotate around
        
        gl.uniform4fv(program.uniformLocations.colorVec, this.floorColor);
        // FLOOR_RENDERABLE.render(gl, program, model);

        mat4.scale(model, model, this.scale);
        SQUARE_RENDERABLE.render(gl, program, model);
    }
}