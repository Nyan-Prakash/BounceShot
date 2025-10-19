import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SKIN_ID, SkinId } from '../game/skins';

const STORAGE_KEY = 'hyperbounce/game-state/v1';

export type AppScreen = 'menu' | 'game' | 'shop';

export type GameState = {
  coins: number;
  highestUnlockedLevel: number;
  totalWins: number;
  ownedSkins: SkinId[];
  selectedSkin: SkinId;
  lastPlayedLevel: number;
};

const defaultState: GameState = {
  coins: 0,
  highestUnlockedLevel: 0,
  totalWins: 0,
  ownedSkins: [DEFAULT_SKIN_ID],
  selectedSkin: DEFAULT_SKIN_ID,
  lastPlayedLevel: 0,
};

type GameStoreContextValue = {
  state: GameState;
  loading: boolean;
  activeScreen: AppScreen;
  setActiveScreen: (screen: AppScreen) => void;
  addCoins: (amount: number) => void;
  recordWin: (rewardCoins: number, nextLevelIndex: number) => void;
  unlockLevel: (levelIndex: number) => void;
  purchaseSkin: (skinId: SkinId, cost: number) => boolean;
  selectSkin: (skinId: SkinId) => void;
  setLastPlayedLevel: (levelIndex: number) => void;
  resetProgress: () => void;
};

const GameStoreContext = createContext<GameStoreContextValue | undefined>(
  undefined,
);

const sanitizeState = (raw: Partial<GameState>): GameState => {
  const ownedSkins = Array.isArray(raw.ownedSkins)
    ? (raw.ownedSkins.filter(Boolean) as SkinId[])
    : [DEFAULT_SKIN_ID];
  if (!ownedSkins.includes(DEFAULT_SKIN_ID)) {
    ownedSkins.unshift(DEFAULT_SKIN_ID);
  }

  const selected = ownedSkins.includes(raw.selectedSkin as SkinId)
    ? (raw.selectedSkin as SkinId)
    : DEFAULT_SKIN_ID;

  return {
    ...defaultState,
    ...raw,
    coins: Math.max(0, raw.coins ?? defaultState.coins),
    highestUnlockedLevel: Math.max(
      defaultState.highestUnlockedLevel,
      raw.highestUnlockedLevel ?? defaultState.highestUnlockedLevel,
    ),
    totalWins: Math.max(0, raw.totalWins ?? defaultState.totalWins),
    lastPlayedLevel: Math.max(
      0,
      raw.lastPlayedLevel ?? defaultState.lastPlayedLevel,
    ),
    ownedSkins: Array.from(new Set(ownedSkins)),
    selectedSkin: selected,
  };
};

export const GameStoreProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [state, setState] = useState<GameState>(defaultState);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('menu');
  const [hydrated, setHydrated] = useState<boolean>(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<GameState>;
          if (!cancelled) {
            setState(sanitizeState(parsed));
          }
        }
      } catch {
        // ignore corrupted cache and fall back to defaults
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const addCoins = useCallback((amount: number) => {
    if (amount <= 0) {
      return;
    }
    setState((prev) => ({
      ...prev,
      coins: prev.coins + Math.floor(amount),
    }));
  }, []);

  const unlockLevel = useCallback((levelIndex: number) => {
    setState((prev) => {
      if (levelIndex <= prev.highestUnlockedLevel) {
        return prev;
      }
      return {
        ...prev,
        highestUnlockedLevel: levelIndex,
      };
    });
  }, []);

  const recordWin = useCallback(
    (rewardCoins: number, nextLevelIndex: number) => {
      setState((prev) => {
        const payout = Math.max(0, Math.floor(rewardCoins));
        const updatedHighest = Math.max(
          prev.highestUnlockedLevel,
          nextLevelIndex,
        );
        return {
          ...prev,
          coins: prev.coins + payout,
          totalWins: prev.totalWins + 1,
          highestUnlockedLevel: updatedHighest,
          lastPlayedLevel: Math.max(0, nextLevelIndex),
        };
      });
    },
    [],
  );

  const purchaseSkin = useCallback((skinId: SkinId, cost: number) => {
    let purchased = false;
    setState((prev) => {
      if (prev.ownedSkins.includes(skinId)) {
        purchased = true;
        return prev;
      }
      if (cost > prev.coins) {
        purchased = false;
        return prev;
      }
      purchased = true;
      return {
        ...prev,
        coins: prev.coins - cost,
        ownedSkins: [...prev.ownedSkins, skinId],
      };
    });
    return purchased;
  }, []);

  const selectSkin = useCallback((skinId: SkinId) => {
    setState((prev) => {
      if (!prev.ownedSkins.includes(skinId) || prev.selectedSkin === skinId) {
        return prev;
      }
      return {
        ...prev,
        selectedSkin: skinId,
      };
    });
  }, []);

  const setLastPlayedLevel = useCallback((levelIndex: number) => {
    setState((prev) => ({
      ...prev,
      lastPlayedLevel: Math.max(0, levelIndex),
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setState(defaultState);
    setActiveScreen('menu');
  }, []);

  const value = useMemo<GameStoreContextValue>(
    () => ({
      state,
      loading: !hydrated,
      activeScreen,
      setActiveScreen,
      addCoins,
      recordWin,
      unlockLevel,
      purchaseSkin,
      selectSkin,
      setLastPlayedLevel,
      resetProgress,
    }),
    [
      state,
      hydrated,
      activeScreen,
      addCoins,
      recordWin,
      unlockLevel,
      purchaseSkin,
      selectSkin,
      setLastPlayedLevel,
      resetProgress,
    ],
  );

  return (
    <GameStoreContext.Provider value={value}>
      {children}
    </GameStoreContext.Provider>
  );
};

export const useGameStore = (): GameStoreContextValue => {
  const context = useContext(GameStoreContext);
  if (!context) {
    throw new Error('useGameStore must be used within a GameStoreProvider');
  }
  return context;
};
