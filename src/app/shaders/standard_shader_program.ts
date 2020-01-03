import {BaseShaderProgram, BaseShaderUniformLocations} from './base_shader_program';
import { Material } from 'src/app/material';
import { LightColor } from 'src/app/lights/lights';

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

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

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec4 vColor;
  varying vec3 vSurfaceToPointLight;
  varying vec3 vSurfaceToSpotLight;
  varying vec3 vSurfaceToCamera;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
    vColor = uColor;

    vec3 worldCoords = (uModelMatrix * aVertexPosition).xyz;
    vPosition = worldCoords;
    vSurfaceToPointLight = uPointLightPosition - worldCoords;
    vSurfaceToSpotLight = uSpotLightPosition - worldCoords;
    vSurfaceToCamera = uCameraPosition - worldCoords;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  struct Material {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    float shininess;
  };

  struct LightColor {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
  };

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec4 vColor;
  varying vec3 vSurfaceToPointLight;
  varying vec3 vSurfaceToSpotLight;
  varying vec3 vSurfaceToCamera;

  uniform vec3 uReverseLightDirection;
  uniform float uSpecularShininess;
  uniform vec3 uSpotLightDirection;
  uniform float uSpotLightLowerLimit;
  uniform float uSpotLightUpperLimit;
  uniform vec3 uCameraPosition;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec4 uFogColor;

  uniform Material uMaterial;
  uniform LightColor uLightColor;

  void main() {
    float ambientLight = .1;
    vec3 normal = normalize(vNormal);
    float directionalLight = max(dot(normal, uReverseLightDirection), 0.0);
    vec3 surfaceToPointLight = normalize(vSurfaceToPointLight);
    float pointLight = max(dot(normal, surfaceToPointLight), 0.0);
    vec3 surfaceToCamera = normalize(vSurfaceToCamera);
    vec3 halfVector = normalize(surfaceToPointLight + surfaceToCamera);
    float specularLight = 0.0;
    specularLight = pointLight * pow(dot(normal, surfaceToCamera), uSpecularShininess);

    float spotLight = 0.0;
    vec3 surfaceToSpotLight = normalize(vSurfaceToSpotLight);
    float inSpotLight = smoothstep(uSpotLightUpperLimit, uSpotLightLowerLimit, dot(surfaceToSpotLight, normalize(-uSpotLightDirection)));
    spotLight = inSpotLight * dot(normal, surfaceToSpotLight);

    float maxDirectional = 0.2;
    float maxPoint = 0.4;
    directionalLight = min(directionalLight, maxDirectional);
    pointLight = min(pointLight, maxPoint);

    float light = min(1.0, ambientLight + directionalLight + pointLight + spotLight);
    vec4 color = vec4(vColor.rgb * light, vColor.a);

    color.rgb += specularLight;

    // Fog
    float distance = length(vPosition - uCameraPosition);
    float fogAmount = smoothstep(uFogNear, uFogFar, distance);

    gl_FragColor = mix(color, uFogColor, fogAmount);
  }
`;

export interface StandardShaderUniformLocations {
  // Directional light
  reverseLightDirection: WebGLUniformLocation;

  // Point light
  pointLightPosition: WebGLUniformLocation;

  // Spot light
  spotLightPosition: WebGLUniformLocation;
  spotLightDirection: WebGLUniformLocation;
  spotLightLowerLimit: WebGLUniformLocation;
  spotLightUpperLimit: WebGLUniformLocation;

  // Camera
  cameraPosition: WebGLUniformLocation;

  // Object material
  materialAmbient: WebGLUniformLocation;
  materialDiffuse: WebGLUniformLocation;
  materialSpecular: WebGLUniformLocation;
  materialShininess: WebGLUniformLocation;

  // TODO - use one for each light
  // Light color
  lightColorAmbient: WebGLUniformLocation;
  lightColorDiffuse: WebGLUniformLocation;
  lightColorSpecular: WebGLUniformLocation;

  // TODO - delete once material is implemented
  specularShininess: WebGLUniformLocation;

  // Fog
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

        materialAmbient: gl.getUniformLocation(this.program, 'uMaterial.ambient'),
        materialDiffuse: gl.getUniformLocation(this.program, 'uMaterial.diffuse'),
        materialSpecular: gl.getUniformLocation(this.program, 'uMaterial.specular'),
        materialShininess: gl.getUniformLocation(this.program, 'uMaterial.shininess'),

        lightColorAmbient: gl.getUniformLocation(this.program, 'uLightColor.ambient'),
        lightColorDiffuse: gl.getUniformLocation(this.program, 'uLightColor.diffuse'),
        lightColorSpecular: gl.getUniformLocation(this.program, 'uLightColor.specular'),

        specularShininess: gl.getUniformLocation(this.program, 'uSpecularShininess'),

        fogNear: gl.getUniformLocation(this.program, 'uFogNear'),
        fogFar: gl.getUniformLocation(this.program, 'uFogFar'),
        fogColor: gl.getUniformLocation(this.program, 'uFogColor'),
    };
  }

  setMaterialUniform(gl: WebGLRenderingContext, material: Material) {
    gl.uniform4fv(this.standardShaderUniformLocations.materialAmbient, material.ambient);
    gl.uniform4fv(this.standardShaderUniformLocations.materialDiffuse, material.diffuse);
    gl.uniform4fv(this.standardShaderUniformLocations.materialSpecular, material.specular);
    gl.uniform1f(this.standardShaderUniformLocations.materialShininess, material.shininess);
  }

  setLightColorUniform(gl: WebGLRenderingContext, lightColor: LightColor) {
    gl.uniform3fv(this.standardShaderUniformLocations.lightColorAmbient, lightColor.ambient);
    gl.uniform3fv(this.standardShaderUniformLocations.lightColorDiffuse, lightColor.diffuse);
    gl.uniform3fv(this.standardShaderUniformLocations.lightColorSpecular, lightColor.specular);
  }
}