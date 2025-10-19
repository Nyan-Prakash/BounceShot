import { Bumper, LevelConfig, TriangleBumper, Vec2 } from './types';

export const WORLD_WIDTH = 360;
export const WORLD_HEIGHT = 640;

const BALL_RADIUS = 14;
const TARGET_SIZE = 32;

export const getBallRadius = () => BALL_RADIUS;
export const getTargetSize = () => TARGET_SIZE;

const baseTarget = (position: Vec2, color: string) => ({
  position,
  size: TARGET_SIZE,
  color,
});

const rect = (config: Omit<Bumper, 'type'>): Bumper => ({
  type: 'rect',
  ...config,
});

const tri = (config: Omit<TriangleBumper, 'type'>): TriangleBumper => ({
  type: 'triangle',
  ...config,
});

export const LEVELS: LevelConfig[] = [
  {
    id: 'level-1',
    name: 'Level 1',
    backgroundColor: '#0E6BA8',
    bounceLimit: 5,
    ballStart: { x: 80, y: WORLD_HEIGHT - 120 },
    target: baseTarget({ x: WORLD_WIDTH - 80, y: 120 }, '#F9F7F3'),
    bumpers: [
      rect({
        id: 'l1-b1',
        color: '#F4A261',
        position: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 + 20 },
        width: 120,
        height: 24,
        rotation: -12,
      }),
      rect({
        id: 'l1-b2',
        color: '#2A9D8F',
        position: { x: WORLD_WIDTH / 2 - 90, y: WORLD_HEIGHT / 2 + 140 },
        width: 80,
        height: 20,
        rotation: 8,
      }),
      tri({
        id: 'l1-b3',
        color: '#E76F51',
        position: { x: WORLD_WIDTH - 110, y: WORLD_HEIGHT / 2 + 70 },
        width: 90,
        height: 90,
        orientation: 'left',
      }),
    ],
  },
  {
    id: 'level-2',
    name: 'Level 2',
    backgroundColor: '#3D405B',
    bounceLimit: 4,
    ballStart: { x: 70, y: WORLD_HEIGHT - 110 },
    target: baseTarget({ x: WORLD_WIDTH - 70, y: 140 }, '#F2CC8F'),
    bumpers: [
      rect({
        id: 'l2-b1',
        color: '#F4F1DE',
        position: { x: WORLD_WIDTH * 0.35, y: WORLD_HEIGHT * 0.45 },
        width: 140,
        height: 22,
        rotation: 18,
      }),
      tri({
        id: 'l2-b2',
        color: '#81B29A',
        position: { x: WORLD_WIDTH * 0.6, y: WORLD_HEIGHT * 0.62 },
        width: 110,
        height: 110,
        orientation: 'down',
        rotation: 10,
      }),
      rect({
        id: 'l2-b3',
        color: '#E07A5F',
        position: { x: WORLD_WIDTH * 0.75, y: WORLD_HEIGHT * 0.4 },
        width: 70,
        height: 18,
        rotation: -22,
      }),
    ],
  },
  {
    id: 'level-3',
    name: 'Level 3',
    backgroundColor: '#1B9AAA',
    bounceLimit: 4,
    ballStart: { x: 90, y: WORLD_HEIGHT - 140 },
    target: baseTarget({ x: WORLD_WIDTH - 65, y: 120 }, '#E9D758'),
    bumpers: [
      rect({
        id: 'l3-b1',
        color: '#F5B700',
        position: { x: WORLD_WIDTH * 0.45, y: WORLD_HEIGHT * 0.56 },
        width: 120,
        height: 20,
        rotation: -30,
      }),
      rect({
        id: 'l3-b2',
        color: '#F18F01',
        position: { x: WORLD_WIDTH * 0.58, y: WORLD_HEIGHT * 0.32 },
        width: 110,
        height: 18,
        rotation: 24,
      }),
      tri({
        id: 'l3-b3',
        color: '#C73E1D',
        position: { x: WORLD_WIDTH * 0.8, y: WORLD_HEIGHT * 0.6 },
        width: 100,
        height: 100,
        orientation: 'left',
      }),
      tri({
        id: 'l3-b4',
        color: '#F5B700',
        position: { x: WORLD_WIDTH * 0.25, y: WORLD_HEIGHT * 0.65 },
        width: 90,
        height: 90,
        orientation: 'up',
      }),
    ],
  },
  {
    id: 'level-4',
    name: 'Level 4',
    backgroundColor: '#22577A',
    bounceLimit: 3,
    ballStart: { x: 70, y: WORLD_HEIGHT - 130 },
    target: baseTarget({ x: WORLD_WIDTH - 60, y: 110 }, '#F6F5F5'),
    bumpers: [
      rect({
        id: 'l4-b1',
        color: '#38A3A5',
        position: { x: WORLD_WIDTH * 0.45, y: WORLD_HEIGHT * 0.5 },
        width: 130,
        height: 24,
        rotation: -18,
      }),
      rect({
        id: 'l4-b2',
        color: '#57CC99',
        position: { x: WORLD_WIDTH * 0.3, y: WORLD_HEIGHT * 0.62 },
        width: 90,
        height: 20,
        rotation: 16,
        motion: {
          axis: 'x',
          amplitude: 30,
          speed: 1.6,
          phase: Math.PI / 4,
        },
      }),
      tri({
        id: 'l4-b3',
        color: '#80ED99',
        position: { x: WORLD_WIDTH * 0.7, y: WORLD_HEIGHT * 0.45 },
        width: 110,
        height: 110,
        orientation: 'down',
      }),
      tri({
        id: 'l4-b4',
        color: '#C7F9CC',
        position: { x: WORLD_WIDTH * 0.82, y: WORLD_HEIGHT * 0.62 },
        width: 95,
        height: 95,
        orientation: 'left',
        motion: {
          axis: 'y',
          amplitude: 40,
          speed: 1.2,
        },
      }),
    ],
  },
  {
    id: 'level-5',
    name: 'Level 5',
    backgroundColor: '#2E294E',
    bounceLimit: 3,
    ballStart: { x: 85, y: WORLD_HEIGHT - 150 },
    target: baseTarget({ x: WORLD_WIDTH - 70, y: 100 }, '#F1E4E8'),
    bumpers: [
      rect({
        id: 'l5-b1',
        color: '#541388',
        position: { x: WORLD_WIDTH * 0.42, y: WORLD_HEIGHT * 0.58 },
        width: 140,
        height: 24,
        rotation: -22,
        motion: {
          axis: 'x',
          amplitude: 28,
          speed: 1.9,
        },
      }),
      rect({
        id: 'l5-b2',
        color: '#FFD400',
        position: { x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.35 },
        width: 150,
        height: 20,
        rotation: 28,
      }),
      tri({
        id: 'l5-b3',
        color: '#D90368',
        position: { x: WORLD_WIDTH * 0.78, y: WORLD_HEIGHT * 0.52 },
        width: 120,
        height: 120,
        orientation: 'left',
        rotation: -6,
      }),
      tri({
        id: 'l5-b4',
        color: '#F5A623',
        position: { x: WORLD_WIDTH * 0.26, y: WORLD_HEIGHT * 0.48 },
        width: 95,
        height: 95,
        orientation: 'up',
        motion: {
          axis: 'y',
          amplitude: 35,
          speed: 1.3,
          phase: Math.PI / 3,
        },
      }),
      rect({
        id: 'l5-b5',
        color: '#17BEBB',
        position: { x: WORLD_WIDTH * 0.68, y: WORLD_HEIGHT * 0.7 },
        width: 80,
        height: 18,
        rotation: 10,
      }),
    ],
  },
];

export type LevelIndexState = {
  index: number;
};
