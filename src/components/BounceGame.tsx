import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  LayoutRectangle,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle as SvgCircle, Polygon } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

import { useAnimationLoop } from '../hooks/useAnimationLoop';
import {
  LEVELS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getBallRadius,
  getTargetSize,
} from '../game/levels';
import {
  BallState,
  CollisionEvent,
  ResolvedBumper,
  StepSettings,
  resolveBumpers,
  simulateTrajectory,
  stepBall,
} from '../game/physics';
import { GameStatus, LevelConfig, Vec2 } from '../game/types';
import { useGameStore } from '../context/GameStore';
import { getSkinDefinition } from '../game/skins';

type Particle = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  life: number;
  color: string;
};

type FailReason = 'bounces' | 'bounds' | 'stall';

type BounceGameProps = {
  startLevelIndex: number;
  onExitToMenu: () => void;
  onOpenShop?: () => void;
};

const BALL_RADIUS = getBallRadius();
const TARGET_SIZE = getTargetSize();
const PREVIEW_DT = 1 / 60;
const PREVIEW_STEPS = 90;
const PREVIEW_COLLISIONS = 3;
const IDLE_THRESHOLD = 24;
const IDLE_TIMEOUT = 2;

const createZeroVec = (): Vec2 => ({ x: 0, y: 0 });

const length = (vec: Vec2) => Math.sqrt(vec.x * vec.x + vec.y * vec.y);
const normalize = (vec: Vec2): Vec2 => {
  const len = length(vec);
  return len === 0 ? createZeroVec() : { x: vec.x / len, y: vec.y / len };
};
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const scaleVec = (vec: Vec2, scale: number): Vec2 => ({
  x: vec.x * scale,
  y: vec.y * scale,
});
const addVec = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

const getPhysicsSettings = (): StepSettings => ({
  ballRadius: BALL_RADIUS,
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
  damping: 0.88,
  friction: 0.18,
  maxSpeed: 900,
});

const createParticleBurst = (
  idSeedRef: React.MutableRefObject<number>,
  origin: Vec2,
  color: string,
): Particle[] => {
  const count = 8;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 120 + Math.random() * 80;
    idSeedRef.current += 1;
    particles.push({
      id: idSeedRef.current,
      position: { ...origin },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      life: 0.45 + Math.random() * 0.25,
      color,
    });
  }
  return particles;
};

const failText: Record<FailReason, string> = {
  bounces: 'Out of bounces',
  bounds: 'Out of bounds',
  stall: 'Stalled out',
};

