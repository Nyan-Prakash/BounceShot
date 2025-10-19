import React, { useCallback } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SKINS, SkinDefinition, getSkinDefinition } from '../game/skins';
import { useGameStore } from '../context/GameStore';

type ShopScreenProps = {
  onClose: () => void;
};

const ShopScreen: React.FC<ShopScreenProps> = ({ onClose }) => {
  const { state, purchaseSkin, selectSkin } = useGameStore();
  const { coins, ownedSkins, selectedSkin } = state;
  const equippedSkin = getSkinDefinition(selectedSkin);

  const handleSkinPress = useCallback(
    (skin: SkinDefinition) => {
      const owned = ownedSkins.includes(skin.id);
      if (owned) {
        if (skin.id !== selectedSkin) {
          selectSkin(skin.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {},
          );
        }
        return;
      }

      if (!purchaseSkin(skin.id, skin.cost)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {},
        );
        return;
      }

      selectSkin(skin.id);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    },
    [ownedSkins, purchaseSkin, selectSkin, selectedSkin],
  );

  const renderSkin = useCallback(
    ({ item }: ListRenderItemInfo<SkinDefinition>) => {
      const owned = ownedSkins.includes(item.id);
      const equipped = selectedSkin === item.id;
      const affordable = coins >= item.cost;

      return (
        <TouchableOpacity
          onPress={() => handleSkinPress(item)}
          style={[
            styles.skinCard,
            owned && styles.skinCardOwned,
            equipped && styles.skinCardEquipped,
            !owned && !affordable && styles.skinCardLocked,
          ]}
          disabled={!owned && !affordable}
        >
          <View
            style={[
              styles.skinSwatch,
              { backgroundColor: item.glowColor },
            ]}
          >
            <View
              style={[
                styles.skinBall,
                {
                  backgroundColor: item.ballColor,
                  borderColor: item.accentColor,
                },
              ]}
            />
          </View>
          <View style={styles.skinMeta}>
            <Text style={styles.skinName}>{item.name}</Text>
            <Text style={styles.skinDescription}>{item.description}</Text>
            <View style={styles.skinFooter}>
              {owned ? (
                <View
                  style={[
                    styles.tagBadge,
                    equipped && styles.tagBadgeEquipped,
                  ]}
                >
                  <Feather
                    name={equipped ? 'check' : 'unlock'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.tagText}>
                    {equipped ? 'Equipped' : 'Owned'}
                  </Text>
                </View>
              ) : (
                <View style={styles.tagBadge}>
                  <Feather name="star" size={14} color="#FFD369" />
                  <Text style={styles.tagText}>{item.cost}</Text>
                </View>
              )}

              {!owned && !affordable ? (
                <Text style={styles.lockedText}>
                  Need {item.cost - coins} more
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [coins, handleSkinPress, ownedSkins, selectedSkin],
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back to main menu"
        >
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Skins</Text>
        <View style={styles.coinBadge}>
          <Feather name="star" size={18} color="#FFD369" />
          <Text style={styles.coinText}>{coins}</Text>
        </View>
      </View>

      <View style={styles.equippedBanner}>
        <Text style={styles.bannerTitle}>Equipped</Text>
        <View style={styles.bannerRow}>
          <View
            style={[
              styles.bannerGlow,
              { backgroundColor: equippedSkin.glowColor },
            ]}
          >
            <View
              style={[
                styles.bannerBall,
                {
                  backgroundColor: equippedSkin.ballColor,
                  borderColor: equippedSkin.accentColor,
                },
              ]}
            />
          </View>
          <View style={styles.bannerMeta}>
            <Text style={styles.bannerName}>{equippedSkin.name}</Text>
            <Text style={styles.bannerDescription}>
              {equippedSkin.description}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={SKINS}
        keyExtractor={(item) => item.id}
        renderItem={renderSkin}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ShopScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050514',
    paddingTop: 46,
    paddingHorizontal: 22,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,211,105,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD369',
  },
  equippedBanner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerGlow: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },
  bannerBall: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  bannerMeta: {
    marginLeft: 18,
    flex: 1,
  },
  bannerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerDescription: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  listContent: {
    paddingBottom: 40,
  },
  skinCard: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  skinCardOwned: {
    borderColor: 'rgba(100,255,218,0.35)',
    backgroundColor: 'rgba(100,255,218,0.08)',
  },
  skinCardEquipped: {
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skinCardLocked: {
    opacity: 0.55,
  },
  skinSwatch: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    opacity: 0.75,
  },
  skinBall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  skinMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  skinName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skinDescription: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  skinFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagBadgeEquipped: {
    backgroundColor: 'rgba(100,255,218,0.25)',
  },
  tagText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lockedText: {
    marginLeft: 12,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
});
