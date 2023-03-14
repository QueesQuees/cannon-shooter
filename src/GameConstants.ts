import { degToRad } from "./helpers";

export const BALL_SIZE = 200; // px
export const BALL_SPEED_RANGE = [200, 500]; // px/s
export const BALL_START_X_INIT_RANGE = [1000, 3000]; // px
export const BALL_START_X_RANGE = [5000, 10000]; // px
export const BALL_START_Y = 100; // px
export const BALL_ROW = 4; // row
export const BALL_ROW_GAP = 50; // px

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
export const FIRE_SPARK_FADE_TIME = 0.15; // s
export const FIRE_SPARK_FADE_ANIMATION_KEYFRAMES = [
  { alpha: 1, offset: 0, scale: 1 },
  { alpha: 0, offset: -20, scale: 1.3 },
];