const BounceGame: React.FC<BounceGameProps> = ({
  startLevelIndex,
  onExitToMenu,
  onOpenShop = () => {},
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const {
    state: storeState,
    recordWin,
    setLastPlayedLevel,
  } = useGameStore();

  const highestUnlocked = useMemo(
    () => Math.min(storeState.highestUnlockedLevel, LEVELS.length - 1),
    [storeState.highestUnlockedLevel],
  );

  const clampedStart = useMemo(
    () => clamp(startLevelIndex, 0, highestUnlocked),
    [startLevelIndex, highestUnlocked],
  );

  const [levelIndex, setLevelIndex] = useState<number>(clampedStart);
  const [status, setStatus] = useState<GameStatus>('aim');
  const [failReason, setFailReason] = useState<FailReason | null>(null);
  const [remainingBounces, setRemainingBounces] = useState(
    LEVELS[clampedStart].bounceLimit,
  );
  const [trajectory, setTrajectory] = useState<Vec2[]>([]);
  const [fieldLayout, setFieldLayout] = useState<LayoutRectangle | null>(null);
  const [bumpers, setBumpers] = useState<ResolvedBumper[]>(() =>
    resolveBumpers(LEVELS[clampedStart], 0),
  );
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ballPosition, setBallPosition] = useState<Vec2>(
    LEVELS[clampedStart].ballStart,
  );
  const [ballVelocity, setBallVelocity] = useState<Vec2>(createZeroVec());
  const [winReward, setWinReward] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);

  const dragVectorRef = useRef<Vec2 | null>(null);
  const levelRef = useRef<LevelConfig>(LEVELS[clampedStart]);
  const statusRef = useRef<GameStatus>('aim');
  const ballRef = useRef<BallState>({
    position: { ...LEVELS[clampedStart].ballStart },
    velocity: createZeroVec(),
  });
  const movingRef = useRef<boolean>(false);
  const idleTimerRef = useRef<number>(0);
  const bounceCountRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const particleIdRef = useRef<number>(0);
  const lastHapticRef = useRef<number>(0);
  const sessionCoinsRef = useRef<number>(0);

  const physicsSettings = useMemo(getPhysicsSettings, []);
  const selectedSkin = useMemo(
    () => getSkinDefinition(storeState.selectedSkin),
    [storeState.selectedSkin],
  );
  const { coins, totalWins } = storeState;

  const shake = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const targetPulse = useRef(new Animated.Value(1)).current;

  const aspectWidth = Math.min(windowWidth * 0.92, windowHeight * (9 / 16) * 0.9);
  const aspectHeight = (aspectWidth / 9) * 16;
  const scale =
    fieldLayout != null ? fieldLayout.width / WORLD_WIDTH : aspectWidth / WORLD_WIDTH;

  const level = LEVELS[levelIndex];

  const triggerShake = useCallback(
    (magnitude: number, duration = 140) => {
      const offset = {
        x: (Math.random() * 2 - 1) * magnitude,
        y: (Math.random() * 2 - 1) * magnitude,
      };
      Animated.sequence([
        Animated.timing(shake, {
          toValue: offset,
          duration: duration * 0.5,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: { x: 0, y: 0 },
          duration: duration * 0.5,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [shake],
  );

  const triggerTargetPulse = useCallback(() => {
    targetPulse.setValue(1);
    Animated.sequence([
      Animated.timing(targetPulse, {
        toValue: 1.15,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(targetPulse, {
        toValue: 1,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [targetPulse]);

  const convertToWorld = useCallback(
    (locationX: number, locationY: number): Vec2 | null => {
      if (!fieldLayout) {
        return null;
      }
      const relativeX = clamp(locationX, 0, fieldLayout.width);
      const relativeY = clamp(locationY, 0, fieldLayout.height);
      return {
        x: clamp((relativeX / fieldLayout.width) * WORLD_WIDTH, 0, WORLD_WIDTH),
        y: clamp((relativeY / fieldLayout.height) * WORLD_HEIGHT, 0, WORLD_HEIGHT),
      };
    },
    [fieldLayout],
  );

  const convertToScreen = useCallback(
    (point: Vec2) => {
      if (!fieldLayout) {
        return { x: 0, y: 0 };
      }
      return {
        x: (point.x / WORLD_WIDTH) * fieldLayout.width,
        y: (point.y / WORLD_HEIGHT) * fieldLayout.height,
      };
    },
    [fieldLayout],
  );

  const resetLevel = useCallback(
    (nextIndex: number) => {
      const index = nextIndex % LEVELS.length;
      const targetLevel = LEVELS[index];
      levelRef.current = targetLevel;
      setLevelIndex(index);
      setLastPlayedLevel(index);
      timeRef.current = 0;
      statusRef.current = 'aim';
      setStatus('aim');
      setFailReason(null);
      bounceCountRef.current = 0;
      setRemainingBounces(targetLevel.bounceLimit);
      idleTimerRef.current = 0;
      movingRef.current = false;
      dragVectorRef.current = null;
      const startPosition = { ...targetLevel.ballStart };
      const startBumpers = resolveBumpers(targetLevel, 0);
      ballRef.current = {
        position: startPosition,
        velocity: createZeroVec(),
      };
      setBallPosition(startPosition);
      setBallVelocity(createZeroVec());
      setBumpers(startBumpers);
      setParticles([]);
      setTrajectory([]);
      particleIdRef.current = 0;
      sessionCoinsRef.current = 0;
      setSessionCoins(0);
      setWinReward(0);
    },
    [setLastPlayedLevel],
  );

  useEffect(() => {
    if (clampedStart !== levelIndex) {
      resetLevel(clampedStart);
    }
  }, [clampedStart, levelIndex, resetLevel]);

  const handleWin = useCallback(() => {
    if (statusRef.current === 'win') {
      return;
    }
    statusRef.current = 'win';
    setStatus('win');
    movingRef.current = false;

    const currentLevel = levelRef.current;
    const remaining =
      currentLevel.bounceLimit - bounceCountRef.current;
    const baseReward = 120 + levelIndex * 25;
    const bounceBonus = Math.max(0, remaining) * 40;
    const momentumBonus = Math.floor(
      clamp(length(ballRef.current.velocity), 0, 280),
    );
    const runBonus = sessionCoinsRef.current;
    const totalReward = baseReward + bounceBonus + runBonus + momentumBonus;
    setWinReward(totalReward);
    sessionCoinsRef.current = 0;
    setSessionCoins(0);

    const nextLevelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
    recordWin(totalReward, nextLevelIndex);

    ballRef.current.velocity = createZeroVec();
    setBallVelocity(createZeroVec());
    triggerTargetPulse();
    triggerShake(14, 220);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  }, [levelIndex, recordWin, triggerShake, triggerTargetPulse]);

  const handleFail = useCallback(
    (reason: FailReason) => {
      if (statusRef.current === 'fail' || statusRef.current === 'win') {
        return;
      }
      statusRef.current = 'fail';
      setStatus('fail');
      setFailReason(reason);
      movingRef.current = false;
      ballRef.current.velocity = createZeroVec();
      setBallVelocity(createZeroVec());
      sessionCoinsRef.current = 0;
      setSessionCoins(0);
      setWinReward(0);
      triggerShake(10, 200);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      );
    },
    [triggerShake],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => statusRef.current === 'aim',
        onStartShouldSetPanResponderCapture: () => statusRef.current === 'aim',
        onMoveShouldSetPanResponder: () => statusRef.current === 'aim',
        onPanResponderGrant: (evt) => {
          if (statusRef.current !== 'aim') {
            return;
          }
          const touch = convertToWorld(
            evt.nativeEvent.locationX,
            evt.nativeEvent.locationY,
          );
          if (!touch) {
            return;
          }
          const distToBall = length({
            x: touch.x - ballRef.current.position.x,
            y: touch.y - ballRef.current.position.y,
          });
          if (distToBall <= BALL_RADIUS * 2.4) {
            dragVectorRef.current = {
              x: touch.x - ballRef.current.position.x,
              y: touch.y - ballRef.current.position.y,
            };
          } else {
            dragVectorRef.current = null;
          }
        },
        onPanResponderMove: (evt, _gestureState) => {
          if (statusRef.current !== 'aim') {
            return;
          }
          if (!dragVectorRef.current) {
            return;
          }
          const touch = convertToWorld(
            evt.nativeEvent.locationX,
            evt.nativeEvent.locationY,
          );
          if (!touch) {
            return;
          }
          dragVectorRef.current = {
            x: touch.x - ballRef.current.position.x,
            y: touch.y - ballRef.current.position.y,
          };
          const dragVec = dragVectorRef.current;
          const dragLength = length(dragVec);
          if (dragLength > 0) {
            const maxDrag = 160;
            const clamped = clamp(dragLength, 0, maxDrag);
            const strength = (clamped / maxDrag) * 520;
            const velocity = scaleVec(normalize(dragVec), -strength);
            setTrajectory(
              simulateTrajectory(
                {
                  position: ballRef.current.position,
                  velocity,
                },
                levelRef.current,
                timeRef.current,
                PREVIEW_DT,
                PREVIEW_STEPS,
                PREVIEW_COLLISIONS,
                physicsSettings,
              ),
            );
          } else {
            setTrajectory([]);
          }
        },
        onPanResponderRelease: (evt, _gestureState) => {
          if (statusRef.current !== 'aim') {
            return;
          }
          const touch = convertToWorld(
            evt.nativeEvent.locationX,
            evt.nativeEvent.locationY,
          );
          if (!touch || !dragVectorRef.current) {
            setTrajectory([]);
            dragVectorRef.current = null;
            return;
          }
          const dragVec = {
            x: touch.x - ballRef.current.position.x,
            y: touch.y - ballRef.current.position.y,
          };
          const dragLength = length(dragVec);
          if (dragLength < 6) {
            setTrajectory([]);
            dragVectorRef.current = null;
            return;
          }
          const maxDrag = 160;
          const clamped = clamp(dragLength, 0, maxDrag);
          const strength = (clamped / maxDrag) * 520;
          const velocity = scaleVec(normalize(dragVec), -strength);
          ballRef.current.velocity = velocity;
          setBallVelocity(velocity);
          movingRef.current = true;
          statusRef.current = 'playing';
          setStatus('playing');
          idleTimerRef.current = 0;
          setTrajectory([]);
          bounceCountRef.current = 0;
          setRemainingBounces(levelRef.current.bounceLimit);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderTerminate: () => {
          setTrajectory([]);
          dragVectorRef.current = null;
        },
      }),
    [convertToWorld, physicsSettings],
  );

  const spawnCollisionEffects = useCallback(
    (events: CollisionEvent[]) => {
      if (!events.length) {
        return;
      }
      const now = Date.now();
      if (now - lastHapticRef.current > 120) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        lastHapticRef.current = now;
      }
      triggerShake(6, 120);

      const newParticles: Particle[] = [];
      let frameCoins = 0;
      for (const collision of events) {
        const tint =
          collision.kind === 'bumper'
            ? selectedSkin.accentColor
            : selectedSkin.glowColor;
        newParticles.push(
          ...createParticleBurst(particleIdRef, collision.point, tint),
        );
        frameCoins += collision.kind === 'bumper' ? 6 : 2;
      }
      if (frameCoins > 0 && statusRef.current === 'playing') {
        sessionCoinsRef.current += frameCoins;
        setSessionCoins(sessionCoinsRef.current);
      }
      if (newParticles.length) {
        setParticles((prev) => {
          const next = [...prev, ...newParticles];
          return next.slice(-120);
        });
      }
    },
    [selectedSkin, triggerShake],
  );

  const updateParticles = useCallback(
    (dt: number) => {
      if (!particles.length) {
        return;
      }
      setParticles((prev) => {
        const updated = prev
          .map((particle) => ({
            ...particle,
            position: addVec(particle.position, scaleVec(particle.velocity, dt)),
            velocity: scaleVec(particle.velocity, 0.9),
            life: particle.life - dt,
          }))
          .filter((particle) => particle.life > 0);
        return updated;
      });
    },
    [particles.length],
  );

  useAnimationLoop(
    (dt) => {
      const previousTime = timeRef.current;
      timeRef.current += dt;
      const frameStartTime = previousTime;
      const frameEndTime = timeRef.current;
      const currentLevel = levelRef.current;
      const currentStatus = statusRef.current;
      const activeBumpers = resolveBumpers(currentLevel, frameEndTime);
      setBumpers(activeBumpers);

      if (currentStatus === 'playing' && movingRef.current) {
        let remaining = dt;
        const collisionsFrame: CollisionEvent[] = [];
        let subStepTime = frameStartTime;

        while (remaining > 0.00001) {
          const stepDt = Math.min(remaining, 1 / 240);
          subStepTime += stepDt;
          const geometry = resolveBumpers(currentLevel, subStepTime);
          const result = stepBall(
            ballRef.current,
            geometry,
            stepDt,
            physicsSettings,
          );
          ballRef.current = result.state;
          remaining -= stepDt;
          collisionsFrame.push(...result.collisions);
        }

        setBallPosition({ ...ballRef.current.position });
        setBallVelocity({ ...ballRef.current.velocity });

        if (collisionsFrame.length > 0) {
          spawnCollisionEffects(collisionsFrame);
          bounceCountRef.current += collisionsFrame.length;
          const remainingCap = currentLevel.bounceLimit - bounceCountRef.current;
          setRemainingBounces(Math.max(remainingCap, 0));
          if (remainingCap < 0) {
            handleFail('bounces');
          }
        }

        const targetCenter = currentLevel.target.position;
        const diff = {
          x: ballRef.current.position.x - targetCenter.x,
          y: ballRef.current.position.y - targetCenter.y,
        };
        const distanceToTarget = length(diff);
        if (distanceToTarget <= TARGET_SIZE / 2 + BALL_RADIUS) {
          handleWin();
        }

        const { position } = ballRef.current;
        if (
          position.x < -BALL_RADIUS * 1.5 ||
          position.x > WORLD_WIDTH + BALL_RADIUS * 1.5 ||
          position.y < -BALL_RADIUS * 1.5 ||
          position.y > WORLD_HEIGHT + BALL_RADIUS * 1.5
        ) {
          handleFail('bounds');
        }

        const speed = length(ballRef.current.velocity);
        if (speed < IDLE_THRESHOLD) {
          idleTimerRef.current += dt;
          if (idleTimerRef.current > IDLE_TIMEOUT) {
            handleFail('stall');
          }
        } else {
          idleTimerRef.current = 0;
        }
      }

      updateParticles(dt);
    },
    true,
  );

  const onRetry = useCallback(() => {
    resetLevel(levelIndex);
  }, [levelIndex, resetLevel]);

  const onNextLevel = useCallback(() => {
    resetLevel(levelIndex + 1);
  }, [levelIndex, resetLevel]);

  const renderRectBumper = (bumper: ResolvedBumper) => {
    if (!fieldLayout) {
      return null;
    }
    const width = bumper.width * scale;
    const height = bumper.height * scale;
    const center = convertToScreen(bumper.center);
    const style = {
      width,
      height,
      backgroundColor: bumper.color,
      borderRadius: 12,
      position: 'absolute' as const,
      left: center.x - width / 2,
      top: center.y - height / 2,
      transform: [{ rotate: `${bumper.rotation || 0}deg` }],
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 6,
      elevation: 4,
    };
    return <View key={bumper.id} style={style} />;
  };

  const triangleElements = useMemo(() => {
    if (!fieldLayout) {
      return null;
    }
    return bumpers
      .filter((bumper) => bumper.type === 'triangle')
      .map((bumper) => {
        const points = bumper.vertices
          .map((vertex) => {
            const screen = convertToScreen(vertex);
            return `${screen.x},${screen.y}`;
          })
          .join(' ');
        return (
          <Polygon
            key={bumper.id}
            points={points}
            fill={bumper.color}
            opacity={0.98}
          />
        );
      });
  }, [bumpers, convertToScreen, fieldLayout]);

  const trajectoryDots = useMemo(() => {
    if (!fieldLayout) {
      return null;
    }
    return trajectory.map((point, index) => {
      const screen = convertToScreen(point);
      const radius = Math.max(3 - index * 0.03, 1.6);
      return (
        <SvgCircle
          key={`trajectory-${index}`}
          cx={screen.x}
          cy={screen.y}
          r={radius}
          fill={selectedSkin.trailColor}
        />
      );
    });
  }, [trajectory, convertToScreen, fieldLayout, selectedSkin]);

  const particleDots = useMemo(() => {
    if (!fieldLayout) {
      return null;
    }
    return particles.map((particle) => {
      const screen = convertToScreen(particle.position);
      const radius = Math.max(1.2, particle.life * 3);
      return (
        <SvgCircle
          key={`particle-${particle.id}`}
          cx={screen.x}
          cy={screen.y}
          r={radius}
          fill={particle.color}
          opacity={particle.life}
        />
      );
    });
  }, [particles, convertToScreen, fieldLayout]);

  const ballStyle = useMemo(() => {
    if (!fieldLayout) {
      return null;
    }
    const size = BALL_RADIUS * 2 * scale;
    const screen = convertToScreen(ballPosition);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      left: screen.x - size / 2,
      top: screen.y - size / 2,
      backgroundColor: selectedSkin.ballColor,
      shadowColor: selectedSkin.glowColor,
      borderWidth: 2,
      borderColor: selectedSkin.accentColor,
    };
  }, [ballPosition, convertToScreen, fieldLayout, scale, selectedSkin]);

  const ballGlowStyle = useMemo(() => {
    if (!fieldLayout) {
      return null;
    }
    const size = BALL_RADIUS * 2.6 * scale;
    const screen = convertToScreen(ballPosition);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      left: screen.x - size / 2,
      top: screen.y - size / 2,
      backgroundColor: selectedSkin.glowColor,
    };
  }, [ballPosition, convertToScreen, fieldLayout, scale, selectedSkin]);

  const targetStyle = useMemo(() => {
    if (!fieldLayout) {
      return null;
    }
    const size = TARGET_SIZE * scale;
    const screen = convertToScreen(level.target.position);
    return {
      width: size,
      height: size,
      left: screen.x - size / 2,
      top: screen.y - size / 2,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.24)',
    };
  }, [convertToScreen, fieldLayout, level.target.position, scale]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityLabel="Back to main menu"
          accessibilityRole="button"
          style={styles.navButton}
          onPress={onExitToMenu}
        >
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.levelMeta}>
          <Text style={styles.levelLabel}>{level.name}</Text>
          <Text style={styles.levelSubLabel}>
            Level {levelIndex + 1} · Wins {totalWins}
          </Text>
          <Text style={styles.levelSubLabel}>
            {Math.max(remainingBounces, 0)} bounces left
          </Text>
        </View>
        <View style={styles.topActions}>
          <View style={styles.coinBadge}>
            <Feather name="star" size={18} color="#FFD369" />
            <Text style={styles.coinText}>{coins}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Open shop"
            accessibilityRole="button"
            style={styles.navButton}
            onPress={onOpenShop}
          >
            <Feather name="shopping-bag" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {sessionCoins > 0 ? (
        <View style={styles.sessionBadge}>
          <Feather name="zap" size={16} color={selectedSkin.accentColor} />
          <Text style={styles.sessionText}>Run bonus +{sessionCoins}</Text>
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.gameWrap,
          {
            width: aspectWidth,
            height: aspectHeight,
            transform: [
              { translateX: shake.x },
              { translateY: shake.y },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.field,
            { backgroundColor: level.backgroundColor },
          ]}
          onLayout={(event) => setFieldLayout(event.nativeEvent.layout)}
          {...panResponder.panHandlers}
        >
          {bumpers
            .filter((bumper) => bumper.type === 'rect')
            .map(renderRectBumper)}

          {fieldLayout ? (
            <Svg
              pointerEvents="none"
              width={fieldLayout.width}
              height={fieldLayout.height}
              style={StyleSheet.absoluteFill}
            >
              {triangleElements}
              {trajectoryDots}
              {particleDots}
            </Svg>
          ) : null}

          {ballGlowStyle ? (
            <View
              pointerEvents="none"
              style={[
                styles.ballGlow,
                ballGlowStyle,
              ]}
            />
          ) : null}

          {ballStyle ? (
            <View
              style={[
                styles.ball,
                ballStyle,
              ]}
            />
          ) : null}

          {targetStyle ? (
            <Animated.View
              style={[
                styles.target,
                targetStyle,
                { backgroundColor: level.target.color, transform: [{ scale: targetPulse }] },
              ]}
            />
          ) : null}
        </View>
      </Animated.View>

      {(status === 'win' || status === 'fail') && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            {status === 'win'
              ? 'Level Complete!'
              : failReason
              ? failText[failReason]
              : 'Try Again'}
          </Text>
          <Text style={styles.rewardText}>
            {status === 'win'
              ? `+${winReward} coins banked`
              : 'No coins this run'}
          </Text>
          <View style={styles.overlayButtons}>
            {status === 'win' ? (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onNextLevel}
                >
                  <Text style={styles.primaryButtonText}>Next Level</Text>
                </TouchableOpacity>
                <View style={styles.overlayRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onExitToMenu}
                  >
                    <Text style={styles.secondaryButtonText}>Menu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onOpenShop}
                  >
                    <Text style={styles.secondaryButtonText}>Shop</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onRetry}
                >
                  <Text style={styles.primaryButtonText}>Retry</Text>
                </TouchableOpacity>
                <View style={styles.overlayRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onExitToMenu}
                  >
                    <Text style={styles.secondaryButtonText}>Menu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onOpenShop}
                  >
                    <Text style={styles.secondaryButtonText}>Shop</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default BounceGame;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080818',
    paddingVertical: 32,
  },
  topBar: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelMeta: {
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelSubLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,211,105,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 12,
  },
  coinText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD369',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sessionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gameWrap: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 25,
    elevation: 12,
  },
  field: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
  },
  ballGlow: {
    position: 'absolute',
    opacity: 0.45,
  },
  ball: {
    position: 'absolute',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  target: {
    position: 'absolute',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  overlay: {
    position: 'absolute',
    bottom: 42,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  overlayTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 16,
  },
  overlayButtons: {
    width: '100%',
    alignItems: 'center',
  },
  overlayRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 12,
    minWidth: '60%',
  },
  primaryButtonText: {
    color: '#1C1C28',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginHorizontal: 6,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
