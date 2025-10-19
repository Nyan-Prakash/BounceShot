import { Bumper, LevelConfig, TriangleBumper, Vec2 } from './types';

export type ResolvedBumper = {
  id: string;
  color: string;
  center: Vec2;
  width: number;
  height: number;
  rotation: number;
  vertices: Vec2[];
  type: Bumper['type'];
};

export type CollisionEvent = {
  id: string;
  kind: 'wall' | 'bumper';
  normal: Vec2;
  point: Vec2;
};

export type BallState = {
  position: Vec2;
  velocity: Vec2;
};

export type StepSettings = {
  ballRadius: number;
  worldWidth: number;
  worldHeight: number;
  damping: number;
  friction: number;
  maxSpeed: number;
};

type Edge = {
  from: Vec2;
  to: Vec2;
  normal: Vec2;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const length = (a: Vec2) => Math.sqrt(a.x * a.x + a.y * a.y);

const normalize = (a: Vec2): Vec2 => {
  const len = length(a);
  if (len === 0) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const rotatePoint = (point: Vec2, radians: number): Vec2 => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

const applyMotion = (position: Vec2, bumper: Bumper, time: number): Vec2 => {
  if (!bumper.motion) {
    return position;
  }
  const { axis, amplitude, speed, phase = 0 } = bumper.motion;
  const offset = amplitude * Math.sin(time * speed + phase);
  return axis === 'x'
    ? { x: position.x + offset, y: position.y }
    : { x: position.x, y: position.y + offset };
};

const rectVertices = (bumper: Bumper): Vec2[] => {
  const halfW = bumper.width / 2;
  const halfH = bumper.height / 2;
  return [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
};

const triangleVertices = (bumper: TriangleBumper): Vec2[] => {
  const halfW = bumper.width / 2;
  const halfH = bumper.height / 2;
  switch (bumper.orientation) {
    case 'up':
      return [
        { x: 0, y: -halfH },
        { x: halfW, y: halfH },
        { x: -halfW, y: halfH },
      ];
    case 'down':
      return [
        { x: 0, y: halfH },
        { x: -halfW, y: -halfH },
        { x: halfW, y: -halfH },
      ];
    case 'left':
      return [
        { x: -halfW, y: 0 },
        { x: halfW, y: -halfH },
        { x: halfW, y: halfH },
      ];
    case 'right':
    default:
      return [
        { x: halfW, y: 0 },
        { x: -halfW, y: -halfH },
        { x: -halfW, y: halfH },
      ];
  }
};

const buildEdges = (vertices: Vec2[]): Edge[] => {
  const edges: Edge[] = [];
  for (let i = 0; i < vertices.length; i += 1) {
    const from = vertices[i];
    const to = vertices[(i + 1) % vertices.length];
    const edgeDir = sub(to, from);
    const normal = normalize({ x: edgeDir.y, y: -edgeDir.x });
    edges.push({ from, to, normal });
  }
  return edges;
};

export const resolveBumper = (
  bumper: Bumper,
  time: number,
): ResolvedBumper => {
  const rotation = bumper.rotation ?? 0;
  const baseVerts =
    bumper.type === 'rect'
      ? rectVertices(bumper)
      : triangleVertices(bumper as TriangleBumper);

  const rotated = rotation
    ? baseVerts.map((point) => rotatePoint(point, toRadians(rotation)))
    : baseVerts;

  const center = applyMotion(bumper.position, bumper, time);

  const vertices = rotated.map((point) => add(point, center));

  return {
    id: bumper.id,
    color: bumper.color,
    center,
    width: bumper.width,
    height: bumper.height,
    rotation,
    vertices,
    type: bumper.type,
  };
};

export const resolveBumpers = (
  level: LevelConfig,
  time: number,
): ResolvedBumper[] => level.bumpers.map((bumper) => resolveBumper(bumper, time));

const closestPointOnSegment = (point: Vec2, edge: Edge) => {
  const seg = sub(edge.to, edge.from);
  const segLenSq = Math.max(dot(seg, seg), 0.0001);
  const t = clamp(dot(sub(point, edge.from), seg) / segLenSq, 0, 1);
  return add(edge.from, scale(seg, t));
};

const reflectVelocity = (velocity: Vec2, normal: Vec2) => {
  const dotProduct = dot(velocity, normal);
  return sub(velocity, scale(normal, 2 * dotProduct));
};

type CollisionAccumulator = {
  events: CollisionEvent[];
  ids: Set<string>;
};

const appendCollision = (
  accumulator: CollisionAccumulator,
  event: CollisionEvent,
) => {
  if (accumulator.ids.has(event.id)) {
    return;
  }
  accumulator.events.push(event);
  accumulator.ids.add(event.id);
};

const resolveWallCollisions = (
  state: BallState,
  settings: StepSettings,
  accumulator: CollisionAccumulator,
) => {
  const { ballRadius, worldWidth, worldHeight, damping } = settings;
  const { position, velocity } = state;

  if (position.x - ballRadius < 0 && velocity.x < 0) {
    state.position.x = ballRadius;
    state.velocity.x = Math.abs(state.velocity.x) * damping;
    appendCollision(accumulator, {
      id: 'wall-left',
      kind: 'wall',
      normal: { x: 1, y: 0 },
      point: { x: 0, y: position.y },
    });
  } else if (position.x + ballRadius > worldWidth && velocity.x > 0) {
    state.position.x = worldWidth - ballRadius;
    state.velocity.x = -Math.abs(state.velocity.x) * damping;
    appendCollision(accumulator, {
      id: 'wall-right',
      kind: 'wall',
      normal: { x: -1, y: 0 },
      point: { x: worldWidth, y: position.y },
    });
  }

  if (position.y - ballRadius < 0 && velocity.y < 0) {
    state.position.y = ballRadius;
    state.velocity.y = Math.abs(state.velocity.y) * damping;
    appendCollision(accumulator, {
      id: 'wall-top',
      kind: 'wall',
      normal: { x: 0, y: 1 },
      point: { x: position.x, y: 0 },
    });
  } else if (position.y + ballRadius > worldHeight && velocity.y > 0) {
    state.position.y = worldHeight - ballRadius;
    state.velocity.y = -Math.abs(state.velocity.y) * damping;
    appendCollision(accumulator, {
      id: 'wall-bottom',
      kind: 'wall',
      normal: { x: 0, y: -1 },
      point: { x: position.x, y: worldHeight },
    });
  }
};

const resolveBumperCollision = (
  bumper: ResolvedBumper,
  state: BallState,
  accumulator: CollisionAccumulator,
  settings: StepSettings,
) => {
  const { ballRadius, damping } = settings;
  const edges = buildEdges(bumper.vertices);

  let collided = false;

  for (const edge of edges) {
    const nearest = closestPointOnSegment(state.position, edge);
    const diff = sub(state.position, nearest);
    const dist = length(diff);

    if (dist === 0) {
      continue;
    }

    const normal = normalize(diff);

    if (dist < ballRadius && dot(state.velocity, normal) < 0) {
      const penetration = ballRadius - dist;
      state.position = add(state.position, scale(normal, penetration));
      state.velocity = scale(reflectVelocity(state.velocity, normal), damping);
      appendCollision(accumulator, {
        id: bumper.id,
        kind: 'bumper',
        normal,
        point: nearest,
      });
      collided = true;
      break;
    }
  }

  if (!collided) {
    // Corner check
    for (const vertex of bumper.vertices) {
      const diff = sub(state.position, vertex);
      const dist = length(diff);
      if (dist < ballRadius && dot(state.velocity, diff) < 0) {
        const normal = normalize(diff);
        const penetration = ballRadius - dist;
        state.position = add(state.position, scale(normal, penetration));
        state.velocity = scale(reflectVelocity(state.velocity, normal), damping);
        appendCollision(accumulator, {
          id: bumper.id,
          kind: 'bumper',
          normal,
          point: vertex,
        });
        break;
      }
    }
  }
};

export const stepBall = (
  state: BallState,
  bumpers: ResolvedBumper[],
  dt: number,
  settings: StepSettings,
): { state: BallState; collisions: CollisionEvent[] } => {
  const { friction, maxSpeed } = settings;

  const nextState: BallState = {
    position: add(state.position, scale(state.velocity, dt)),
    velocity: { ...state.velocity },
  };

  nextState.velocity = scale(nextState.velocity, 1 - friction * dt);
  const speed = length(nextState.velocity);
  if (speed > maxSpeed) {
    nextState.velocity = scale(nextState.velocity, maxSpeed / speed);
  }

  const accumulator: CollisionAccumulator = {
    events: [],
    ids: new Set(),
  };

  resolveWallCollisions(nextState, settings, accumulator);

  for (const bumper of bumpers) {
    resolveBumperCollision(bumper, nextState, accumulator, settings);
  }

  return {
    state: nextState,
    collisions: accumulator.events,
  };
};

export const simulateTrajectory = (
  start: BallState,
  level: LevelConfig,
  initialTime: number,
  dt: number,
  steps: number,
  maxCollisions: number,
  settings: StepSettings,
): Vec2[] => {
  const points: Vec2[] = [];
  let state: BallState = {
    position: { ...start.position },
    velocity: { ...start.velocity },
  };
  let time = initialTime;
  let collisions = 0;

  for (let i = 0; i < steps; i += 1) {
    const bumpers = resolveBumpers(level, time);
    const result = stepBall(state, bumpers, dt, settings);
    state = result.state;
    points.push(state.position);
    time += dt;
    if (result.collisions.length > 0) {
      collisions += result.collisions.length;
    }
    if (collisions >= maxCollisions) {
      break;
    }
  }

  return points;
};
