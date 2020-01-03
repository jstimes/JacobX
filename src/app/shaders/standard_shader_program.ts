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
  uniform vec3 uSpotLightPosition;
  uniform vec3 uCameraPosition;

  varying highp vec3 vPosition;
  varying highp vec3 vNormal;
  varying highp vec4 vColor;
  varying highp vec3 vSurfaceToPointLight;
  varying highp vec3 vSurfaceToSpotLight;
  varying highp vec3 vSurfaceToCamera;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
    vColor = uColor;

    highp vec3 worldCoords = (uModelMatrix * aVertexPosition).xyz;
    vPosition = worldCoords;
    vSurfaceToPointLight = uPointLightPosition - worldCoords;
    vSurfaceToSpotLight = uSpotLightPosition - worldCoords;
    vSurfaceToCamera = uCameraPosition - worldCoords;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  varying highp vec3 vPosition;
  varying highp vec3 vNormal;
  varying highp vec4 vColor;
  varying highp vec3 vSurfaceToPointLight;
  varying highp vec3 vSurfaceToSpotLight;
  varying highp vec3 vSurfaceToCamera;

  uniform highp vec3 uReverseLightDirection;
  uniform highp float uSpecularShininess;
  uniform highp vec3 uSpotLightDirection;
  uniform highp float uSpotLightLowerLimit;
  uniform highp float uSpotLightUpperLimit;
  uniform highp vec3 uCameraPosition;
  uniform highp float uFogNear;
  uniform highp float uFogFar;
  uniform highp vec4 uFogColor;

  void main() {
    highp float ambientLight = .1;
    highp vec3 normal = normalize(vNormal);
    highp float directionalLight = max(dot(normal, uReverseLightDirection), 0.0);
    highp vec3 surfaceToPointLight = normalize(vSurfaceToPointLight);
    highp float pointLight = max(dot(normal, surfaceToPointLight), 0.0);
    highp vec3 surfaceToCamera = normalize(vSurfaceToCamera);
    highp vec3 halfVector = normalize(surfaceToPointLight + surfaceToCamera);
    highp float specularLight = 0.0;
    specularLight = pointLight * pow(dot(normal, surfaceToCamera), uSpecularShininess);

    highp float spotLight = 0.0;
    highp vec3 surfaceToSpotLight = normalize(vSurfaceToSpotLight);
    highp float inSpotLight = smoothstep(uSpotLightUpperLimit, uSpotLightLowerLimit, dot(surfaceToSpotLight, normalize(-uSpotLightDirection)));
    spotLight = inSpotLight * dot(normal, surfaceToSpotLight);

    highp float maxDirectional = 0.6;
    highp float maxPoint = 0.4;
    directionalLight = min(directionalLight, maxDirectional);
    pointLight = min(pointLight, maxPoint);

    highp float light = min(1.0, ambientLight + directionalLight + pointLight + spotLight);
    highp vec4 color = vec4(vColor.rgb * light, vColor.a);

    color.rgb += specularLight;

    // Fog
    highp float distance = length(vPosition - uCameraPosition);
    highp float fogAmount = smoothstep(uFogNear, uFogFar, distance);

    gl_FragColor = mix(color, uFogColor, fogAmount);
  }
`;

export interface StandardShaderUniformLocations {
  reverseLightDirection: WebGLUniformLocation;
  pointLightPosition: WebGLUniformLocation;
  spotLightPosition: WebGLUniformLocation;
  spotLightDirection: WebGLUniformLocation;
  spotLightLowerLimit: WebGLUniformLocation;
  spotLightUpperLimit: WebGLUniformLocation;
  cameraPosition: WebGLUniformLocation;
  specularShininess: WebGLUniformLocation;
  fogNear: WebGLUniformLocation;
  fogFar: WebGLUniformLocation;
  fogColor: WebGLUniformLocation;
}

export class StandardShaderProgram extends BaseShaderProgram {
  standardShaderUniformLocations: StandardShaderUniformLocations;

  constructor(gl: WebGLRenderingContext) {
    super(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);

    this.standardShaderUniformLocations = {
        reverseLightDirection: gl.getUniformLocation(this.program, 'uReverseLightDirection'),
        pointLightPosition: gl.getUniformLocation(this.program, 'uPointLightPosition'),
        spotLightPosition: gl.getUniformLocation(this.program, 'uSpotLightPosition'),
        spotLightDirection: gl.getUniformLocation(this.program, 'uSpotLightDirection'),
        spotLightLowerLimit: gl.getUniformLocation(this.program, 'uSpotLightLowerLimit'),
        spotLightUpperLimit: gl.getUniformLocation(this.program, 'uSpotLightUpperLimit'),
        cameraPosition: gl.getUniformLocation(this.program, 'uCameraPosition'),
        specularShininess: gl.getUniformLocation(this.program, 'uSpecularShininess'),
        fogNear: gl.getUniformLocation(this.program, 'uFogNear'),
        fogFar: gl.getUniformLocation(this.program, 'uFogFar'),
        fogColor: gl.getUniformLocation(this.program, 'uFogColor'),
    };
  }
}