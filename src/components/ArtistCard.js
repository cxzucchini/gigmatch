import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../styles/theme';
import HoverPressable from './HoverPressable';

export default function ArtistCard({ artist }) {
  const router = useRouter();

  return (
    <HoverPressable
      onPress={() =>
        router.push({
          pathname: '/artist/[id]',
          params: { id: String(artist._id || artist.id) },
        })
      }
      style={styles.card}
      hoverStyle={styles.cardHovered}
      pressedStyle={styles.cardPressed}
      accessibilityRole="button"
      accessibilityLabel={`View ${artist.name} profile`}
    >
      {/* Inset Rounded Portrait */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: artist.image }} style={styles.image} />
      </View>

      {/* Card Body */}
      <View style={styles.content}>
        {/* Genre Eyebrow */}
        <Text style={styles.genre} numberOfLines={1}>
          {artist.genre ? artist.genre.toUpperCase() : 'MUSICIAN'}
        </Text>

        {/* Artist Name */}
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>

        {/* Short Bio (2-line clamp) */}
        <Text style={styles.bio} numberOfLines={2}>
          {artist.bio || 'Available for live events, private parties, and acoustic sets.'}
        </Text>

        {/* Compact Location & Equipment Pills */}
        <View style={styles.badgesRow}>
          <View style={styles.locationPill}>
            <Text style={styles.locationText} numberOfLines={1}>
              📍 {artist.location}
            </Text>
          </View>

          {artist.equipment ? (
            <View style={[styles.equipmentPill, styles.equipmentBadgeTrue]}>
              <Text style={styles.equipmentTextTrue} numberOfLines={1}>
                🔊 With Sound
              </Text>
            </View>
          ) : (
            <View style={[styles.equipmentPill, styles.equipmentBadgeFalse]}>
              <Text style={styles.equipmentTextFalse} numberOfLines={1}>
                🎤 Artist Only
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Row: Price/Set Info + Pill CTA */}
        <View style={styles.footer}>
          <View style={styles.priceGroup}>
            <Text style={styles.price}>
              ₱{Number(artist.price || 0).toLocaleString()}+
            </Text>
            <Text style={styles.setDuration}>1 Set = 45 mins</Text>
          </View>

          <View style={styles.ctaPill}>
            <Text style={styles.viewProfile}>View profile →</Text>
          </View>
        </View>
      </View>
    </HoverPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 465,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 28,
    padding: 12,
    marginBottom: 24,
    shadowColor: '#35251D',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHovered: {
    borderColor: theme.accent,
    shadowColor: '#35251D',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    transform: [{ translateY: -4 }],
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ translateY: -1 }],
  },

  imageContainer: {
    width: '100%',
    height: 225,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E5DDD3',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 6,
  },

  genre: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: theme.muted,
    marginBottom: 4,
  },

  name: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
    color: theme.accent,
    marginBottom: 6,
    letterSpacing: -0.3,
  },

  bio: {
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.muted,
    marginBottom: 14,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
  },

  locationPill: {
    flexShrink: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  locationText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.muted,
  },

  equipmentPill: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  equipmentBadgeTrue: {
    borderColor: 'rgba(53, 37, 29, 0.25)',
    backgroundColor: 'rgba(53, 37, 29, 0.06)',
  },
  equipmentTextTrue: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.accent,
  },
  equipmentBadgeFalse: {
    borderColor: theme.border,
    backgroundColor: 'transparent',
  },
  equipmentTextFalse: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.muted,
  },

  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },

  priceGroup: {
    flexDirection: 'column',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.accent,
    letterSpacing: -0.2,
  },
  setDuration: {
    fontSize: 11,
    color: theme.muted,
    marginTop: 1,
  },

  ctaPill: {
    backgroundColor: 'rgba(53, 37, 29, 0.07)',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  viewProfile: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.accent,
  },
});