import React, { useEffect, useState } from 'react';
import { View, Text, Image, Linking, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../styles/theme';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import AppAlert from '../../components/AppAlert';
import { apiRequest } from '../../services/api';
import { getDemoMusician, isMongoId, normalizeMusician } from '../../utils/musician';
import { getUpcomingDates } from '../../utils/availability';

export default function ArtistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('about');
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState({ unavailableDates: [], bookedDates: [] });
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [loading, setLoading] = useState(isMongoId(id));
  const [error, setError] = useState('');
  const [contactError, setContactError] = useState('');
  const demoArtist = getDemoMusician(id);
  const artist = profile || demoArtist;

  const contactArtist = async () => {
    try {
      await Linking.openURL(`tel:${artist.contactPhone.replace(/[^\d+]/g, '')}`);
    } catch (linkError) {
      console.warn(`Could not open the artist contact number: ${linkError.message}`);
      setContactError('Could not open your phone app. You can call or text the number shown on this profile.');
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
          <Pressable onPress={() => router.back()} style={styles.bookBtn}><Text style={styles.bookText}>Go Back</Text></Pressable>
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
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        </View>

        <Image source={{ uri: artist.image }} style={styles.heroImage} />

        <View style={styles.metaRow}>
          <Pressable style={styles.chip}><Text style={styles.chipText}>{artist.genre.split('/')[0].trim().toUpperCase()}</Text></Pressable>
          <Pressable style={styles.chip}><Text style={styles.chipText}>{artist.genre.split('/')[1]?.trim().toUpperCase() || 'FEATURED'}</Text></Pressable>
          <Pressable style={[styles.chip, styles.activeChip]}><Text style={[styles.chipText, styles.activeChipText]}>Featured</Text></Pressable>
        </View>

        <Text style={styles.name}>{artist.name.toUpperCase()}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.ratingText}>{artist.rating ? `${artist.rating.toFixed(1)} · sample rating` : 'New artist'}</Text>
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
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>ABOUT THE ARTIST</Text>
            <Text style={styles.infoText}>{artist.description}</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>GENRE</Text><Text style={styles.detailValue}>{artist.genre}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>BASED IN</Text><Text style={styles.detailValue}>{artist.location}</Text></View>
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
          </View>
        ) : (
          <>
            <Text style={styles.scheduleTitle}>Available dates for upcoming bookings</Text>
            {demoArtist ? (
              <>
                <Text style={styles.availabilityCopy}>Preview dates only. The artist confirms availability after a request.</Text>
                <View style={styles.dateGrid}>
                  {getUpcomingDates().map(({ dateValue, label }, index) => (
                    <Pressable
                      key={dateValue}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview booking for ${label}`}
                      onPress={() => router.push({ pathname: '/booking', params: { artistId: String(artist.id), date: dateValue, preview: '1' } })}
                      style={[styles.dateTag, index % 2 === 0 && styles.dateTagAlt]}
                    >
                      <Text style={styles.dateText}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
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
              </>
            )}
            {isMongoId(String(artist._id || artist.id)) ? (
              <Pressable onPress={() => router.push({ pathname: '/booking', params: { artistId: String(artist._id || artist.id) } })} style={styles.bookBtn}><Text style={styles.bookText}>Request a Booking</Text></Pressable>
            ) : (
              <Pressable
                onPress={() => router.push({ pathname: '/booking', params: { artistId: String(artist.id), preview: '1' } })}
                style={styles.bookBtn}
              >
                <Text style={styles.bookText}>Preview booking request</Text>
              </Pressable>
            )}
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
  heroImage: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
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
  name: {
    color: theme.accent,
    fontSize: 42,
    lineHeight: 46,
    fontFamily: 'Georgia',
    marginBottom: 12,
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
      fontFamily: 'Georgia',
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
    fontFamily: 'Georgia',
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
  dateTagAlt: { backgroundColor: '#F5F2EE' },
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
    fontFamily: 'Georgia',
    fontSize: 28,
    marginBottom: 8,
  },
});
