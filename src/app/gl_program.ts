import {loadTexture, initShaderProgram, loadShader} from './gl_utils';

interface AttribLocations {
    vertexPosition: number;
    vertexNormal: number;
}
interface UniformLocations {
    projectionMatrix: WebGLUniformLocation;
    modelViewMatrix: WebGLUniformLocation;
    normalMatrix: WebGLUniformLocation;
}

export class GlProgram {
    program: WebGLProgram;
    attribLocations: AttribLocations;
    uniformLocations: UniformLocations;

    constructor(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        this.program = shaderProgram;
        this.attribLocations = {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        };
        this.uniformLocations = {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        };
    }
}