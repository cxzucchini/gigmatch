import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../styles/theme';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import AppAlert from '../../components/AppAlert';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatTimeFromMinute } from '../../utils/bookingDateTime';

const SCALLOP_PATH =
  'M 50 7 C 54 7, 57 12, 61 13 C 65 14, 70 11, 74 13 C 77 15, 78 21, 81 24 C 84 27, 90 28, 92 31 C 94 35, 91 40, 92 44 C 93 48, 98 51, 98 55 C 98 59, 93 62, 92 66 C 91 70, 94 75, 92 79 C 90 82, 84 83, 81 86 C 78 89, 77 95, 74 97 C 70 99, 65 96, 61 97 C 57 98, 54 103, 50 103 C 46 103, 43 98, 39 97 C 35 96, 30 99, 26 97 C 23 95, 22 89, 19 86 C 16 83, 10 82, 8 79 C 6 75, 9 70, 8 66 C 7 62, 2 59, 2 55 C 2 51, 7 48, 8 44 C 9 40, 6 35, 8 31 C 10 28, 16 27, 19 24 C 22 21, 23 15, 26 13 C 30 11, 35 14, 39 13 C 43 12, 46 7, 50 7 Z';

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const formatMonthYear = (date) => new Date(date).toLocaleDateString(undefined, {
  month: 'long',
  year: 'numeric',
});

