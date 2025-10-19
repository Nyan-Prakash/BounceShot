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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { LEVELS } from '../game/levels';
import { getSkinDefinition } from '../game/skins';
import { useGameStore } from '../context/GameStore';

type MainMenuProps = {
  onStart: () => void;
  onOpenShop: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onOpenShop }) => {
  const { state, setLastPlayedLevel } = useGameStore();
  const {
    coins,
    highestUnlockedLevel,
    lastPlayedLevel,
    totalWins,
    selectedSkin,
  } = state;

  const playableMax = useMemo(
    () => Math.min(highestUnlockedLevel, LEVELS.length - 1),
    [highestUnlockedLevel],
  );

  const [previewIndex, setPreviewIndex] = useState(() =>
    clamp(lastPlayedLevel, 0, playableMax),
  );

  useEffect(() => {
    setPreviewIndex((prev) => {
      const clamped = clamp(lastPlayedLevel, 0, playableMax);
      return prev === clamped ? prev : clamped;
    });
  }, [lastPlayedLevel, playableMax]);

  useEffect(() => {
    if (previewIndex !== lastPlayedLevel) {
      setLastPlayedLevel(previewIndex);
    }
  }, [previewIndex, lastPlayedLevel, setLastPlayedLevel]);

  const selectedSkinDef = useMemo(
    () => getSkinDefinition(selectedSkin),
    [selectedSkin],
  );

  const nextLevel = LEVELS[previewIndex];
  const unlockedCount = Math.min(playableMax + 1, LEVELS.length);

  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [floatAnim]);

  const handleLevelChange = useCallback(
    (delta: number) => {
      setPreviewIndex((prev) => clamp(prev + delta, 0, playableMax));
    },
    [playableMax],
  );

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 6],
  });

  const floatScale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hyperbounce</Text>
        <Text style={styles.subtitle}>Arcade pinball energy reimagined</Text>
      </View>

      <Animated.View
        style={[
          styles.heroCard,
          {
            transform: [
              { translateY: floatTranslate },
              { scale: floatScale },
            ],
          },
        ]}
      >
        <View style={styles.skinPreview}>
          <View
            style={[
              styles.skinGlow,
              { backgroundColor: selectedSkinDef.glowColor },
            ]}
          >
            <View
              style={[
                styles.skinBall,
                {
                  backgroundColor: selectedSkinDef.ballColor,
                  borderColor: selectedSkinDef.accentColor,
                },
              ]}
            />
          </View>
          <Text style={styles.skinName}>{selectedSkinDef.name}</Text>
          <Text style={styles.skinDescription}>
            {selectedSkinDef.description}
          </Text>
        </View>

        <View style={styles.levelPreview}>
          <Text style={styles.previewLabel}>Next challenge</Text>
          <Text style={styles.previewLevel}>{nextLevel.name}</Text>
          <Text style={styles.previewInfo}>
            Bounce limit {nextLevel.bounceLimit} · Target (
            {Math.round(nextLevel.target.position.x)},
            {Math.round(nextLevel.target.position.y)})
          </Text>
          <View style={styles.levelSelector}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous level"
              onPress={() => handleLevelChange(-1)}
              style={[
                styles.selectorButton,
                previewIndex <= 0 && styles.selectorButtonDisabled,
              ]}
              disabled={previewIndex <= 0}
            >
              <Feather
                name="chevron-left"
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.selectorText}>
              {previewIndex + 1}/{unlockedCount}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next level"
              onPress={() => handleLevelChange(1)}
              style={[
                styles.selectorButton,
                previewIndex >= unlockedCount - 1 &&
                  styles.selectorButtonDisabled,
              ]}
              disabled={previewIndex >= unlockedCount - 1}
            >
              <Feather
                name="chevron-right"
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Feather name="star" size={18} color="#FFD369" />
          <Text style={styles.statValue}>{coins}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="award" size={18} color="#9A97FF" />
          <Text style={styles.statValue}>{totalWins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="map" size={18} color="#5CF4FF" />
          <Text style={styles.statValue}>{unlockedCount}</Text>
          <Text style={styles.statLabel}>Levels</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onStart}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Play</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onOpenShop}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>Shop</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MainMenu;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06061A',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 28,
  },
  skinPreview: {
    alignItems: 'center',
    width: '42%',
  },
  skinGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  skinBall: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  skinName: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skinDescription: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
  },
  levelPreview: {
    width: '54%',
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewLevel: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewInfo: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
  },
  levelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  selectorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  selectorButtonDisabled: {
    opacity: 0.3,
  },
  selectorText: {
    marginHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  statValue: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.55)',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#080818',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
