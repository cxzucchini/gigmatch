import React, { useEffect, useState } from 'react';
import { View, Text, Image, Linking, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform, useWindowDimensions, Modal } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { theme } from '../../styles/theme';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import AppAlert from '../../components/AppAlert';
import SpotifyIcon from '../../components/icons/spotify';
import YoutubeMusicIcon from '../../components/icons/youtube-music';
import FacebookIcon from '../../components/icons/facebook';
import TiktokIcon from '../../components/icons/tiktok';
import InstagramIcon from '../../components/icons/instagram';
import { apiRequest } from '../../services/api';
import { isMongoId, normalizeMusician } from '../../utils/musician';
import { getUpcomingDates } from '../../utils/availability';

const SCALLOP_PATH =
  'M 50 7 C 54 7, 57 12, 61 13 C 65 14, 70 11, 74 13 C 77 15, 78 21, 81 24 C 84 27, 90 28, 92 31 C 94 35, 91 40, 92 44 C 93 48, 98 51, 98 55 C 98 59, 93 62, 92 66 C 91 70, 94 75, 92 79 C 90 82, 84 83, 81 86 C 78 89, 77 95, 74 97 C 70 99, 65 96, 61 97 C 57 98, 54 103, 50 103 C 46 103, 43 98, 39 97 C 35 96, 30 99, 26 97 C 23 95, 22 89, 19 86 C 16 83, 10 82, 8 79 C 6 75, 9 70, 8 66 C 7 62, 2 59, 2 55 C 2 51, 7 48, 8 44 C 9 40, 6 35, 8 31 C 10 28, 16 27, 19 24 C 22 21, 23 15, 26 13 C 30 11, 35 14, 39 13 C 43 12, 46 7, 50 7 Z';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

function VerifiedStickerBadge({ isVerified }) {
  if (Platform.OS === 'web') {
    const patternId = isVerified ? 'gm-detail-gold-stripes' : 'gm-detail-muted-fill';
    return React.createElement(
      'svg',
      {
        width: 36,
        height: 36,
        viewBox: '-6 -4 116 118',
        style: { display: 'block', overflow: 'visible' },
      },
      React.createElement(
        'defs',
        null,
        React.createElement(
          'pattern',
          { id: patternId, width: 6, height: 6, patternUnits: 'userSpaceOnUse' },
          React.createElement('rect', { width: 6, height: 6, fill: '#E3C18D' }),
          React.createElement('line', {
            x1: 0,
            y1: 3,
            x2: 6,
            y2: 3,
            stroke: '#CFA56B',
            strokeWidth: 1.8,
          })
        )
      ),
      React.createElement('path', {
        d: SCALLOP_PATH,
        fill: '#FBF9F6',
        stroke: '#FBF9F6',
        strokeWidth: 12,
        strokeLinejoin: 'round',
        transform: 'translate(2, 2)',
      }),
      React.createElement('path', {
        d: SCALLOP_PATH,
        fill: isVerified ? '#2D1E17' : '#B8ABA0',
        transform: 'translate(4, 5)',
      }),
      React.createElement('path', {
        d: SCALLOP_PATH,
        fill: isVerified ? `url(#${patternId})` : '#EFE9E1',
        stroke: isVerified ? '#35251D' : '#8C7E73',
        strokeWidth: 3.2,
        strokeLinejoin: 'round',
      }),
      React.createElement('path', {
        d: SCALLOP_PATH,
        fill: 'none',
        stroke: isVerified ? '#F8F3EC' : '#B8ABA0',
        strokeWidth: 1.6,
        transform: 'translate(8, 8.8) scale(0.84)',
      }),
      isVerified
        ? [
            React.createElement('polyline', {
              key: 'chk-shadow',
              points: '33,56 45,68 69,43',
              fill: 'none',
              stroke: '#2D1E17',
              strokeWidth: 8.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              transform: 'translate(1.5, 2)',
            }),
            React.createElement('polyline', {
              key: 'chk-main',
              points: '33,56 45,68 69,43',
              fill: 'none',
              stroke: '#35251D',
              strokeWidth: 8.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }),
          ]
        : React.createElement('line', {
            x1: 37,
            y1: 55,
            x2: 63,
            y2: 55,
            stroke: '#8C7E73',
            strokeWidth: 6.5,
            strokeLinecap: 'round',
          })
    );
  }

  return (
    <View style={[styles.nativeSealOuter, isVerified ? styles.nativeSealVerified : styles.nativeSealUnverified]}>
      <Text style={[styles.nativeSealIcon, !isVerified && styles.nativeSealIconMuted]}>
        {isVerified ? '✓' : '–'}
      </Text>
    </View>
  );
}

