import {BaseShaderProgram, BaseShaderUniformLocations} from './base_shader_program';
import { Material } from 'src/app/material';
import { LightColor, PointLight, SpotLight, DirectionalLight } from 'src/app/lights/lights';

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  struct LightColor {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
  };

  struct DirectionalLight {
    vec3 direction;
    LightColor lightColor;
  };

  struct PointLight {
    vec3 position;
    LightColor lightColor;

    // For distance-based attenuation:
    float constant;
    float linear;
    float quadratic;
  };

  struct SpotLight {
    vec3 position;
    vec3 direction;
    LightColor lightColor;

    // For cone size:
    float lowerLimit;
    float upperLimit;

    // For distance-based attenuation:
    float constant;
    float linear;
    float quadratic;
  };

  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform vec4 uColor;
  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  
  uniform DirectionalLight uDirectionalLight;
  uniform PointLight uPointLight;
  uniform SpotLight uSpotLight;
  uniform vec3 uCameraPosition;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vSurfaceToPointLight;
  varying vec3 vSurfaceToSpotLight;
  varying vec3 vSurfaceToCamera;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;

    vec3 worldCoords = (uModelMatrix * aVertexPosition).xyz;
    vPosition = worldCoords;
    vSurfaceToPointLight = uPointLight.position - worldCoords;
    vSurfaceToSpotLight = uSpotLight.position - worldCoords;
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

  struct DirectionalLight {
    vec3 direction;
    LightColor lightColor;
  };

  struct PointLight {
    vec3 position;
    LightColor lightColor;

    // For distance-based attenuation:
    float constant;
    float linear;
    float quadratic;
  };

  struct SpotLight {
    vec3 position;
    vec3 direction;
    LightColor lightColor;

    // For cone size:
    float lowerLimit;
    float upperLimit;

    // For distance-based attenuation:
    float constant;
    float linear;
    float quadratic;
  };

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vSurfaceToPointLight;
  varying vec3 vSurfaceToSpotLight;
  varying vec3 vSurfaceToCamera;

  // Expected to already be normalized.
  uniform vec3 uReverseLightDirection;
  uniform vec3 uCameraPosition;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec4 uFogColor;

  uniform DirectionalLight uDirectionalLight;
  uniform PointLight uPointLight;
  uniform SpotLight uSpotLight;

  uniform Material uMaterial;

  vec3 calculate_directional_light(
      DirectionalLight directionalLight, 
      Material material, 
      vec3 normal, 
      vec3 surfaceToCamera) {
    vec3 surfaceToLight = normalize(-directionalLight.direction);
    vec3 directionalAmbient = directionalLight.lightColor.ambient * material.ambient.rgb;

    float directionalDiffuseAmount = max(dot(normal, surfaceToLight), 0.0);
    vec3 directionalDiffuse = directionalDiffuseAmount * directionalLight.lightColor.diffuse * material.diffuse.rgb;
    
    vec3 directionalSpecularReflectDir = reflect(surfaceToLight, normal);
    float directionalSpecularAmount = pow(max(dot(surfaceToCamera, directionalSpecularReflectDir), 0.0), material.shininess);
    vec3 directionalSpecular = directionalSpecularAmount * directionalLight.lightColor.specular * material.specular.rgb;

    return directionalAmbient + directionalDiffuse + directionalSpecular;
  }

  vec3 calculate_point_light(vec3 vSurfaceToPointLight, vec3 normal, vec3 surfaceToCamera, Material material, PointLight pointLight) {
    vec3 surfaceToPointLight = normalize(vSurfaceToPointLight);
    float diffuse = max(dot(normal, surfaceToPointLight), 0.0);
    vec3 reflectDir = reflect(-surfaceToPointLight, normal);  
    float specular = pow(max(dot(surfaceToCamera, reflectDir), 0.0), material.shininess);
    float distance    = length(vSurfaceToPointLight);
    float attenuation = 1.0 / (pointLight.constant + pointLight.linear * distance + 
      pointLight.quadratic * (distance * distance));
    return pointLight.lightColor.ambient * material.ambient.rgb * attenuation + 
        diffuse * pointLight.lightColor.diffuse * material.diffuse.rgb * attenuation + 
        specular * pointLight.lightColor.specular * material.specular.rgb * attenuation;
  }

  vec3 calculate_spot_light(vec3 vSurfaceToSpotLight, vec3 normal, vec3 surfaceToCamera, Material material, SpotLight spotLight) {
    vec3 ambient = spotLight.lightColor.ambient * material.diffuse.rgb;
    
    vec3 surfaceToSpotLight = normalize(vSurfaceToSpotLight);
    float diff = max(dot(normal, surfaceToSpotLight), 0.0);
    vec3 diffuse = spotLight.lightColor.diffuse * diff * material.diffuse.rgb;
    
    vec3 reflectDir = reflect(-surfaceToSpotLight, normal);  
    float spec = pow(max(dot(surfaceToCamera, reflectDir), 0.0), material.shininess);
    vec3 specular = spotLight.lightColor.specular * spec * material.specular.rgb;
    
    float spotLightIntensity = smoothstep(spotLight.upperLimit, spotLight.lowerLimit, dot(surfaceToSpotLight, normalize(-spotLight.direction)));
    ambient *= spotLightIntensity;
    diffuse  *= spotLightIntensity;
    specular *= spotLightIntensity;
    
    // attenuation
    float distance    = length(vSurfaceToSpotLight);
    float attenuation = 1.0 / (spotLight.constant + spotLight.linear * distance + spotLight.quadratic * (distance * distance));    
    ambient  *= attenuation; 
    diffuse   *= attenuation;
    specular *= attenuation;   
        
    return ambient + diffuse + specular;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 surfaceToCamera = normalize(vSurfaceToCamera);

    // Lights
    vec3 directionalColor = calculate_directional_light(uDirectionalLight, uMaterial, normal, surfaceToCamera);
    vec3 pointColor = calculate_point_light(vSurfaceToPointLight, normal, surfaceToCamera, uMaterial, uPointLight);
    vec3 spotColor = calculate_spot_light(vSurfaceToSpotLight, normal, surfaceToCamera, uMaterial, uSpotLight);
    
    vec4 color = vec4(directionalColor + pointColor + spotColor, 1.0);

    // Fog
    float distance = length(vPosition - uCameraPosition);
    float fogAmount = smoothstep(uFogNear, uFogFar, distance);

    gl_FragColor = mix(color, uFogColor, fogAmount);
  }
