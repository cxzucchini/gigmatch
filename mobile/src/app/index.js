import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, TextInput, useWindowDimensions, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../styles/theme';
import ArtistCard from '../components/ArtistCard';
import OpenStreetMap from '../components/OpenStreetMap';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import AppAlert from '../components/AppAlert';
import HoverPressable from '../components/HoverPressable';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { normalizeMusician } from '../utils/musician';

const genres = ['Default', 'Jazz', 'Rock', 'RnB', 'Acoustic', 'Pop', 'OPM', 'Reggae', 'Classical'];
const prices = ['Default', 'High to Low', 'Low to High'];

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

export default function HomeScreen() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const searchYRef = useRef(0);
  const { width } = useWindowDimensions();
  const [selectedGenre, setSelectedGenre] = useState('Default');
  const [selectedPrice, setSelectedPrice] = useState('Default');
  const [query, setQuery] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [showNearbySearch, setShowNearbySearch] = useState(false);
  const [artists, setArtists] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [sortingLocation, setSortingLocation] = useState(false);
  const [distanceSorted, setDistanceSorted] = useState(false);
  const [mapOrigin, setMapOrigin] = useState(null);
  const [mapMode, setMapMode] = useState('list');
  const [sortedLocation, setSortedLocation] = useState('');
  const [locationError, setLocationError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const { token } = useAuth();
  const columns = width >= 980 ? 3 : width >= 640 ? 2 : 1;
  const compact = width < 640;
  const cardWidth = columns === 1 ? '100%' : columns === 2 ? '48.5%' : '31.8%';

  const loadArtists = useCallback(async () => {
    let nextArtists = [];
    let nextLoadError = '';
    try {
      const result = await apiRequest('/musicians?limit=30', { token });
      nextArtists = result.items.map(normalizeMusician);
    } catch (error) {
      nextLoadError = error.message;
    }

    setArtists(nextArtists);
    setLoadError(nextLoadError);
    setLocationError('');
    setDistanceSorted(false);
    setMapOrigin(null);
    setMapMode('list');
    setSortedLocation('');
    setEventLocation('');
    setLoadingArtists(false);
  }, [token]);

  const sortByLocation = async () => {
    const location = eventLocation.trim();
    if (!location) {
      const message = 'Enter the venue or city for your event to sort musicians by distance.';
      setLocationError(message);
      setAlertMessage(message);
      return;
    }

    setSortingLocation(true);
    setLocationError('');
    try {
      const result = await apiRequest(`/musicians?limit=30&near=${encodeURIComponent(location)}`, { token });
      setArtists(result.items.map(normalizeMusician));
      setLoadError('');
      setSelectedPrice('Default');
      setMapOrigin(result.origin);
      setSortedLocation(location);
      setMapMode('map');
      setDistanceSorted(true);
      setShowNearbySearch(true);
    } catch (requestError) {
      setLocationError(requestError.message);
      setAlertMessage(requestError.message);
    } finally {
      setSortingLocation(false);
    }
  };

  useEffect(() => {
    // The async loader updates state only after its API request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadArtists();
  }, [loadArtists]);

  const filteredArtists = useMemo(() => {
    let list = [...artists];
    if (selectedGenre !== 'Default') {
      list = list.filter((artist) => artist.genre.toLowerCase().includes(selectedGenre.toLowerCase()));
    }
    if (query.trim()) {
      const search = query.trim().toLowerCase();
      list = list.filter((artist) =>
        `${artist.name} ${artist.genre}`.toLowerCase().includes(search),
      );
    }
    if (!distanceSorted && selectedPrice === 'High to Low') list.sort((a, b) => b.price - a.price);
    if (!distanceSorted && selectedPrice === 'Low to High') list.sort((a, b) => a.price - b.price);
    return list;
  }, [artists, query, selectedGenre, selectedPrice, distanceSorted]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Discover" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=85' }}
          imageStyle={styles.heroImage}
          style={[styles.hero, compact && styles.compactHero]}
        >
          <View style={styles.heroShade} />
          <Text
            style={[
              styles.eyebrow,
              compact && styles.compactEyebrow,
              { color: compact ? '#F8F3EC' : '#E4C9A9' },
            ]}
          >
            LIVE MUSIC, BEAUTIFULLY MATCHED
          </Text>
          <Text style={[styles.heroTitle, compact && styles.compactHeroTitle]}>Find the perfect{'\n'}artist for your event.</Text>
          <Text style={[styles.heroCopy, compact && styles.compactHeroCopy]}>Discover talented local performers, compare styles and rates, and make your next gathering unforgettable.</Text>
          <HoverPressable
            accessibilityRole="button"
            accessibilityLabel="Explore artists and search musicians"
            onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, searchYRef.current - 20), animated: true })}
            style={styles.heroButton}
            hoverStyle={styles.heroButtonHovered}
            pressedStyle={styles.heroButtonPressed}
          >
            <Text style={styles.heroButtonText}>Explore artists  →</Text>
          </HoverPressable>
          {!compact ? <View style={styles.heroNote}><Text style={styles.heroNoteText}>CURATED TALENT  ·  MADE FOR YOUR MOMENT</Text></View> : null}
        </ImageBackground>

        <View nativeID="artists" style={[styles.sectionIntro, compact && styles.compactSectionIntro]}>
          <Text style={styles.kicker}>THE GIGMATCH COLLECTION</Text>
          <Text style={styles.sectionTitle}>A sound for every occasion</Text>
          <Text style={styles.sectionCopy}>From an intimate acoustic set to a full dance-floor band, discover artists who make the moment.</Text>
        </View>

        <View style={styles.searchBox} onLayout={(event) => { searchYRef.current = event.nativeEvent.layout.y; }}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search artists or genres"
            placeholderTextColor={theme.muted}
            style={styles.searchInput}
            accessibilityLabel="Search artists or genres"
          />
        </View>

        <View style={styles.nearbySection}>
          <HoverPressable
            accessibilityRole="button"
            accessibilityLabel={showNearbySearch ? 'Hide location search' : 'Show location search'}
            accessibilityHint="Enter your event venue or city to sort musicians by distance."
            accessibilityState={{ expanded: showNearbySearch }}
            onPress={() => setShowNearbySearch((visible) => !visible)}
            style={styles.nearbyToggle}
            hoverStyle={styles.controlHovered}
          >
            <View style={styles.nearbyToggleCopy}>
              <Text style={styles.nearbyToggleTitle}>Find musicians by distance</Text>
              <Text style={styles.nearbyToggleSubtitle}>
                {distanceSorted ? `Showing musicians near ${sortedLocation}` : 'Enter a venue or city to see who is closest'}
              </Text>
            </View>
            <Text style={styles.nearbyToggleAction}>{showNearbySearch ? 'HIDE −' : 'SHOW +'}</Text>
          </HoverPressable>
          {showNearbySearch ? (
            <View style={styles.locationSearch}>
              <View style={styles.locationControls}>
                <TextInput
                  value={eventLocation}
                  onChangeText={setEventLocation}
                  placeholder="Enter venue or city"
                  placeholderTextColor={theme.muted}
                  style={styles.locationInput}
                  accessibilityLabel="Event venue or city for distance sorting"
                  accessibilityHint="Your venue or city is used for an approximate location lookup."
                  returnKeyType="search"
                  onSubmitEditing={sortByLocation}
                />
                <HoverPressable
                  onPress={sortByLocation}
                  disabled={sortingLocation}
                  style={[styles.locationButton, sortingLocation && styles.locationButtonDisabled]}
                  hoverStyle={styles.primaryButtonHovered}
                >
                  {sortingLocation
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.locationButtonText}>Sort by distance</Text>}
                </HoverPressable>
                {distanceSorted ? (
                  <HoverPressable
                    accessibilityRole="button"
                    accessibilityLabel="Show all musicians"
                    onPress={() => { setLoadingArtists(true); loadArtists(); }}
                    style={styles.clearLocationButton}
                    hoverStyle={styles.controlHovered}
                  >
                    <Text style={styles.clearLocation}>Show all musicians</Text>
                  </HoverPressable>
                ) : null}
              </View>
              <View style={styles.locationPrivacyNote}>
                <Text style={styles.locationPrivacy}>Your venue or city is sent to OpenStreetMap Nominatim for an approximate lookup. Musician pins show general service areas, not exact addresses. © OpenStreetMap contributors.</Text>
              </View>
              {locationError ? <Text accessibilityRole="alert" style={styles.locationError}>{locationError}</Text> : null}
              {distanceSorted ? (
                <Text style={styles.locationSuccess}>Profiles without a mapped service area appear last.</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>EXPLORE BY GENRE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {genres.map((genre) => {
              const active = selectedGenre === genre;
              return (
                <HoverPressable key={genre} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedGenre(genre)} style={[styles.chip, active && styles.chipSelected]} hoverStyle={styles.chipHovered}>
                  <Text style={[styles.chipText, active && styles.chipTextSelected]}>{genre}</Text>
                </HoverPressable>
              );
            })}
          </ScrollView>
          <View style={styles.sortRow}>
            <Text style={styles.filterLabel}>SORT BY PRICE</Text>
            <View style={styles.priceOptions}>
              {prices.map((price) => {
                const active = selectedPrice === price;
                return (
                  <HoverPressable key={price} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { setSelectedPrice(price); setDistanceSorted(false); setMapMode('list'); }} style={[styles.sortChip, active && styles.sortChipSelected]} hoverStyle={styles.chipHovered}>
                    <Text style={[styles.sortText, active && styles.chipTextSelected]}>{price}</Text>
                  </HoverPressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.resultsHeading}>
          <View>
            <Text style={styles.kicker}>AVAILABLE PERFORMERS</Text>
            <Text style={styles.resultsTitle}>{selectedGenre === 'Default' ? 'Featured artists' : `${selectedGenre} artists`}</Text>
          </View>
          <View style={styles.resultsActions}>
            <Text style={styles.resultCount}>{loadingArtists ? 'LOADING' : `${filteredArtists.length} ARTISTS`}</Text>
            {distanceSorted ? (
              <View style={styles.viewToggle}>
                {['map', 'list'].map((view) => (
                  <HoverPressable
                    key={view}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mapMode === view }}
                    onPress={() => setMapMode(view)}
                    style={[styles.viewToggleButton, mapMode === view && styles.viewToggleButtonSelected]}
                    hoverStyle={styles.toggleHovered}
                  >
                    <Text style={[styles.viewToggleText, mapMode === view && styles.viewToggleTextSelected]}>{view.toUpperCase()}</Text>
                  </HoverPressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        {loadError ? (
          <View style={styles.dataNotice}>
            <Text style={styles.dataNote}>{loadError}</Text>
            <HoverPressable onPress={() => { setLoadingArtists(true); loadArtists(); }} hoverStyle={styles.textButtonHovered}><Text style={styles.retryText}>RETRY</Text></HoverPressable>
          </View>
        ) : null}
        {distanceSorted && mapMode === 'map' ? (
          <View style={styles.mapContainer}>
            <View style={styles.mapLegend}>
              <Text style={styles.mapLegendText}><Text style={styles.eventLegendDot}>●</Text> Event</Text>
              <Text style={styles.mapLegendText}><Text style={styles.musicianLegendDot}>●</Text> Nearby musician</Text>
            </View>
            <OpenStreetMap origin={mapOrigin} musicians={filteredArtists} />
            <Text style={styles.mapNote}>
              {filteredArtists.some((artist) => artist.mapCoordinates)
                ? 'Musician pins show approximate service-area locations. Unmapped profiles are not shown on the map.'
                : 'No musicians in these results have a mapped service area yet.'}
            </Text>
          </View>
        ) : null}
        <View style={styles.grid}>
          {loadingArtists ? <ActivityIndicator color={theme.accent} style={styles.loading} /> : null}
          {filteredArtists.map((artist) => (
            <View key={artist.id} style={[styles.cardWrap, { width: cardWidth }]}>
              <ArtistCard
                artist={artist}
                showDistance={distanceSorted}
                distance={artist.distance ?? artist.distanceKm ?? artist.distance_km}
              />
            </View>
          ))}
          {/* Centered grid: fillers are not needed with justifyContent: 'center' */}
          {Array.from({ length: columns > 1 ? (columns - (filteredArtists.length % columns)) % columns : 0 }).map((_, index) => (
            <View key={`filler-${index}`} style={[styles.cardWrap, { width: cardWidth }]} aria-hidden="true" />
          ))}
          {filteredArtists.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No artists found</Text>
              <Text style={styles.sectionCopy}>Try another genre or search term.</Text>
            </View>
          )}
        </View>

        <View style={styles.callout}>
          <Text style={styles.kickerLight}>YOUR STAGE IS WAITING</Text>
          <Text style={styles.calloutTitle}>Are you an artist?</Text>
          <Text style={styles.calloutCopy}>Share your sound with clients looking for their next unforgettable performance.</Text>
          <HoverPressable onPress={() => router.push('/about')} style={styles.calloutButton} hoverStyle={styles.primaryButtonHovered}>
            <Text style={styles.calloutButtonText}>Discover Gigmatch</Text>
          </HoverPressable>
        </View>
        <AppFooter />
      </ScrollView>
      <AppAlert
        visible={Boolean(alertMessage)}
        title="Location search"
        message={alertMessage}
        onDismiss={() => { setAlertMessage(''); setLocationError(''); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  container: { paddingBottom: 0, flexGrow: 1 },
  hero: { width: '96%', maxWidth: 1360, minHeight: 470, alignSelf: 'center', marginTop: 16, padding: 34, justifyContent: 'center', overflow: 'hidden', backgroundColor: theme.accentDark },
  compactHero: { minHeight: 370, padding: 24 },
  heroImage: { borderRadius: 4, opacity: 0.55 },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 14, 11, 0.72)',
  },
  eyebrow: {
    color: '#E4C9A9',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  compactEyebrow: {
    color: '#F8F3EC',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitle: { color: '#F8F3EC', fontFamily: SERIF_FONT, fontSize: 48, lineHeight: 54, maxWidth: 660 },
  compactHeroTitle: { fontSize: 36, lineHeight: 41 },
  heroCopy: { color: '#F3E9DF', fontSize: 16, lineHeight: 25, maxWidth: 470, marginTop: 14, marginBottom: 24 },
  compactHeroCopy: { fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 18 },
  heroButton: { backgroundColor: '#F6F1EA', paddingVertical: 15, paddingHorizontal: 22, borderRadius: 28, alignSelf: 'flex-start' },
  heroButtonHovered: { transform: [{ translateY: -2 }], shadowColor: '#1F1712', shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  heroButtonPressed: { opacity: 0.88, transform: [{ translateY: 0 }] },
  heroButtonText: { color: theme.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  heroNote: { position: 'absolute', right: 24, bottom: 20 },
  heroNoteText: { color: '#E4C9A9', fontSize: 9, letterSpacing: 1.8 },
  sectionIntro: { maxWidth: 680, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 62, paddingBottom: 26 },
  compactSectionIntro: { paddingTop: 34, paddingBottom: 18 },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  sectionTitle: { color: theme.accent, fontFamily: SERIF_FONT, fontSize: 34, textAlign: 'center' },
  sectionCopy: { color: theme.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 560, marginTop: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', maxWidth: 720, width: '90%', alignSelf: 'center', backgroundColor: theme.panelSoft, borderColor: theme.border, borderWidth: 1, borderRadius: 4, paddingHorizontal: 16, marginVertical: 14 },
  searchIcon: { color: theme.accent, fontSize: 26, marginRight: 10 },
  searchInput: { flex: 1, height: 48, color: theme.text, fontSize: 14 },
  nearbySection: { width: '90%', maxWidth: 720, alignSelf: 'center', marginBottom: 12 },
  nearbyToggle: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: '#EAE1D7' },
  controlHovered: { borderColor: theme.accent, transform: [{ translateY: -1 }] },
  nearbyToggleCopy: { flex: 1 },
  nearbyToggleTitle: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  nearbyToggleSubtitle: { color: theme.muted, fontSize: 11, marginTop: 3 },
  nearbyToggleAction: { color: theme.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  locationSearch: { padding: 14, borderWidth: 1, borderTopWidth: 0, borderColor: theme.border, backgroundColor: '#F6F1EA' },
  locationControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locationInput: { flexGrow: 1, flexBasis: 240, height: 48, borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingHorizontal: 12, color: theme.text, fontSize: 13 },
  locationButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.accent, paddingHorizontal: 18 },
  locationButtonDisabled: { opacity: 0.65 },
  primaryButtonHovered: { backgroundColor: theme.accentDark, transform: [{ translateY: -2 }], shadowColor: '#35251D', shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  locationButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  locationPrivacyNote: { backgroundColor: '#EAE1D7', borderLeftWidth: 3, borderLeftColor: theme.accent, padding: 12, marginTop: 10 },
  locationPrivacy: { color: theme.text, fontSize: 12, lineHeight: 18 },
  clearLocationButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  clearLocation: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  locationError: { color: '#9B2C20', fontSize: 11, lineHeight: 16, marginTop: 8 },
  locationSuccess: { color: theme.accent, fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 8 },
  filterBlock: { maxWidth: 1100, width: '90%', alignSelf: 'center', paddingVertical: 18 },
  filterLabel: { color: theme.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 10 },
  chipScroll: { gap: 9, paddingHorizontal: 5, paddingVertical: 6 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 17, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FBF9F6', borderColor: theme.border, borderWidth: 1 },
  chipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipHovered: { borderColor: theme.accent, transform: [{ translateY: -2 }], shadowColor: '#35251D', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  chipText: { color: theme.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  chipTextSelected: { color: '#fff' },
  sortRow: { marginTop: 16 },
  priceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
  sortChipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  sortText: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  resultsHeading: { maxWidth: 1100, width: '90%', alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 14 },
  resultsTitle: { color: theme.accent, fontFamily: SERIF_FONT, fontSize: 28 },
  resultCount: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 3 },
  resultsActions: { alignItems: 'flex-end', gap: 8 },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderColor: theme.border },
  viewToggleButton: { paddingVertical: 7, paddingHorizontal: 11 },
  viewToggleButtonSelected: { backgroundColor: theme.accent },
  toggleHovered: { opacity: 0.78 },
  viewToggleText: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  viewToggleTextSelected: { color: '#fff' },
  dataNote: { color: theme.muted, fontSize: 10, lineHeight: 16, flex: 1 },
  dataNotice: { maxWidth: 1100, width: '90%', alignSelf: 'center', backgroundColor: '#EAE1D7', padding: 12, marginTop: -10, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  retryText: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  textButtonHovered: { opacity: 0.72 },
  loading: { width: '100%', marginBottom: 24 },
  grid: { maxWidth: 1100, width: '90%', alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 20 },
  gridItem: { gap: 24 },
  mapContainer: { maxWidth: 1100, width: '90%', alignSelf: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.panelSoft, padding: 8, marginBottom: 24 },
  mapLegend: { flexDirection: 'row', gap: 16, paddingHorizontal: 8, paddingVertical: 9 },
  mapLegendText: { color: theme.muted, fontSize: 11 },
  eventLegendDot: { color: '#365B73' },
  musicianLegendDot: { color: '#9A5C38' },
  mapNote: { color: theme.muted, fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  cardWrap: { minWidth: 0 },
  emptyState: { width: '100%', paddingVertical: 44, alignItems: 'center' },
  emptyTitle: { color: theme.accent, fontFamily: SERIF_FONT, fontSize: 24 },
  callout: { width: '96%', maxWidth: 1360, alignSelf: 'center', backgroundColor: theme.accent, marginTop: 18, paddingVertical: 40, paddingHorizontal: 28, alignItems: 'center', borderRadius: 4 },
  kickerLight: { color: '#E4C9A9', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  calloutTitle: { color: '#fff', fontFamily: SERIF_FONT, fontSize: 32, marginTop: 12 },
  calloutCopy: { color: '#F1E8DF', textAlign: 'center', maxWidth: 500, lineHeight: 22, marginTop: 8 },
  calloutButton: { backgroundColor: '#F6F1EA', paddingVertical: 13, paddingHorizontal: 22, borderRadius: 24, marginTop: 22 },
  calloutButtonText: { color: theme.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  footerText: { textAlign: 'center', color: theme.muted, fontSize: 9, letterSpacing: 1.6, marginTop: 32 },
});