import { degToRad } from "./helpers";

// export const ARROW_START_X = 200;
// export const ARROW_START_Y = 620;
// export const ARROW_RADIUS = 20;
// export const ARROW_DIAMETER = 70;
// export const ARROW_WIDTH = 140;
// export const ARROW_HEIGHT = 40;
export const BALL_SPEED = 3;
export const BALL_START_Y = 0;
export const BALL_RADIUS = 50;
export const BALL_DIAMETER = 20;
export const BALL_WIDTH = 100;
export const BALL_HEIGHT = 40;
export const SPARK_START_Y = -999;
export const SPARK_START_X = -999;
export const CLOUD_SPEED_RANGE = [20, 100]; // px/s
export const CANNON_SCALE = 0.5;
export const CANNON_ROTATE_ANGLE_LIMIT = degToRad(50); // deg
export const PROJECTILE_SCALE = CANNON_SCALE;
export const PROJECTILE_SPEED = 800; // px/s
export const PROJECTILE_ROTATE_SPEED = degToRad(720); // deg/s
