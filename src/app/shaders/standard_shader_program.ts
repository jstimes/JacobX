import {BaseShaderProgram, BaseShaderUniformLocations} from './base_shader_program';

const VERTEX_SHADER_SOURCE = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform vec4 uColor;
  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform vec3 uPointLightPosition;
  uniform vec3 uCameraPosition;

  varying highp vec3 vNormal;
  varying highp vec4 vColor;
  varying highp vec3 vSurfaceToPointLight;
  varying highp vec3 vSurfaceToCamera;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
    vColor = uColor;

    highp vec3 worldCoords = (uModelMatrix * aVertexPosition).xyz;
    vSurfaceToPointLight = uPointLightPosition - worldCoords;
    vSurfaceToCamera = uCameraPosition - worldCoords;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  varying highp vec3 vNormal;
  varying highp vec4 vColor;
  varying highp vec3 vSurfaceToPointLight;
  varying highp vec3 vSurfaceToCamera;

  uniform highp vec3 uReverseLightDirection;
  uniform highp float uSpecularShininess;

  void main() {
    highp float ambientLight = .2;
    highp vec3 normal = normalize(vNormal);
    highp float directionalLight = max(dot(normal, uReverseLightDirection), 0.0);
    highp vec3 surfaceToPointLight = normalize(vSurfaceToPointLight);
    highp float pointLight = max(dot(normal, surfaceToPointLight), 0.0);
    highp vec3 surfaceToCamera = normalize(vSurfaceToCamera);
    highp vec3 halfVector = normalize(surfaceToPointLight + surfaceToCamera);
    highp float specularLight = 0.0;
    if (pointLight > 0.0) {
      specularLight = pow(dot(normal, surfaceToCamera), uSpecularShininess);
    }

    highp float maxDirectional = 0.4;
    highp float maxPoint = 0.4;
    directionalLight = min(directionalLight, maxDirectional);
    pointLight = min(pointLight, maxPoint);

    highp float light = ambientLight + directionalLight + pointLight;
    gl_FragColor = vec4(vColor.rgb * light, vColor.a);

    gl_FragColor.rgb += specularLight;
  }
`;

export interface StandardShaderUniformLocations {
  reverseLightDirection: WebGLUniformLocation;
  pointLightPosition: WebGLUniformLocation;
  cameraPosition: WebGLUniformLocation;
  specularShininess: WebGLUniformLocation;
}

export class StandardShaderProgram extends BaseShaderProgram {
  standardShaderUniformLocations: StandardShaderUniformLocations;

  constructor(gl: WebGLRenderingContext) {
    super(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);

    this.standardShaderUniformLocations = {
        reverseLightDirection: gl.getUniformLocation(this.program, 'uReverseLightDirection'),
        pointLightPosition: gl.getUniformLocation(this.program, 'uPointLightPosition'),
        cameraPosition: gl.getUniformLocation(this.program, 'uCameraPosition'),
        specularShininess: gl.getUniformLocation(this.program, 'uSpecularShininess'),
    };
  }
}