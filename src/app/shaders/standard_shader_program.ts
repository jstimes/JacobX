import { BaseShaderProgram, BaseShaderUniformLocations } from './base_shader_program';
import { Material } from 'src/app/material';
import { LightColor, PointLight, SpotLight, DirectionalLight } from 'src/app/lights/lights';

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  struct LightColor {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
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

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  
  uniform DirectionalLight uDirectionalLight;
  uniform vec3 uCameraPosition;

  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
    vPosition = (uModelMatrix * aVertexPosition).xyz;;
  }
`;

export const MAX_POINT_LIGHTS = 12;
export const MAX_SPOT_LIGHTS = 12;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  struct Material {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    float shininess;
  };

  struct LightColor {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
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

  uniform vec3 uCameraPosition;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec4 uFogColor;

  uniform DirectionalLight uDirectionalLight;

  #define MAX_POINT_LIGHTS ${MAX_POINT_LIGHTS}  
  uniform int uNumPointLights;
  uniform PointLight uPointLights[MAX_POINT_LIGHTS];

  #define MAX_SPOT_LIGHTS ${MAX_SPOT_LIGHTS}  
  uniform int uNumSpotLights;
  uniform SpotLight uSpotLights[MAX_SPOT_LIGHTS];

  uniform Material uMaterial;

  vec4 calculate_directional_light(
      DirectionalLight directionalLight, 
      Material material, 
      vec3 normal, 
      vec3 surfaceToCamera) {
    vec3 surfaceToLight = normalize(-directionalLight.direction);
    vec4 directionalAmbient = directionalLight.lightColor.ambient * material.ambient;

    float directionalDiffuseAmount = max(dot(normal, surfaceToLight), 0.0);
    vec4 directionalDiffuse = directionalDiffuseAmount * directionalLight.lightColor.diffuse * material.diffuse;
    
    vec3 directionalSpecularReflectDir = reflect(-surfaceToLight, normal);
    float directionalSpecularAmount = pow(max(dot(surfaceToCamera, directionalSpecularReflectDir), 0.0), material.shininess);
    vec4 directionalSpecular = directionalSpecularAmount * directionalLight.lightColor.specular * material.specular;

    return directionalAmbient + directionalDiffuse + directionalSpecular;
  }

  vec4 calculate_point_light(
      vec3 worldPosition, 
      vec3 normal, 
      vec3 surfaceToCamera, 
      Material material, 
      PointLight pointLight) {
    vec3 surfaceToPointLight = pointLight.position - worldPosition;
    float distance    = length(surfaceToPointLight);
    surfaceToPointLight = normalize(surfaceToPointLight);
    float diffuse = max(dot(normal, surfaceToPointLight), 0.0);
    vec3 reflectDir = reflect(-surfaceToPointLight, normal);  
    float specular = pow(max(dot(surfaceToCamera, reflectDir), 0.0), material.shininess);
    
    float attenuation = 1.0 / (pointLight.constant + pointLight.linear * distance + 
        pointLight.quadratic * (distance * distance));
    return pointLight.lightColor.ambient * material.ambient * attenuation + 
        diffuse * pointLight.lightColor.diffuse * material.diffuse * attenuation + 
        specular * pointLight.lightColor.specular * material.specular * attenuation;
  }

  vec4 calculate_spot_light(
      vec3 worldPosition, 
      vec3 normal, 
      vec3 surfaceToCamera, 
      Material material, 
      SpotLight spotLight) {
    vec4 ambient = spotLight.lightColor.ambient * material.diffuse;
    
    vec3 surfaceToSpotLight = spotLight.position - worldPosition;
    float distance    = length(surfaceToSpotLight);
    surfaceToSpotLight = normalize(surfaceToSpotLight);
    float diff = max(dot(normal, surfaceToSpotLight), 0.0);
    vec4 diffuse = spotLight.lightColor.diffuse * diff * material.diffuse;
    
    vec3 reflectDir = reflect(-surfaceToSpotLight, normal);  
    float spec = pow(max(dot(surfaceToCamera, reflectDir), 0.0), material.shininess);
    vec4 specular = spotLight.lightColor.specular * spec * material.specular;
    
    float spotLightIntensity = smoothstep(spotLight.upperLimit, spotLight.lowerLimit, dot(surfaceToSpotLight, normalize(-spotLight.direction)));
    ambient *= spotLightIntensity;
    diffuse  *= spotLightIntensity;
    specular *= spotLightIntensity;
    
    // attenuation
    float attenuation = 1.0 / (spotLight.constant + spotLight.linear * distance + spotLight.quadratic * (distance * distance));
    return ambient * attenuation + diffuse * attenuation + specular * attenuation;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 surfaceToCamera = normalize(uCameraPosition - vPosition);

    // Lights
    vec4 color = vec4(0, 0, 0, 0);

    color += calculate_directional_light(uDirectionalLight, uMaterial, normal, surfaceToCamera);

    for(int i= 0; i < MAX_POINT_LIGHTS; i++) {
      if (i>=uNumPointLights) { break; }
      color += calculate_point_light(vPosition, normal, surfaceToCamera, uMaterial, uPointLights[i]);
    }
    
    for(int j= 0; j < MAX_SPOT_LIGHTS; j++) {
      if (j>=uNumSpotLights) { break; }
      color += calculate_spot_light(vPosition, normal, surfaceToCamera, uMaterial, uSpotLights[j]);
    }

    // Fog
    float distance = length(vPosition - uCameraPosition);
    float fogAmount = smoothstep(uFogNear, uFogFar, distance);
    color = mix(color, vec4(uFogColor.xyz, color.w), fogAmount);
    gl_FragColor = color;
  }
`;

