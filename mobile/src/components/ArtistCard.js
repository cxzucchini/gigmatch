import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../styles/theme';
import HoverPressable from './HoverPressable';

const SCALLOP_PATH =
  'M 50 7 C 54 7, 57 12, 61 13 C 65 14, 70 11, 74 13 C 77 15, 78 21, 81 24 C 84 27, 90 28, 92 31 C 94 35, 91 40, 92 44 C 93 48, 98 51, 98 55 C 98 59, 93 62, 92 66 C 91 70, 94 75, 92 79 C 90 82, 84 83, 81 86 C 78 89, 77 95, 74 97 C 70 99, 65 96, 61 97 C 57 98, 54 103, 50 103 C 46 103, 43 98, 39 97 C 35 96, 30 99, 26 97 C 23 95, 22 89, 19 86 C 16 83, 10 82, 8 79 C 6 75, 9 70, 8 66 C 7 62, 2 59, 2 55 C 2 51, 7 48, 8 44 C 9 40, 6 35, 8 31 C 10 28, 16 27, 19 24 C 22 21, 23 15, 26 13 C 30 11, 35 14, 39 13 C 43 12, 46 7, 50 7 Z';

function VerifiedStickerBadge({ isVerified }) {
  if (Platform.OS === 'web') {
    const shadowColor = isVerified ? '#35251D' : '#C2B6AA';
    const bodyFill = isVerified ? '#E3BE82' : '#F2ECE4';
    const borderStroke = isVerified ? '#35251D' : '#9A8C80';
    const innerRingStroke = isVerified ? '#FBF8F3' : '#C2B6AA';

    return React.createElement(
      'svg',
      {
        width: 28,
        height: 28,
        viewBox: '-4 -4 112 114',
        style: { display: 'block', overflow: 'visible' },
      },
      /* 1. Offset 3D drop shadow */
      React.createElement('path', {
        d: SCALLOP_PATH,
        transform: 'translate(3.5, 4.5)',
        style: { fill: shadowColor, stroke: 'none' },
      }),
      /* 2. Warm gold scalloped sticker body */
      React.createElement('path', {
        d: SCALLOP_PATH,
        style: {
          fill: bodyFill,
          stroke: borderStroke,
          strokeWidth: 4,
          strokeLinejoin: 'round',
        },
      }),
      /* 3. Inner cream decorative ring */
      React.createElement('path', {
        d: SCALLOP_PATH,
        transform: 'translate(8, 8.8) scale(0.84)',
        style: {
          fill: 'none',
          stroke: innerRingStroke,
          strokeWidth: 2.2,
        },
      }),
      /* 4. Crisp checkmark or dash */
      isVerified
        ? React.createElement('polyline', {
            points: '32,56 45,69 70,42',
            style: {
              fill: 'none',
              stroke: '#2B1C14',
              strokeWidth: 9.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            },
          })
        : React.createElement('line', {
            x1: 37,
            y1: 55,
            x2: 63,
            y2: 55,
            style: {
              fill: 'none',
              stroke: '#9A8C80',
              strokeWidth: 6.5,
              strokeLinecap: 'round',
            },
          })
    );
  }

  /* Native iOS / Android fallback */
  return (
    <View style={[styles.nativeSealOuter, isVerified ? styles.nativeSealVerified : styles.nativeSealUnverified]}>
      <Text style={[styles.nativeSealIcon, !isVerified && styles.nativeSealIconMuted]}>
        {isVerified ? '✓' : '–'}
      </Text>
    </View>
  );
}

