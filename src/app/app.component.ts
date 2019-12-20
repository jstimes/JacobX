import { Component } from '@angular/core';
import * as glm from './gl-matrix.js'

interface AttribLocations {
  vertexPosition: number;
}
interface UniformLocations {
  projectionMatrix: WebGLUniformLocation;
  modelViewMatrix: WebGLUniformLocation;
}
interface Program {
  program: WebGLProgram;
  attribLocations: AttribLocations;
  uniformLocations: UniformLocations;
}

interface Buffers {
  position: WebGLBuffer;
}

interface Shape {
  translation: number[];
  velocity: number[];
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const vsSource = `
  attribute vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
`;

const fsSource = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'JacobX';
  gl: WebGLRenderingContext;
  program: Program;
  buffers: Buffers;

  ngOnInit() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    canvas.setAttribute('width', `${CANVAS_WIDTH}`);
    canvas.setAttribute('height', `${CANVAS_HEIGHT}`);
    canvas.onclick = this.onClick;
    
    const gl = canvas.getContext("webgl");
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

    const shaderProgram = this.initShaderProgram(gl, vsSource, fsSource);
    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      },
    };
    this.buffers = this.initBuffers(gl);

    this.initShapes(6);
    this.gameLoop(0);
  }

  lastTime: number;
  gameLoop(elapsedTime: number) {
    this.update(elapsedTime);
    this.render(this.gl, this.program, this.buffers);

    window.requestAnimationFrame((elapsedTime: number) => {
      this.gameLoop(elapsedTime);
    });
  }

  onClick = (e: MouseEvent) => {
    console.log('clickity lickity');
    const x = e.clientX;
    const y = CANVAS_HEIGHT - e.clientY;
    console.log(x);
    console.log(y);
    const glX = x * ((this.X_BOUNDS * 2) / CANVAS_WIDTH) - this.X_BOUNDS;
    const glY = y * ((this.Y_BOUNDS * 2) / CANVAS_HEIGHT) - this.Y_BOUNDS;
    console.log('shape coords: ' + glX + ', ' + glY);
    this.shapes.push({
      velocity: this.getRandomVelocity(),
      translation: [glX, glY, this.shapeZ],
    })
  };

  shapeZ = -12.0;
  shapes: Shape[] = [];
  INITIAL_VELOCITY = [.01, .01, 0.0];
  initShapes(total: number) {
    for (let i=0; i<total; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const xVel = Math.cos(theta) * .05
      const yVel = Math.sin(theta) * .05;
      this.shapes.push({
        translation: [
          (Math.random() * (this.X_BOUNDS * 2)) - this.X_BOUNDS, 
          (Math.random() * (this.Y_BOUNDS * 2)) - this.Y_BOUNDS, 
          this.shapeZ,
        ],
        velocity: this.getRandomVelocity(),
      });
    }
  }

  private getRandomVelocity(): number[] {
    const theta = Math.random() * 2 * Math.PI;
    const xVel = Math.cos(theta) * .05
    const yVel = Math.sin(theta) * .05;
    return [xVel, yVel, 0.0];
  }

  readonly X_BOUNDS = 5.6;
  readonly Y_BOUNDS = 4.0;
  readonly Z_BOUNDS = 5.0;
  update(elapsedTime: number) {
    for (let i=0; i<this.shapes.length; i++) {
      const shape: Shape = this.shapes[i];
      if (shape.translation[0] < -this.X_BOUNDS || shape.translation[0] > this.X_BOUNDS) {
        shape.velocity[0] = -shape.velocity[0];
      }
      if (shape.translation[1] < -this.Y_BOUNDS || shape.translation[1] > this.Y_BOUNDS) {
        shape.velocity[1] = -shape.velocity[1];
      }
      if (shape.translation[2] < -this.Z_BOUNDS || shape.translation[2] > this.Z_BOUNDS) {
        shape.velocity[2] = -shape.velocity[2];
      }
      shape.translation[0] += shape.velocity[0];
      shape.translation[1] += shape.velocity[1];
      shape.translation[2] += shape.velocity[2];
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
    
      // Tell WebGL how to pull out the positions from the position
      // buffer into the vertexPosition attribute.
      {
        const numComponents = 2;  // pull out 2 values per iteration
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
    
      {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
      }
    }
  }

  private initBuffers(gl: WebGLRenderingContext): Buffers {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();
  
    // Select the positionBuffer as the one to apply buffer
    // operations to from here out
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // Now create an array of positions for the square.
    const positions = [
      -1.0,  1.0,
       1.0,  1.0,
      -1.0, -1.0,
       1.0, -1.0,
    ];
  
    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(positions),
                  gl.STATIC_DRAW);
  
    return {
      position: positionBuffer,
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
}