function formatTrackTime(seconds) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function PlaylistTrackRow({ track, trackKey, othersPlaying, onPlayStart }) {
  const player = useAudioPlayer({ uri: track.url });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (othersPlaying && status.playing) player.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [othersPlaying]);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    onPlayStart(trackKey);
    player.play();
  };

  const duration = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : 0;
  const progress = duration ? Math.min(100, Math.max(0, (status.currentTime / duration) * 100)) : 0;

  return (
    <View style={styles.trackRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${status.playing ? 'Pause' : 'Play'} ${track.title || 'sample track'}`}
        onPress={togglePlayback}
        style={styles.trackButton}
      >
        <Text style={styles.trackButtonText}>{status.playing ? '\u275A\u275A' : '\u25B6'}</Text>
      </Pressable>
      <View style={styles.trackMeta}>
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title || 'Untitled track'}</Text>
        <View style={styles.trackProgressBar}>
          <View style={[styles.trackProgressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.trackTime}>
          {formatTrackTime(status.currentTime)}{duration ? ` / ${formatTrackTime(duration)}` : ''}
        </Text>
      </View>
    </View>
  );
}

export default function ArtistDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('about');
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState({ unavailableDates: [], bookedDates: [] });
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [loading, setLoading] = useState(isMongoId(id));
  const [error, setError] = useState('');
  const [contactError, setContactError] = useState('');
  const [socialError, setSocialError] = useState('');
  const [showVerifiedTip, setShowVerifiedTip] = useState(false);
  const [badgeHovered, setBadgeHovered] = useState(false);
  const [activeTrackKey, setActiveTrackKey] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const artist = profile;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/');
    }
  };

  const socialEntries = Object.entries(artist?.socialLinks || {})
    .filter(([, url]) => typeof url === 'string' && url.trim());

  const infoColumns = width >= 900;
  const playlistTracks = Array.isArray(artist?.playlist) ? artist.playlist : [];

  const isVerified = Boolean(
    artist &&
      (artist.verified ||
        artist.isVerified ||
        artist.verificationStatus === 'approved' ||
        artist.verificationStatus === 'verified')
  );

  const verificationDetails = (() => {
    if (!artist) return { eyebrow: '', body: '' };
    if (isVerified) {
      return {
        eyebrow: '✦ VERIFIED ARTIST',
        body: 'Identity, live performance media, and booking details confirmed by Gigmatch.',
      };
    }
    if (artist.verificationStatus === 'pending') {
      return {
        eyebrow: '◌ VERIFICATION PENDING',
        body: 'This performer has submitted verification documents and is currently under Gigmatch review.',
      };
    }
    if (artist.verificationStatus === 'rejected') {
      return {
        eyebrow: '○ UNVERIFIED PROFILE',
        body: 'Identity verification was not approved. Please review profile details carefully before booking.',
      };
    }
    return {
      eyebrow: '○ UNVERIFIED PROFILE',
      body: 'This performer has not completed Gigmatch identity verification yet.',
    };
  })();

  const contactArtist = async () => {
    try {
      await Linking.openURL(`tel:${artist.contactPhone.replace(/[^\d+]/g, '')}`);
    } catch (linkError) {
      console.warn(`Could not open the artist contact number: ${linkError.message}`);
      setContactError('Could not open your phone app. You can call or text the number shown on this profile.');
    }
  };

  const openSocialLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (linkError) {
      console.warn(`Could not open the social link: ${linkError.message}`);
      setSocialError(`Could not open ${url}. Try copying the link into your browser.`);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      if (!isMongoId(id)) {
        setLoading(false);
        setError('');
        setProfile(null);
        return;
      }

      setLoading(true);
      return apiRequest(`/musicians/${id}`)
        .then((result) => {
          if (active) setProfile(normalizeMusician(result));
        })
        .catch((requestError) => {
          if (active) setError(requestError.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (activeTab !== 'availability' || !isMongoId(id)) return () => { active = false; };

    apiRequest(`/musicians/${id}/availability`)
      .then((result) => {
        if (active) setAvailability(result);
      })
      .catch((requestError) => {
        if (active) setAvailabilityError(requestError.message);
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => { active = false; };
  }, [activeTab, id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Discover" />
        <View style={styles.notFound}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!artist) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Discover" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>{error ? 'Profile unavailable' : 'Artist not found'}</Text>
          <Text style={styles.availabilityCopy}>{error || 'This artist profile could not be found.'}</Text>
          <Pressable onPress={handleBack} style={styles.bookBtn}><Text style={styles.bookText}>Go Back</Text></Pressable>
        </View>
        <AppAlert
          visible={Boolean(error)}
          title="Profile unavailable"
          message={error}
          onDismiss={() => setError('')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Discover" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={handleBack}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        </View>

        <View style={styles.heroBanner}>
          {Platform.OS === 'web' && artist.image ? (
            <Image
              source={{ uri: artist.image }}
              blurRadius={18}
              style={styles.heroBackdrop}
            />
          ) : null}
          {Platform.OS === 'web' ? <View style={styles.heroBackdropShade} /> : null}
          <Image
            source={{ uri: artist.image }}
            resizeMode="contain"
            style={styles.heroImage}
          />
        </View>

        <View style={styles.metaRow}>
          {artist.genre
            .split(/[/,]/)
            .map((g) => g.trim())
            .filter(Boolean)
            .map((genreItem) => (
              <View key={genreItem} style={styles.chip}>
                <Text style={styles.chipText}>{genreItem.toUpperCase()}</Text>
              </View>
            ))}
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{artist.name.toUpperCase()}</Text>

          <View
            style={styles.verifiedWrapper}
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
                }
              : {})}
          >
            <Pressable
              onPress={() => setShowVerifiedTip((prev) => !prev)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                isVerified
                  ? 'Verified artist badge. Tap or hover for details.'
                  : 'Profile verification status. Tap or hover for details.'
              }
              style={({ pressed }) => [
                styles.stickerButton,
                badgeHovered && styles.stickerHovered,
                pressed && styles.stickerPressed,
              ]}
            >
              <VerifiedStickerBadge isVerified={isVerified} />
            </Pressable>

            {showVerifiedTip ? (
              <View style={styles.tooltipContainer} pointerEvents="none">
                <View style={styles.tooltipCard}>
                  <Text style={styles.tooltipEyebrow}>{verificationDetails.eyebrow}</Text>
                  <Text style={styles.tooltipBody}>{verificationDetails.body}</Text>
                </View>
                <View style={styles.tooltipArrow} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.ratingText}>{artist.rating ? `${artist.rating.toFixed(1)}` : 'New artist'}</Text>
          <Text style={styles.divider}>|</Text>
          <Text style={styles.location}>{artist.location}</Text>
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Estimated price</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₱{artist.price.toLocaleString()}+ per set / 45 mins</Text>
          </View>
          <View style={styles.equipmentRow}>
            <Text style={styles.equipmentLabel}>Equipment:</Text>
            <Text style={styles.equipmentValue}>{artist.equipment ? '🔊 With Sound Equipment' : '🎤 Artist Only (Venue provides)'}</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <Pressable onPress={() => setActiveTab('about')} style={[styles.tab, activeTab === 'about' && styles.tabActive]}><Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>About</Text></Pressable>
          <Pressable onPress={() => { setAvailabilityError(''); setAvailabilityLoading(isMongoId(id)); setActiveTab('availability'); }} style={[styles.tab, activeTab === 'availability' && styles.tabActive]}><Text style={[styles.tabText, activeTab === 'availability' && styles.tabTextActive]}>Availability</Text></Pressable>
        </View>

        {activeTab === 'about' ? (
          <View style={[styles.infoBox, infoColumns && styles.infoBoxColumns]}>
            <View style={infoColumns ? styles.infoMainColumn : null}>
              <Text style={styles.infoLabel}>ABOUT THE ARTIST</Text>
              <Text style={styles.infoText}>{artist.description}</Text>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>GENRE</Text><Text style={styles.detailValue}>{artist.genre}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>BASED IN</Text><Text style={styles.detailValue}>{artist.location}</Text></View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>VERIFICATION</Text>
                <Text style={styles.detailValue}>
                  {isVerified
                    ? '✓ Verified by Gigmatch'
                    : artist.verificationStatus === 'pending'
                      ? 'Pending review'
                      : 'Not yet verified'}
                </Text>
              </View>
              {artist.contactPhone ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CONTACT</Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Call ${artist.name}`}
                    onPress={contactArtist}
                  >
                    <Text style={styles.contactValue}>{artist.contactPhone}</Text>
                  </Pressable>
                </View>
              ) : null}
              {socialEntries.length ? (
                <View style={styles.socialRow}>
                  <Text style={styles.detailLabel}>FIND THEM ONLINE</Text>
                  <View style={styles.socialLinks}>
                    {socialEntries.map(([platform, url]) => (
                      <Pressable
                        key={platform}
                        accessibilityRole="link"
                        accessibilityLabel={`Open ${artist.name} on ${platform}`}
                        onPress={() => openSocialLink(url)}
                        style={styles.socialPressable}
                      >
                        {platform === 'spotify' && <SpotifyIcon style={styles.socialIcon} />}
                        {platform === 'youtube' && <YoutubeMusicIcon style={styles.socialIcon} />}
                        {platform === 'facebook' && <FacebookIcon style={styles.socialIcon} />}
                        {platform === 'tiktok' && <TiktokIcon style={styles.socialIcon} />}
                        {platform === 'instagram' && <InstagramIcon style={styles.socialIcon} />}
                        <Text style={styles.socialLinkText}>{platform.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {artist?.gallery?.length ? (
                <View style={styles.galleryRow}>
                  <Text style={styles.detailLabel}>GALLERY</Text>
                  <View style={styles.galleryGrid}>
                    {artist.gallery.map((url, index) => (
                      <Pressable
                        key={url}
                        onPress={() => setLightboxUrl(url)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={`View photo ${index + 1} of ${artist.name}`}
                        style={({ hovered }) => [styles.galleryTilePressable, hovered ? styles.galleryTileHovered : null]}
                      >
                        <Image
                          source={{ uri: url }}
                          resizeMode="cover"
                          accessibilityRole="image"
                          accessibilityLabel={`${artist.name} gallery photo`}
                          style={styles.galleryTile}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
            <View style={infoColumns ? styles.playlistPanel : styles.playlistPanelStacked}>
              <Text style={styles.playlistPanelLabel}>PLAYLIST / SAMPLE TRACKS</Text>
              {playlistTracks.length ? (
                playlistTracks.map((track, index) => (
                  <PlaylistTrackRow
                    key={`${track.url || 'track'}-${index}`}
                    track={track}
                    trackKey={index}
                    othersPlaying={activeTrackKey !== null && activeTrackKey !== index}
                    onPlayStart={setActiveTrackKey}
                  />
                ))
              ) : (
                <Text style={styles.playlistEmpty}>This artist has not uploaded sample tracks yet.</Text>
              )}
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.availabilityCopy}>Dates marked unavailable are blocked by the musician. A confirmed booking may limit the available time; requests are checked before submission.</Text>
            {availabilityError ? <Text accessibilityRole="alert" style={styles.availabilityError}>{availabilityError}</Text> : null}
            <AppAlert
              visible={Boolean(availabilityError)}
              title="Availability unavailable"
              message={availabilityError}
              onDismiss={() => setAvailabilityError('')}
            />
            {availabilityLoading ? <ActivityIndicator color={theme.accent} /> : (
              <View style={styles.dateGrid}>
                {getUpcomingDates().map(({ dateValue, label }) => {
                  const blocked = availability.unavailableDates.includes(dateValue);
                  const hasBooking = availability.bookedDates.includes(dateValue);
                  return (
                    <Pressable
                      key={dateValue}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: blocked }}
                      accessibilityLabel={`${label}, ${blocked ? 'unavailable' : hasBooking ? 'has a confirmed booking' : 'open for requests'}`}
                      disabled={blocked}
                      onPress={() => router.push({ pathname: '/booking', params: { artistId: String(artist._id || artist.id), date: dateValue } })}
                      style={[styles.dateTag, blocked && styles.dateTagBlocked, hasBooking && !blocked && styles.dateTagBooked]}
                    >
                      <Text style={[styles.dateText, blocked && styles.dateTextBlocked]}>{label}</Text>
                      <Text style={[styles.dateStatus, blocked && styles.dateTextBlocked]}>{blocked ? 'Unavailable' : hasBooking ? 'Ask about time' : 'Open'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Pressable onPress={() => router.push({ pathname: '/booking', params: { artistId: String(artist._id || artist.id) } })} style={styles.bookBtn}><Text style={styles.bookText}>Request a Booking</Text></Pressable>
          </>
        )}
        <AppFooter />
      </ScrollView>
      <AppAlert
        visible={Boolean(error)}
        title="Profile unavailable"
        message={error}
        onDismiss={() => setError('')}
      />
      <AppAlert
        visible={Boolean(contactError)}
        title="Phone app unavailable"
        message={contactError}
        onDismiss={() => setContactError('')}
      />
      <AppAlert
        visible={Boolean(socialError)}
        title="Link unavailable"
        message={socialError}
        onDismiss={() => setSocialError('')}
      />
      <Modal
        visible={Boolean(lightboxUrl)}
        transparent
        animationType="none"
        onRequestClose={() => setLightboxUrl(null)}
      >
        <Pressable
          style={styles.lightboxScrim}
          onPress={() => setLightboxUrl(null)}
          accessibilityRole="button"
          accessibilityLabel="Close photo view"
        >
          <Image
            source={{ uri: lightboxUrl }}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel={`${artist.name} gallery photo enlarged`}
            style={styles.lightboxImage}
          />
          <Text style={styles.lightboxIndex}>
            {`${(artist.gallery || []).indexOf(lightboxUrl) + 1} / ${(artist.gallery || []).length}`}
          </Text>
        </Pressable>
        <Pressable
          style={styles.lightboxClose}
          onPress={() => setLightboxUrl(null)}
          accessibilityRole="button"
          accessibilityLabel="Close photo view"
        >
          <Text style={styles.lightboxCloseText}>✕</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    width: '92%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingTop: 18,
    paddingBottom: 0,
    flexGrow: 1,
  },
  topBar: {
    marginBottom: 16,
  },
  back: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  heroBanner: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#231712',
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    transform: [{ scale: 1.06 }],
  },
  heroBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 17, 13, 0.35)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    maxWidth: 296,
    maxHeight: 296,
    aspectRatio: 1,
    borderRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  chip: {
    backgroundColor: '#f5f2ee',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  activeChip: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  chipText: {
    color: theme.accent,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  activeChipText: {
    color: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    zIndex: 30,
  },
  name: {
    color: theme.accent,
    fontSize: 42,
    lineHeight: 46,
    fontFamily: SERIF_FONT,
    flexShrink: 1,
  },
  verifiedWrapper: {
    position: 'relative',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
  },
  stickerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerHovered: {
    transform: [{ scale: 1.1 }, { rotate: '-4deg' }],
  },
  stickerPressed: {
    transform: [{ scale: 0.94 }],
  },
  nativeSealOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nativeSealVerified: {
    backgroundColor: '#E3C18D',
    borderColor: '#35251D',
  },
  nativeSealUnverified: {
    backgroundColor: '#EFE9E1',
    borderColor: '#8C7E73',
  },
  nativeSealIcon: {
    color: '#35251D',
    fontSize: 14,
    fontWeight: '800',
  },
  nativeSealIconMuted: {
    color: '#8C7E73',
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: 44,
    left: -16,
    alignItems: 'flex-start',
    zIndex: 60,
  },
  tooltipCard: {
    width: 248,
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
    marginLeft: 28,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  star: {
    color: theme.star,
    fontSize: 22,
    marginRight: 8,
  },
  ratingText: {
    color: theme.accent,
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    marginHorizontal: 10,
    color: theme.muted,
    fontSize: 18,
  },
  location: {
    color: theme.muted,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceBox: {
    backgroundColor: '#f1ece4',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  priceLabel: {
    color: theme.muted,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  price: {
    color: theme.accent,
    fontSize: 30,
    fontFamily: SERIF_FONT,
    fontWeight: '700',
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  durationBadge: { backgroundColor: '#E8EFE4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  durationText: { fontSize: 11, color: theme.muted, fontWeight: '600' },
  equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  equipmentLabel: { fontSize: 12, color: theme.muted, fontWeight: '600' },
  equipmentValue: { fontSize: 12, color: '#333' },
  tabsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    backgroundColor: '#f5f2ee',
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  tabText: {
    color: theme.accent,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  tabTextActive: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#f5f2ee',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  infoText: {
    color: theme.accent,
    fontSize: 15,
    lineHeight: 24,
  },
  infoLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  detailValue: {
    color: theme.accent,
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  contactValue: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  socialRow: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginTop: 12,
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 9,
  },
  socialPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialIcon: {
    width: 16,
    height: 16,
  },
  socialLinkText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  galleryRow: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginTop: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  galleryTilePressable: {
    width: '31.8%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  galleryTileHovered: {
    opacity: 0.85,
  },
  lightboxScrim: {
    flex: 1,
    backgroundColor: 'rgba(26, 20, 15, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '92%',
    height: '82%',
  },
  lightboxIndex: {
    color: '#FBF9F6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 14,
  },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 249, 246, 0.45)',
    backgroundColor: 'rgba(26, 20, 15, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: {
    color: '#FBF9F6',
    fontSize: 15,
    fontWeight: '700',
  },
  galleryTile: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#EAE1D7',
  },
  infoBoxColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 22,
  },
  infoMainColumn: {
    flex: 1.75,
    minWidth: 0,
  },
  playlistPanel: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
    paddingLeft: 22,
  },
  playlistPanelStacked: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 14,
    marginTop: 16,
  },
  playlistPanelLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBF9F6',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  trackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  trackMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  trackTitle: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  trackProgressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EAE1D7',
    overflow: 'hidden',
  },
  trackProgressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.accent,
  },
  trackTime: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  playlistEmpty: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#FBF9F6',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  availabilityCopy: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: -8,
    marginBottom: 16,
  },
  availabilityError: { color: '#9B2C20', backgroundColor: '#F8E8E4', padding: 10, fontSize: 12, marginBottom: 12 },
  availabilityNote: {
    color: theme.muted,
    fontSize: 10,
    marginTop: -10,
    marginBottom: 14,
  },
  scheduleTitle: {
    color: theme.accent,
    fontSize: 24,
    fontFamily: SERIF_FONT,
    marginBottom: 18,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  dateTag: {
    flexBasis: '31%',
    minWidth: 110,
    backgroundColor: '#E8EFE4',
    borderWidth: 1,
    borderColor: '#C4D1BD',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  dateTagBlocked: { backgroundColor: '#F2E5E1', borderColor: '#D7B5AC', opacity: 0.75 },
  dateTagBooked: { backgroundColor: '#F6EEDC', borderColor: '#D9C89F' },
  dateText: {
    color: theme.accent,
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  dateStatus: { color: theme.muted, fontSize: 10, fontWeight: '600' },
  dateTextBlocked: { color: '#8D4C3E' },
  bookBtn: {
    alignSelf: 'center',
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 16,
    minWidth: 180,
    alignItems: 'center',
  },
  bookText: {
    color: '#fff',
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  notFoundTitle: {
    color: theme.accent,
    fontFamily: SERIF_FONT,
    fontSize: 28,
    marginBottom: 8,
  },
});