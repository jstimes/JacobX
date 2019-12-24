import {loadTexture, initShaderProgram, loadShader} from './gl_utils';

interface AttribLocations {
    vertexPosition: number;
    vertexNormal: number;
}
interface UniformLocations {
    colorVec: WebGLUniformLocation;
    projectionMatrix: WebGLUniformLocation;
    viewMatrix: WebGLUniformLocation;
    modelMatrix: WebGLUniformLocation;
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
            colorVec: gl.getUniformLocation(shaderProgram, 'uColor'),
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        };
    }
}