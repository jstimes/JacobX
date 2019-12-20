import { Component } from '@angular/core';
import * as glm from './gl-matrix.js'

interface AttribLocations {
  vertexPosition: number;
  vertexNormal: number;
  textureCoord: number;
}
interface UniformLocations {
  projectionMatrix: WebGLUniformLocation;
  modelViewMatrix: WebGLUniformLocation;
  normalMatrix: WebGLUniformLocation;
  uSampler: WebGLUniformLocation;
}
interface Program {
  program: WebGLProgram;
  attribLocations: AttribLocations;
  uniformLocations: UniformLocations;
}

interface Buffers {
  position: WebGLBuffer;
  normal: WebGLBuffer;
  textureCoord: WebGLBuffer;
  indices: WebGLBuffer;
}

interface Shape {
  translation: number[];
  velocity: number[];
  rotation: number;
  rotationSpeed: number;
  rotationAxis: number[];
}

interface Point {
  x: number;
  y: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const SQUARE_RADIUS = 1.0;
const X_BOUNDS = 5.6;
const Y_BOUNDS = 4.0;
const Z_MIN = -18.0;
const Z_MAX = -12.0;
const SHAPE_Z = -12.0;

const VERTEX_SHADER_SOURCE = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;
  attribute vec2 aTextureCoord;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec2 vTextureCoord;
  varying highp vec3 vLighting;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;

    // Apply lighting effect
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  varying highp vec2 vTextureCoord;
  varying highp vec3 vLighting;

  uniform sampler2D uSampler;

