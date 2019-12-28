import { StandardShaderProgram } from "src/app/shaders/standard_shader_program";
import { LightShaderProgram } from 'src/app/shaders/light_shader_program';


class Shaders {
    standard: StandardShaderProgram;
    light: LightShaderProgram;

    init(gl: WebGLRenderingContext) {
        this.standard = new StandardShaderProgram(gl);
        this.light = new LightShaderProgram(gl);
    }
}

export const SHADERS = new Shaders();