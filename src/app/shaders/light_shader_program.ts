import {BaseShaderProgram, BaseShaderUniformLocations} from './base_shader_program';

const VERTEX_SHADER_SOURCE = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform vec4 uColor;
  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec3 vNormal;
  varying highp vec4 vColor;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
    vColor = uColor;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  varying highp vec3 vNormal;
  varying highp vec4 vColor;

  void main() {
    gl_FragColor = vColor;
  }
`;

export class LightShaderProgram extends BaseShaderProgram {

  constructor(gl: WebGLRenderingContext) {
    super(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
  }
}