interface PointLightLocations {
  readonly position: WebGLUniformLocation;
  readonly lightColorAmbient: WebGLUniformLocation;
  readonly lightColorDiffuse: WebGLUniformLocation;
  readonly lightColorSpecular: WebGLUniformLocation;
  readonly constant: WebGLUniformLocation;
  readonly linear: WebGLUniformLocation;
  readonly quadratic: WebGLUniformLocation;
}

interface SpotLightLocations {
  readonly position: WebGLUniformLocation;
  readonly direction: WebGLUniformLocation;
  readonly lowerLimit: WebGLUniformLocation;
  readonly upperLimit: WebGLUniformLocation;
  readonly lightColorAmbient: WebGLUniformLocation;
  readonly lightColorDiffuse: WebGLUniformLocation;
  readonly lightColorSpecular: WebGLUniformLocation;
  readonly constant: WebGLUniformLocation;
  readonly linear: WebGLUniformLocation;
  readonly quadratic: WebGLUniformLocation;
}

export interface StandardShaderUniformLocations {
  // Directional light
  readonly directionalLightDirection: WebGLUniformLocation;
  readonly directionalLightColorAmbient: WebGLUniformLocation;
  readonly directionalLightColorDiffuse: WebGLUniformLocation;
  readonly directionalLightColorSpecular: WebGLUniformLocation;

  readonly numPointLights: WebGLUniformLocation;
  readonly numSpotLights: WebGLUniformLocation;

  // Camera
  readonly cameraPosition: WebGLUniformLocation;

  // Object material
  readonly materialAmbient: WebGLUniformLocation;
  readonly materialDiffuse: WebGLUniformLocation;
  readonly materialSpecular: WebGLUniformLocation;
  readonly materialShininess: WebGLUniformLocation;

  // Fog
  readonly fogNear: WebGLUniformLocation;
  readonly fogFar: WebGLUniformLocation;
  readonly fogColor: WebGLUniformLocation;
}

export class StandardShaderProgram extends BaseShaderProgram {
  readonly standardShaderUniformLocations: StandardShaderUniformLocations;

  // Point lights
  readonly pointLightLocations: PointLightLocations[] = [];
  readonly spotLightLocations: SpotLightLocations[] = [];

  constructor(gl: WebGLRenderingContext) {
    super(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);

    this.standardShaderUniformLocations = {
      directionalLightDirection: gl.getUniformLocation(this.program, 'uDirectionalLight.direction'),
      directionalLightColorAmbient: gl.getUniformLocation(this.program, 'uDirectionalLight.lightColor.ambient'),
      directionalLightColorDiffuse: gl.getUniformLocation(this.program, 'uDirectionalLight.lightColor.diffuse'),
      directionalLightColorSpecular: gl.getUniformLocation(this.program, 'uDirectionalLight.lightColor.specular'),

      numPointLights: gl.getUniformLocation(this.program, 'uNumPointLights'),
      numSpotLights: gl.getUniformLocation(this.program, 'uNumSpotLights'),

      cameraPosition: gl.getUniformLocation(this.program, 'uCameraPosition'),

      materialAmbient: gl.getUniformLocation(this.program, 'uMaterial.ambient'),
      materialDiffuse: gl.getUniformLocation(this.program, 'uMaterial.diffuse'),
      materialSpecular: gl.getUniformLocation(this.program, 'uMaterial.specular'),
      materialShininess: gl.getUniformLocation(this.program, 'uMaterial.shininess'),

      fogNear: gl.getUniformLocation(this.program, 'uFogNear'),
      fogFar: gl.getUniformLocation(this.program, 'uFogFar'),
      fogColor: gl.getUniformLocation(this.program, 'uFogColor'),
    };

    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const pointLightLocs = {
        position: gl.getUniformLocation(this.program, `uPointLights[${i}].position`),
        lightColorAmbient: gl.getUniformLocation(this.program, `uPointLights[${i}].lightColor.ambient`),
        lightColorDiffuse: gl.getUniformLocation(this.program, `uPointLights[${i}].lightColor.diffuse`),
        lightColorSpecular: gl.getUniformLocation(this.program, `uPointLights[${i}].lightColor.specular`),
        constant: gl.getUniformLocation(this.program, `uPointLights[${i}].constant`),
        linear: gl.getUniformLocation(this.program, `uPointLights[${i}].linear`),
        quadratic: gl.getUniformLocation(this.program, `uPointLights[${i}].quadratic`),
      };
      this.pointLightLocations.push(pointLightLocs);
    }

