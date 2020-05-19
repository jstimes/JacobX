import { vec3, vec4, mat4 } from 'src/app/gl-matrix.js';
import { BaseShaderProgram, BaseShaderUniformLocations } from './base_shader_program';

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec3 vNormal;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  varying vec3 vNormal;

  uniform vec4 uColor;

  void main() {
    gl_FragColor = uColor;
  }
`;

export class LightShaderProgram extends BaseShaderProgram {

  readonly colorUniformLocation: WebGLUniformLocation;

  constructor(gl: WebGLRenderingContext) {
    super(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.colorUniformLocation = gl.getUniformLocation(this.program, 'uColor');
  }

  setColor(gl: WebGLRenderingContext, lightColor: vec4) {
    gl.uniform4fv(this.colorUniformLocation, lightColor);
  }
}