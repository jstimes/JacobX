import { loadTexture, initShaderProgram, loadShader } from 'src/app/gl_utils';

export interface BaseShaderAttribLocations {
    readonly vertexPosition: number;
    readonly vertexNormal: number;
}

export interface BaseShaderUniformLocations {
    readonly projectionMatrix: WebGLUniformLocation;
    readonly viewMatrix: WebGLUniformLocation;
    readonly modelMatrix: WebGLUniformLocation;
    readonly normalMatrix: WebGLUniformLocation;
}

export class BaseShaderProgram {
    readonly program: WebGLProgram;
    readonly attribLocations: BaseShaderAttribLocations;
    readonly uniformLocations: BaseShaderUniformLocations;

    constructor(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        this.program = shaderProgram;
        this.attribLocations = {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        };
        this.uniformLocations = {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        };
    }
}