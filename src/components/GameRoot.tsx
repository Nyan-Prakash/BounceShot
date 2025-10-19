import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LEVELS } from '../game/levels';
import { useGameStore } from '../context/GameStore';
import BounceGame from './BounceGame';
import MainMenu from './MainMenu';
import ShopScreen from './ShopScreen';

const GameRoot: React.FC = () => {
  const { state, activeScreen, setActiveScreen, loading } = useGameStore();

  const startLevelIndex = useMemo(
    () => Math.max(0, Math.min(state.lastPlayedLevel, LEVELS.length - 1)),
    [state.lastPlayedLevel],
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (activeScreen === 'game') {
    return (
      <BounceGame
        startLevelIndex={startLevelIndex}
        onExitToMenu={() => setActiveScreen('menu')}
        onOpenShop={() => setActiveScreen('shop')}
      />
    );
  }

  if (activeScreen === 'shop') {
    return <ShopScreen onClose={() => setActiveScreen('menu')} />;
  }

  return (
    <MainMenu
      onStart={() => setActiveScreen('game')}
      onOpenShop={() => setActiveScreen('shop')}
    />
  );
};

export default GameRoot;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#050514',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