  void main() {
    highp vec4 texelColor = texture2D(uSampler, vTextureCoord);

    gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
  }
`;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'JacobX';
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: Program;
  buffers: Buffers;

  texture: WebGLTexture;

  private shapes: Shape[] = [];
  private isShapeActive = false;
  private lastTime: number;

  ngOnInit() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas = canvas;
    canvas.setAttribute('width', `${CANVAS_WIDTH}`);
    canvas.setAttribute('height', `${CANVAS_HEIGHT}`);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    
    const gl = canvas.getContext('webgl');
    this.gl = gl;
  
    // Only continue if WebGL is available and working
    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  
    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    const textureUrl = '/assets/images/1.jpg';
    this.texture = this.loadTexture(this.gl, textureUrl);

    const shaderProgram = this.initShaderProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      },
    };
    this.buffers = this.initBuffers(gl);
    this.gameLoop(0);
  }

  gameLoop(now: number) {
    const elapsedMs = now - this.lastTime;
    this.lastTime = now;
    this.update(elapsedMs);
    this.render(this.gl, this.program, this.buffers);

    window.requestAnimationFrame((elapsedTime: number) => {
      this.gameLoop(elapsedTime);
    });
  }
  
  update(elapsedMs: number) {
    const stop = this.isShapeActive ? this.shapes.length - 1 : this.shapes.length;
    for (let i=0; i<stop; i++) {
      const shape: Shape = this.shapes[i];
      if (shape.translation[0] < -X_BOUNDS || shape.translation[0] > X_BOUNDS) {
        shape.velocity[0] = -shape.velocity[0];
      }
      if (shape.translation[1] < -Y_BOUNDS || shape.translation[1] > Y_BOUNDS) {
        shape.velocity[1] = -shape.velocity[1];
      }
      if (shape.translation[2] < -Z_MIN || shape.translation[2] > Z_MAX) {
        shape.velocity[2] = -shape.velocity[2];
      }
      shape.translation[0] += shape.velocity[0];
      shape.translation[1] += shape.velocity[1];
      shape.translation[2] += shape.velocity[2];

      shape.rotation += elapsedMs / 1000 * shape.rotationSpeed;
    }
  }

  render(gl: WebGLRenderingContext, programInfo: Program, buffers: Buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
  
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
  
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = glm.mat4.create();
  
    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    glm.mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);
  
    for (let i=0; i<this.shapes.length; i++) {
      // Set the drawing position to the "identity" point, which is
      // the center of the scene.
      const modelViewMatrix = glm.mat4.create();
      // Now move the drawing position a bit to where we want to
      // start drawing the square.
      glm.mat4.translate(modelViewMatrix,     // destination matrix
                    modelViewMatrix,     // matrix to translate
                    this.shapes[i].translation);  // amount to translate

      // glm.mat4.rotate(modelViewMatrix,  // destination matrix
      //                 modelViewMatrix,  // matrix to rotate
      //                 this.shapes[i].rotation,   // amount to rotate in radians
      //               [0, 0, 1]);       // axis to rotate around

      glm.mat4.rotate(modelViewMatrix, modelViewMatrix, this.shapes[i].rotation, this.shapes[i].rotationAxis);
    

      const normalMatrix = glm.mat4.create();
      glm.mat4.invert(normalMatrix, modelViewMatrix);
      glm.mat4.transpose(normalMatrix, normalMatrix);

      // Tell WebGL how to pull out the positions from the position
      // buffer into the vertexPosition attribute.
      {
        const numComponents = 3;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
                                  // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
      }

      // Tell WebGL how to pull out the normals from
      // the normal buffer into the vertexNormal attribute.
      {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexNormal);
      }

      // tell webgl how to pull out the texture coordinates from buffer
      {
          const num = 2; // every coordinate composed of 2 values
          const type = gl.FLOAT; // the data in the buffer is 32 bit float
          const normalize = false; // don't normalize
          const stride = 0; // how many bytes to get from one set to the next
          const offset = 0; // how many bytes inside the buffer to start from
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
          gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, num, type, normalize, stride, offset);
          gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
      }

      // Tell WebGL which indices to use to index the vertices
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

      // Tell WebGL we want to affect texture unit 0
      gl.activeTexture(gl.TEXTURE0);

      // Bind the texture to texture unit 0
      gl.bindTexture(gl.TEXTURE_2D, this.texture);

      // Tell the shader we bound the texture to texture unit 0
      gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    
      // Tell WebGL to use our program when drawing
      gl.useProgram(programInfo.program);
    
      // Set the shader uniforms
      gl.uniformMatrix4fv(
          programInfo.uniformLocations.projectionMatrix,
          false,
          projectionMatrix);
      gl.uniformMatrix4fv(
          programInfo.uniformLocations.modelViewMatrix,
          false,
          modelViewMatrix);
      gl.uniformMatrix4fv(
          programInfo.uniformLocations.normalMatrix,
          false,
          normalMatrix);
    
      {
        const vertexCount = 36;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
      }
    }
  }

  private onMouseDown = (e: MouseEvent) => {
    if (this.isShapeActive) {
      return;
    }
    const glCoords = getGlCoords(e);
    this.isShapeActive = true;
    this.shapes.push({
      velocity: getRandomVelocity(),
      translation: [glCoords.x, glCoords.y, SHAPE_Z],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 1.0,
      rotationAxis: getRandomRotationAxis(),
    });
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isShapeActive) {
      return;
    }
    const activeShape = this.shapes[this.shapes.length - 1];
    const glCoords = getGlCoords(e);
    activeShape.translation = [glCoords.x, glCoords.y, SHAPE_Z];
  }

  private onMouseUp = (e: MouseEvent) => {
    if (!this.isShapeActive) {
      return;
    }

    // Check for overlap with existing shape - if so, defeat.
    const activeShape = this.shapes[this.shapes.length - 1];
    for (let i=0; i<this.shapes.length - 1; i++) {
      // if (shapesOverlap(activeShape, this.shapes[i])) {
      //   alert("You lost");
      //   activeShape.velocity = [0, 0, 0];
      //   this.shapes[i].velocity = [0, 0, 0];
      //   this.shapes[i].rotationSpeed = 0.0;
      //   activeShape.rotationSpeed = 0.0;
      //   this.canvas.removeEventListener('mousedown', this.onMouseDown);
      //   this.canvas.removeEventListener('mousemove', this.onMouseMove);
      //   this.canvas.removeEventListener('mouseup', this.onMouseUp);
      //   return;
      // }
    }
    document.getElementById('score').innerHTML = `Score ${this.shapes.length}`;

    this.isShapeActive = false;
  }

  private initBuffers(gl: WebGLRenderingContext): Buffers {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();
  
    // Select the positionBuffer as the one to apply buffer
    // operations to from here out
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // Now create an array of positions for the square.
    // const positions = [
    //   -SQUARE_RADIUS,  SQUARE_RADIUS,
    //   SQUARE_RADIUS,  SQUARE_RADIUS,
    //   -SQUARE_RADIUS, -SQUARE_RADIUS,
    //   SQUARE_RADIUS, -SQUARE_RADIUS,
    // ];
    const positions = [
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,
      
      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,
      
      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,
      
      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,
      
      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,
      
      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
    ];
  
    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(positions),
                  gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  
    const vertexNormals = [
      // Front
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
  
      // Back
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
  
      // Top
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
  
      // Bottom
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
  
      // Right
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
  
      // Left
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0
    ];
  
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals),
                  gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  
    const textureCoordinates = [
      // Front
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
      // Back
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
      // Top
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
      // Bottom
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
      // Right
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
      // Left
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
    ];
  
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                  gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.
    const indices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23,   // left
    ];

    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices), gl.STATIC_DRAW);
  
    return {
      position: positionBuffer,
      normal: normalBuffer,
      textureCoord: textureCoordBuffer,
      indices: indexBuffer,
    };
  }

  /** Initialize a shader program, so WebGL knows how to draw our data. */
  private initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram {
    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }
    return shaderProgram;
  }
  
  /** Creates a shader of the given type, uploads the source and compiles it. */
  private loadShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader: WebGLShader = gl.createShader(type);
    // Send the source to the shader object
    gl.shaderSource(shader, source);
    // Compile the shader program
    gl.compileShader(shader);
  
    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
  
    return shader;
  }

  /**
   * Initialize a texture and load an image.
   * When the image finished loading copy it into the texture.
   */
  private loadTexture(gl: WebGLRenderingContext, url: string): WebGLTexture {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    srcFormat, srcType, image);

      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // Prevents s-coordinate wrapping (repeating).
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // Prevents t-coordinate wrapping (repeating).
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
    };

    image.src = url;

    return texture;
  }
}

function shapesOverlap(shapeA: Shape, shapeB: Shape): boolean {
  return Math.abs(shapeA.translation[0] - shapeB.translation[0]) < SQUARE_RADIUS * 2
      && Math.abs(shapeA.translation[1] - shapeB.translation[1]) < SQUARE_RADIUS * 2;
}

function getGlCoords(e: MouseEvent): Point {
  const x = e.clientX;
  const y = CANVAS_HEIGHT - e.clientY;
  const glX = x * ((X_BOUNDS * 2) / CANVAS_WIDTH) - X_BOUNDS;
  const glY = y * ((Y_BOUNDS * 2) / CANVAS_HEIGHT) - Y_BOUNDS;
  return {x: glX, y: glY};
}

function getRandomVelocity(): number[] {
  const theta = Math.random() * 2 * Math.PI;
  const xVel = Math.cos(theta) * .05
  const yVel = Math.sin(theta) * .05;
  const zVel = Math.cos(Math.random() * 2 * Math.PI);
  return [xVel, yVel, 0.0];
}

function getRandomRotationAxis(): number[] {
  const num = Math.random() * 2 * Math.PI;
  const sin = Math.sin(num);
  return [Math.cos(num), num < Math.PI ? sin : 0.0, num >= Math.PI ? sin : 0.0];
}

function isPowerOf2(value: number): boolean {
  return (value & (value - 1)) == 0;
}