function VerifiedStickerBadge({ isVerified }) {
  if (Platform.OS === 'web') {
    const patternId = isVerified ? 'gm-client-gold-stripes' : 'gm-client-muted-fill';
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

export default function ClientProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [viewerIsMusician, setViewerIsMusician] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVerifiedTip, setShowVerifiedTip] = useState(false);
  const [badgeHovered, setBadgeHovered] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token || !id) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError('');
    apiRequest(`/users/${id}/profile`, { token })
      .then((result) => {
        if (!active) return;
        setProfile(result.profile);
        setSummary(result.summary);
        setBookings(result.bookings || []);
        setViewerIsMusician(Boolean(result.viewerIsMusician));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, token]);

  const isVerified = Boolean(
    profile && (profile.isVerified || profile.idVerification?.status === 'approved')
  );

  const verificationDetails = (() => {
    if (!profile) return { eyebrow: '', body: '' };
    if (isVerified) {
      return {
        eyebrow: '✦ VERIFIED HOST',
        body: 'This host has completed Gigmatch identity verification.',
      };
    }
    if (profile.idVerification?.status === 'pending') {
      return {
        eyebrow: '◌ VERIFICATION PENDING',
        body: 'This host has submitted an ID document and is currently under Gigmatch review.',
      };
    }
    return {
      eyebrow: '○ UNVERIFIED PROFILE',
      body: 'This host has not completed Gigmatch identity verification yet.',
    };
  })();

  const verificationValue = (() => {
    if (!profile) return '—';
    if (isVerified) {
      return `✓ Verified by Gigmatch${profile.idVerification?.idDocumentType ? ` (${profile.idVerification.idDocumentType})` : ''}`;
    }
    if (profile.idVerification?.status === 'pending') return 'Pending review';
    return 'Not yet verified';
  })();

  if (authLoading || (loading && token)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Bookings" />
        <View style={styles.notFound}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Bookings" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Sign in to view profiles</Text>
          <Pressable onPress={() => router.push('/auth')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Bookings" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>{error ? 'Profile unavailable' : 'Client not found'}</Text>
          <Text style={styles.infoText}>{error || 'This client profile could not be found.'}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
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
      <AppHeader active="Bookings" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>EVENT HOST</Text>
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.name}</Text>

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
                  ? 'Verified host badge. Tap or hover for details.'
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
          <Text style={styles.memberSince}>Member since {formatMonthYear(profile.memberSince)}</Text>
          {summary ? (
            <>
              <Text style={styles.divider}>|</Text>
              <Text style={styles.memberMeta}>
                {isVerified ? '✓ ID verified' : 'ID not verified'}
              </Text>
            </>
          ) : null}
        </View>

        {summary ? (
          <View style={styles.statsBox}>
            <Text style={styles.statsLabel}>{viewerIsMusician ? 'YOUR EVENTS TOGETHER' : 'BOOKING ACTIVITY'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.upcoming}</Text>
                <Text style={styles.statCaption}>Upcoming</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.completed}</Text>
                <Text style={styles.statCaption}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.totalBookings}</Text>
                <Text style={styles.statCaption}>{viewerIsMusician ? 'With you' : 'Total'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>HOST DETAILS</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>MEMBER SINCE</Text>
            <Text style={styles.detailValue}>{formatMonthYear(profile.memberSince)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID VERIFICATION</Text>
            <Text style={styles.detailValue}>{verificationValue}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {viewerIsMusician ? 'Your bookings with this host' : 'Bookings'}
        </Text>
        {bookings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyCopy}>
              {viewerIsMusician
                ? 'No bookings with this host yet. When they book you, the events will appear here.'
                : 'No bookings yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {bookings.map((booking) => (
              <View key={booking._id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View>
                    <Text style={styles.eventType}>{booking.eventType}</Text>
                    <Text style={styles.bookingDate}>
                      {formatDate(booking.eventDate)} · {formatTimeFromMinute(booking.startMinute)}
                    </Text>
                  </View>
                  <Text style={[styles.status, styles[`status_${booking.status}`]]}>
                    {booking.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.detail, styles.detailMuted]}>
                  {booking.venue} · {booking.serviceArea}
                </Text>
                <Text style={styles.detail}>
                  {booking.durationHours} hour{booking.durationHours === 1 ? '' : 's'}
                  {booking.budget != null ? ` · ₱${booking.budget.toLocaleString()} budget` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
        <AppFooter />
      </ScrollView>
      <AppAlert
        visible={Boolean(error)}
        title="Profile unavailable"
        message={error}
        onDismiss={() => setError('')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  container: { width: '92%', maxWidth: 780, alignSelf: 'center', paddingTop: 18, paddingBottom: 0, flexGrow: 1 },
  topBar: { marginBottom: 16 },
  back: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  chip: {
    backgroundColor: '#f5f2ee',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipText: { color: theme.accent, textTransform: 'uppercase', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12, zIndex: 30 },
  name: { color: theme.accent, fontSize: 38, lineHeight: 42, fontFamily: 'Georgia', flexShrink: 1 },
  verifiedWrapper: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center', zIndex: 40 },
  stickerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stickerHovered: { transform: [{ scale: 1.1 }, { rotate: '-4deg' }] },
  stickerPressed: { transform: [{ scale: 0.94 }] },
  nativeSealOuter: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  nativeSealVerified: { backgroundColor: '#E3C18D', borderColor: '#35251D' },
  nativeSealUnverified: { backgroundColor: '#EFE9E1', borderColor: '#8C7E73' },
  nativeSealIcon: { color: '#35251D', fontSize: 14, fontWeight: '800' },
  nativeSealIconMuted: { color: '#8C7E73' },
  tooltipContainer: { position: 'absolute', bottom: 44, left: -16, alignItems: 'flex-start', zIndex: 60 },
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
  tooltipEyebrow: { color: '#E4C9A9', fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, marginBottom: 4 },
  tooltipBody: { color: '#F3E9DF', fontSize: 11.5, lineHeight: 16 },
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 },
  memberSince: { color: theme.accent, fontSize: 16, fontWeight: '600' },
  divider: { marginHorizontal: 10, color: theme.muted, fontSize: 18 },
  memberMeta: { color: theme.muted, fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.8 },
  statsBox: {
    backgroundColor: '#f1ece4',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  statsLabel: { color: theme.muted, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 12 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { flex: 1, minWidth: 90, backgroundColor: '#FBF9F6', borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  statValue: { color: theme.accent, fontSize: 26, fontFamily: 'Georgia', fontWeight: '700' },
  statCaption: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  infoBox: {
    backgroundColor: '#f5f2ee',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  infoLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4 },
  infoText: { color: theme.muted, fontSize: 13, lineHeight: 20, marginBottom: 14, textAlign: 'center' },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  detailValue: { color: theme.accent, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  sectionTitle: { color: theme.accent, fontSize: 24, fontFamily: 'Georgia', marginBottom: 14 },
  list: { gap: 14, marginBottom: 24 },
  bookingCard: { backgroundColor: '#F6F1EA', borderWidth: 1, borderColor: theme.border, padding: 16 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  eventType: { color: theme.accent, fontFamily: 'Georgia', fontSize: 18, textTransform: 'capitalize' },
  bookingDate: { color: theme.muted, fontSize: 12, marginTop: 5 },
  status: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, paddingVertical: 6, paddingHorizontal: 9, overflow: 'hidden', borderRadius: 12, backgroundColor: '#EAE1D7', color: theme.accent },
  status_pending: { backgroundColor: '#FEF9C3', color: '#713F12', borderWidth: 1, borderColor: '#FDE047' },
  status_accepted: { backgroundColor: '#E1E9D9', color: '#36543B', borderWidth: 1, borderColor: '#BBE1C3' },
  status_rejected: { backgroundColor: '#F4E4DF', color: '#8D3A2D', borderWidth: 1, borderColor: '#FCA5A5' },
  status_cancelled: { backgroundColor: '#FEF08A', color: '#854D0E', borderWidth: 1, borderColor: '#CA8A04' },
  status_completed: { backgroundColor: '#E6E0D5', color: theme.accent, borderWidth: 1, borderColor: '#D4C9B8' },
  detail: { color: theme.accent, fontSize: 13, lineHeight: 20 },
  detailMuted: { color: theme.muted },
  emptyBox: { alignItems: 'center', backgroundColor: '#F6F1EA', borderWidth: 1, borderColor: theme.border, padding: 20, marginBottom: 24 },
  emptyCopy: { color: theme.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  backBtn: { alignSelf: 'center', backgroundColor: theme.accent, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14, minWidth: 160, alignItems: 'center' },
  backBtnText: { color: '#fff', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  notFoundTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 28, marginBottom: 8 },
});