    for (let i = 0; i < MAX_SPOT_LIGHTS; i++) {
      const spotLightLocs = {
        position: gl.getUniformLocation(this.program, `uSpotLights[${i}].position`),
        direction: gl.getUniformLocation(this.program, `uSpotLights[${i}].direction`),
        lowerLimit: gl.getUniformLocation(this.program, `uSpotLights[${i}].lowerLimit`),
        upperLimit: gl.getUniformLocation(this.program, `uSpotLights[${i}].upperLimit`),
        lightColorAmbient: gl.getUniformLocation(this.program, `uSpotLights[${i}].lightColor.ambient`),
        lightColorDiffuse: gl.getUniformLocation(this.program, `uSpotLights[${i}].lightColor.diffuse`),
        lightColorSpecular: gl.getUniformLocation(this.program, `uSpotLights[${i}].lightColor.specular`),
        constant: gl.getUniformLocation(this.program, `uSpotLights[${i}].constant`),
        linear: gl.getUniformLocation(this.program, `uSpotLights[${i}].linear`),
        quadratic: gl.getUniformLocation(this.program, `uSpotLights[${i}].quadratic`),
      };
      this.spotLightLocations.push(spotLightLocs);
    }
  }

  setMaterialUniform(gl: WebGLRenderingContext, material: Material) {
    gl.uniform4fv(this.standardShaderUniformLocations.materialAmbient, material.ambient);
    gl.uniform4fv(this.standardShaderUniformLocations.materialDiffuse, material.diffuse);
    gl.uniform4fv(this.standardShaderUniformLocations.materialSpecular, material.specular);
    gl.uniform1f(this.standardShaderUniformLocations.materialShininess, material.shininess);
  }

  setDirectionalLight(gl: WebGLRenderingContext, directionalLight: DirectionalLight) {
    gl.uniform3fv(this.standardShaderUniformLocations.directionalLightDirection, directionalLight.direction);
    gl.uniform4fv(this.standardShaderUniformLocations.directionalLightColorAmbient, directionalLight.lightColor.ambient);
    gl.uniform4fv(this.standardShaderUniformLocations.directionalLightColorDiffuse, directionalLight.lightColor.diffuse);
    gl.uniform4fv(this.standardShaderUniformLocations.directionalLightColorSpecular, directionalLight.lightColor.specular);
  }

  setPointLights(gl: WebGLRenderingContext, pointLights: PointLight[]) {
    const numPointLights = pointLights.length;
    gl.uniform1i(this.standardShaderUniformLocations.numPointLights, numPointLights);
    for (let index = 0; index < numPointLights; index++) {
      const pointLight = pointLights[index];
      gl.uniform3fv(this.pointLightLocations[index].position, pointLight.position);
      gl.uniform4fv(this.pointLightLocations[index].lightColorAmbient, pointLight.lightColor.ambient);
      gl.uniform4fv(this.pointLightLocations[index].lightColorDiffuse, pointLight.lightColor.diffuse);
      gl.uniform4fv(this.pointLightLocations[index].lightColorSpecular, pointLight.lightColor.specular);
      gl.uniform1f(this.pointLightLocations[index].constant, pointLight.constant);
      gl.uniform1f(this.pointLightLocations[index].linear, pointLight.linear);
      gl.uniform1f(this.pointLightLocations[index].quadratic, pointLight.quadratic);
    }
  }

  setSpotLights(gl: WebGLRenderingContext, spotLights: SpotLight[]) {
    const numSpotLights = spotLights.length;
    gl.uniform1i(this.standardShaderUniformLocations.numSpotLights, numSpotLights);
    for (let index = 0; index < numSpotLights; index++) {
      const spotLight = spotLights[index];
      gl.uniform3fv(this.spotLightLocations[index].position, spotLight.position);
      gl.uniform3fv(this.spotLightLocations[index].direction, spotLight.direction);
      gl.uniform1f(this.spotLightLocations[index].upperLimit, spotLight.upperLimit);
      gl.uniform1f(this.spotLightLocations[index].lowerLimit, spotLight.lowerLimit);
      gl.uniform4fv(this.spotLightLocations[index].lightColorAmbient, spotLight.lightColor.ambient);
      gl.uniform4fv(this.spotLightLocations[index].lightColorDiffuse, spotLight.lightColor.diffuse);
      gl.uniform4fv(this.spotLightLocations[index].lightColorSpecular, spotLight.lightColor.specular);
      gl.uniform1f(this.spotLightLocations[index].constant, spotLight.constant);
      gl.uniform1f(this.spotLightLocations[index].linear, spotLight.linear);
      gl.uniform1f(this.spotLightLocations[index].quadratic, spotLight.quadratic);
    }
  }
}