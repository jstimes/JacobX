import {vec3, mat4} from 'src/app/gl-matrix.js';
import {makeVec} from 'src/app/math_utils';


export class Camera {
    cameraPosition: vec3;
    target: vec3;
    up = makeVec(0, 1, 0);

    constructor() {
        this.cameraPosition = makeVec(0, 0, 0);
        this.target = makeVec(0, 0, -30);
    }

    getViewMatrix(): mat4 {
        const view = mat4.create();
        mat4.lookAt(view, this.cameraPosition, this.target, this.up);
        return view;
    }

    ORBIT_ANGLE = Math.PI / 12;
    orbitRight() {
       vec3.rotateY(
           this.cameraPosition, 
           this.cameraPosition, 
           this.target, 
           this.ORBIT_ANGLE);
    }

    orbitLeft() {
        vec3.rotateY(
            this.cameraPosition, 
            this.cameraPosition, 
            this.target, 
            -this.ORBIT_ANGLE);
    }

    moveUp() {
        this.cameraPosition[1] += 1;
    }

    moveDown() {
        this.cameraPosition[1] -= 1;
    }

    zoomIn() {
        this.cameraPosition[2] -= 1;
    }

    zoomOut() {
        this.cameraPosition[2] += 1;
    }
}