`;

export interface StandardShaderUniformLocations {
  // Directional light
  directionalLightDirection: WebGLUniformLocation;
  directionalLightColorAmbient: WebGLUniformLocation;
  directionalLightColorDiffuse: WebGLUniformLocation;
  directionalLightColorSpecular: WebGLUniformLocation;

  // Point light
  pointLightPosition: WebGLUniformLocation;
  pointLightColorAmbient: WebGLUniformLocation;
  pointLightColorDiffuse: WebGLUniformLocation;
  pointLightColorSpecular: WebGLUniformLocation;
  pointLightConstant: WebGLUniformLocation;
  pointLightLinear: WebGLUniformLocation;
  pointLightQuadratic: WebGLUniformLocation;

  // Spot light
  spotLightPosition: WebGLUniformLocation;
  spotLightDirection: WebGLUniformLocation;
  spotLightLowerLimit: WebGLUniformLocation;
  spotLightUpperLimit: WebGLUniformLocation;
  spotLightColorAmbient: WebGLUniformLocation;
  spotLightColorDiffuse: WebGLUniformLocation;
  spotLightColorSpecular: WebGLUniformLocation;
  spotLightConstant: WebGLUniformLocation;
  spotLightLinear: WebGLUniformLocation;
  spotLightQuadratic: WebGLUniformLocation;

  // Camera
  cameraPosition: WebGLUniformLocation;

  // Object material
  materialAmbient: WebGLUniformLocation;
  materialDiffuse: WebGLUniformLocation;
  materialSpecular: WebGLUniformLocation;
  materialShininess: WebGLUniformLocation;

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
        directionalLightDirection: gl.getUniformLocation(this.program, 'uDirectionalLight.direction'),
        directionalLightColorAmbient: gl.getUniformLocation(this.program, 'uDirectionalLight.lightColor.ambient'),
        directionalLightColorDiffuse: gl.getUniformLocation(this.program, 'uDirectionalLight.lightColor.diffuse'),
        directionalLightColorSpecular: gl.getUniformLocation(this.program, 'uDirectionalLight.lightColor.specular'),

        pointLightPosition: gl.getUniformLocation(this.program, 'uPointLight.position'),
        pointLightColorAmbient: gl.getUniformLocation(this.program, 'uPointLight.lightColor.ambient'),
        pointLightColorDiffuse: gl.getUniformLocation(this.program, 'uPointLight.lightColor.diffuse'),
        pointLightColorSpecular: gl.getUniformLocation(this.program, 'uPointLight.lightColor.specular'),
        pointLightConstant: gl.getUniformLocation(this.program, 'uPointLight.constant'),
        pointLightLinear: gl.getUniformLocation(this.program, 'uPointLight.linear'),
        pointLightQuadratic: gl.getUniformLocation(this.program, 'uPointLight.quadratic'),

        spotLightPosition: gl.getUniformLocation(this.program, 'uSpotLight.position'),
        spotLightDirection: gl.getUniformLocation(this.program, 'uSpotLight.direction'),
        spotLightColorAmbient: gl.getUniformLocation(this.program, 'uSpotLight.lightColor.ambient'),
        spotLightColorDiffuse: gl.getUniformLocation(this.program, 'uSpotLight.lightColor.diffuse'),
        spotLightColorSpecular: gl.getUniformLocation(this.program, 'uSpotLight.lightColor.specular'),
        spotLightLowerLimit: gl.getUniformLocation(this.program, 'uSpotLight.lowerLimit'),
        spotLightUpperLimit: gl.getUniformLocation(this.program, 'uSpotLight.upperLimit'),
        spotLightConstant: gl.getUniformLocation(this.program, 'uSpotLight.constant'),
        spotLightLinear: gl.getUniformLocation(this.program, 'uSpotLight.linear'),
        spotLightQuadratic: gl.getUniformLocation(this.program, 'uSpotLight.quadratic'),

        cameraPosition: gl.getUniformLocation(this.program, 'uCameraPosition'),

        materialAmbient: gl.getUniformLocation(this.program, 'uMaterial.ambient'),
        materialDiffuse: gl.getUniformLocation(this.program, 'uMaterial.diffuse'),
        materialSpecular: gl.getUniformLocation(this.program, 'uMaterial.specular'),
        materialShininess: gl.getUniformLocation(this.program, 'uMaterial.shininess'),

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

  setDirectionalLight(gl: WebGLRenderingContext, directionalLight: DirectionalLight) {
    gl.uniform3fv(this.standardShaderUniformLocations.directionalLightDirection, directionalLight.direction);
    gl.uniform3fv(this.standardShaderUniformLocations.directionalLightColorAmbient, directionalLight.lightColor.ambient);
    gl.uniform3fv(this.standardShaderUniformLocations.directionalLightColorDiffuse, directionalLight.lightColor.diffuse);
    gl.uniform3fv(this.standardShaderUniformLocations.directionalLightColorSpecular, directionalLight.lightColor.specular);
  }

  setPointLight(gl: WebGLRenderingContext, pointLight: PointLight) {
    gl.uniform3fv(this.standardShaderUniformLocations.pointLightPosition, pointLight.position);
    gl.uniform3fv(this.standardShaderUniformLocations.pointLightColorAmbient, pointLight.lightColor.ambient);
    gl.uniform3fv(this.standardShaderUniformLocations.pointLightColorDiffuse, pointLight.lightColor.diffuse);
    gl.uniform3fv(this.standardShaderUniformLocations.pointLightColorSpecular, pointLight.lightColor.specular);
    gl.uniform1f(this.standardShaderUniformLocations.pointLightConstant, pointLight.constant);
    gl.uniform1f(this.standardShaderUniformLocations.pointLightLinear, pointLight.linear);
    gl.uniform1f(this.standardShaderUniformLocations.pointLightQuadratic, pointLight.quadratic);
  }

  setSpotLight(gl: WebGLRenderingContext, spotLight: SpotLight) {
    gl.uniform3fv(this.standardShaderUniformLocations.spotLightPosition, spotLight.position);
    gl.uniform3fv(this.standardShaderUniformLocations.spotLightDirection, spotLight.direction);
    gl.uniform3fv(this.standardShaderUniformLocations.spotLightColorAmbient, spotLight.lightColor.ambient);
    gl.uniform3fv(this.standardShaderUniformLocations.spotLightColorDiffuse, spotLight.lightColor.diffuse);
    gl.uniform3fv(this.standardShaderUniformLocations.spotLightColorSpecular, spotLight.lightColor.specular);
    gl.uniform1f(this.standardShaderUniformLocations.spotLightUpperLimit, spotLight.upperLimit);
    gl.uniform1f(this.standardShaderUniformLocations.spotLightLowerLimit, spotLight.lowerLimit);
    gl.uniform1f(this.standardShaderUniformLocations.spotLightConstant, spotLight.constant);
    gl.uniform1f(this.standardShaderUniformLocations.spotLightLinear, spotLight.linear);
    gl.uniform1f(this.standardShaderUniformLocations.spotLightQuadratic, spotLight.quadratic);
  }
}