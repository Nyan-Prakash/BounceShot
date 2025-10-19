export type Vec2 = {
  x: number;
  y: number;
};

export type MotionConfig = {
  axis: 'x' | 'y';
  amplitude: number;
  speed: number;
  phase?: number;
};

export type BaseBumper = {
  id: string;
  color: string;
  position: Vec2;
  width: number;
  height: number;
  rotation?: number;
  motion?: MotionConfig;
};

export type RectBumper = BaseBumper & {
  type: 'rect';
};

export type TriangleOrientation = 'up' | 'down' | 'left' | 'right';

export type TriangleBumper = BaseBumper & {
  type: 'triangle';
  orientation: TriangleOrientation;
};

export type Bumper = RectBumper | TriangleBumper;

export type TargetConfig = {
  position: Vec2;
  size: number;
  color: string;
};

export type LevelConfig = {
  id: string;
  name: string;
  backgroundColor: string;
  bounceLimit: number;
  ballStart: Vec2;
  target: TargetConfig;
  bumpers: Bumper[];
};

export type GameStatus = 'aim' | 'playing' | 'win' | 'fail';
