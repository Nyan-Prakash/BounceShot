import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';

import GameRoot from './src/components/GameRoot';
import { GameStoreProvider } from './src/context/GameStore';

export default function App() {
  return (
    <GameStoreProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <GameRoot />
      </SafeAreaView>
    </GameStoreProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050514',
  },
});