export default function ArtistCard({ artist }) {
  const router = useRouter();
  const [showVerifiedTip, setShowVerifiedTip] = useState(false);
  const [badgeHovered, setBadgeHovered] = useState(false);

  const isVerified = Boolean(
    artist.verified ||
      artist.isVerified ||
      artist.verificationStatus === 'approved' ||
      artist.verificationStatus === 'verified'
  );

  const handleBadgeToggle = (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setShowVerifiedTip((prev) => !prev);
  };

  return (
    <HoverPressable
      onPress={() => {
        if (showVerifiedTip) {
          setShowVerifiedTip(false);
          return;
        }
        router.push({
          pathname: '/artist/[id]',
          params: { id: String(artist._id || artist.id) },
        });
      }}
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

        {/* Artist Name + Scalloped Sticker Verification Badge */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {artist.name}
          </Text>

          <View
            style={styles.verifiedWrapper}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handleBadgeToggle}
            {...(Platform.OS === 'web'
              ? {
                  onMouseEnter: () => {
                    setBadgeHovered(true);
                    setShowVerifiedTip(true);
                  },
                  onMouseLeave: () => {
                    setBadgeHovered(false);
                    setShowVerifiedTip(false);
                  },
                  onClick: handleBadgeToggle,
                }
              : {})}
          >
            <View style={[styles.stickerButton, badgeHovered && styles.stickerHovered]}>
              <VerifiedStickerBadge isVerified={isVerified} />
            </View>

            {showVerifiedTip ? (
              <View style={styles.tooltipContainer} pointerEvents="none">
                <View style={styles.tooltipCard}>
                  <Text style={styles.tooltipEyebrow}>
                    {isVerified ? '✦ VERIFIED ARTIST' : '○ UNVERIFIED PROFILE'}
                  </Text>
                  <Text style={styles.tooltipBody}>
                    {isVerified
                      ? 'Identity, live performance media, and booking details confirmed by Gigmatch.'
                      : 'This performer has not completed Gigmatch identity verification yet.'}
                  </Text>
                </View>
                <View style={styles.tooltipArrow} />
              </View>
            ) : null}
          </View>
        </View>

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

        {/* Bottom Row: Price/Set Info + CTA */}
        <View style={styles.footer}>
          <View style={styles.priceGroup}>
            <Text style={styles.price}>
              ₱{Number(artist.price || 0).toLocaleString()}+
            </Text>
            <Text style={styles.setDuration}>1 Set = 45 mins</Text>
          </View>

          <Text style={styles.viewProfile}>View profile →</Text>
        </View>
      </View>
    </HoverPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flex: 1,
    minHeight: 450,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 28,
    padding: 12,
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
    height: 280,
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

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    zIndex: 20,
  },
  name: {
    flexShrink: 1,
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
    color: theme.accent,
    letterSpacing: -0.3,
  },

  verifiedWrapper: {
    position: 'relative',
    flexShrink: 0,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerHovered: {
    transform: [{ scale: 1.1 }, { rotate: '-4deg' }],
  },

  nativeSealOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nativeSealVerified: {
    backgroundColor: '#E3BE82',
    borderColor: '#35251D',
  },
  nativeSealUnverified: {
    backgroundColor: '#F2ECE4',
    borderColor: '#9A8C80',
  },
  nativeSealIcon: {
    color: '#35251D',
    fontSize: 12,
    fontWeight: '800',
  },
  nativeSealIconMuted: {
    color: '#9A8C80',
  },

  /* Elevated Tooltip Popover */
  tooltipContainer: {
    position: 'absolute',
    bottom: 34,
    right: -14,
    alignItems: 'flex-end',
    zIndex: 50,
  },
  tooltipCard: {
    width: 228,
    backgroundColor: '#231712',
    borderWidth: 1,
    borderColor: 'rgba(228, 201, 169, 0.28)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#120B08',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tooltipEyebrow: {
    color: '#E4C9A9',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  tooltipBody: {
    color: '#F3E9DF',
    fontSize: 11.5,
    lineHeight: 16,
  },
  tooltipArrow: {
    width: 10,
    height: 10,
    backgroundColor: '#231712',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(228, 201, 169, 0.28)',
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
    marginRight: 22,
  },

  bio: {
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.muted,
    marginBottom: 14,
  },

  badgesRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 12,
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
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },

  priceGroup: {
    flexDirection: 'column',
    flexShrink: 1,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexShrink: 0,
  },
  viewProfile: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.accent,
    flexShrink: 0,
  },
});