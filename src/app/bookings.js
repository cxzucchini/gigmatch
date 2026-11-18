import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import AppAlert from '../components/AppAlert';
import OpenStreetMap from '../components/OpenStreetMap';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { theme } from '../styles/theme';
import { formatTimeFromMinute } from '../utils/bookingDateTime';

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const getPreviewBookings = () => {
  const dateAfterDays = (days) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  };
  return [
    {
      _id: 'preview-booking-1',
      eventType: 'Garden wedding',
      eventDate: dateAfterDays(8),
      startMinute: 1020,
      status: 'accepted',
      musician: { user: { name: 'The Shoreline Duo' } },
      client: { name: 'Jamie Cruz' },
      venue: 'Fernwood Gardens',
      serviceArea: 'Quezon City',
      durationHours: 2,
      budget: 12000,
      notes: 'Acoustic set for the reception.',
    },
    {
      _id: 'preview-booking-2',
      eventType: 'Birthday celebration',
      eventDate: dateAfterDays(16),
      startMinute: 1140,
      status: 'pending',
      musician: { user: { name: 'Luna Reyes' } },
      client: { name: 'Jamie Cruz' },
      venue: 'The Glasshouse',
      serviceArea: 'Makati',
      durationHours: 3,
      budget: 18000,
      notes: 'A mix of modern pop and R&B.',
    },
  ];
};

export default function BookingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;
  const paddingSize = isNarrow ? 14 : 18;
  const textSizeTitle = isNarrow ? 28 : 38;
  const previewMode = params.preview === '1' && !user;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [pendingCancelId, setPendingCancelId] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const loadBookings = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/bookings/mine', { token });
      setBookings(result.items);
    } catch (requestError) {
      setError(requestError.message);
      setAlertMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Load state is managed by this async request and its completion handlers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBookings();
  }, [loadBookings]);

  const updateStatus = async (booking, status) => {
    setUpdatingId(booking._id);
    setError('');
    try {
      await apiRequest(`/bookings/${booking._id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      await loadBookings();
    } catch (requestError) {
      setError(requestError.message);
      setAlertMessage(requestError.message);
    } finally {
      setUpdatingId('');
    }
  };

  // Cancelling a booking is destructive, so the first tap only arms the
  // button; the second tap within a few seconds confirms it.
  const cancelBooking = async (booking) => {
    const id = String(booking._id);
    if (updatingId) return;
    if (pendingCancelId !== id) {
      setPendingCancelId(id);
      return;
    }
    setPendingCancelId('');
    await updateStatus(booking, 'cancelled');
  };

  useEffect(() => {
    // Disarm an armed cancel button if the user does not confirm in time.
    if (!pendingCancelId) return undefined;
    const timeout = setTimeout(() => setPendingCancelId(''), 4000);
    return () => clearTimeout(timeout);
  }, [pendingCancelId]);

  const deleteBooking = async (booking) => {
    setUpdatingId(booking._id);
    setError('');
    try {
      await apiRequest(`/bookings/${booking._id}`, { method: 'DELETE', token });
      await loadBookings();
    } catch (requestError) {
      setError(requestError.message);
      setAlertMessage(requestError.message);
    } finally {
      setUpdatingId('');
    }
  };

  const displayedBookings = previewMode ? getPreviewBookings() : bookings;

  if (authLoading || loading && token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Bookings" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Bookings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{previewMode ? 'DESIGN PREVIEW' : 'YOUR GIGMATCH'}</Text>
        <Text style={[styles.title, { fontSize: textSizeTitle }]}>My bookings</Text>
        <Text style={styles.subtitle}>{previewMode ? 'A sample look at how event plans and booking requests appear.' : user ? 'Keep track of your event plans and booking requests.' : 'Sign in to see and manage your bookings.'}</Text>

        {previewMode ? (
          <View style={styles.previewNotice}>
            <Text style={styles.previewNoticeText}>Sample bookings only. No account or real booking information is connected.</Text>
          </View>
        ) : null}
        {!user && !previewMode ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your next great night starts here.</Text>
            <Pressable onPress={() => router.push('/auth')} style={[styles.button, styles.emptyButton]}><Text style={styles.buttonText}>Sign in</Text></Pressable>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadBookings}><Text style={styles.retry}>RETRY</Text></Pressable>
          </View>
        ) : null}
        {user && !error && bookings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No bookings yet.</Text>
            <Text style={styles.emptyCopy}>When you send or receive a request, it will appear here.</Text>
            <Pressable onPress={() => router.push('/')} style={[styles.button, styles.emptyButton]}><Text style={styles.buttonText}>Discover artists</Text></Pressable>
          </View>
        ) : null}
        <View style={styles.list}>
          {displayedBookings.map((booking) => {
            const musicianName = booking.musician?.user?.name || 'Musician';
            const clientName = booking.client?.name || 'Client';
            const isAssignedMusician = user?.role === 'musician';
            const canRespond = isAssignedMusician && booking.status === 'pending';
            const canCancel = user?.role === 'client' && ['pending', 'accepted'].includes(booking.status);
            const canComplete = isAssignedMusician && booking.status === 'accepted';
            const canDelete = user?.role === 'client' && booking.status === 'cancelled';
            return (
              <View key={booking._id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View>
                    <Text style={styles.eventType}>{booking.eventType}</Text>
                    <Text style={styles.bookingDate}>{formatDate(booking.eventDate)} · {formatTimeFromMinute(booking.startMinute)}</Text>
                  </View>
                  <Text style={[styles.status, styles[`status_${booking.status}`]]}>{booking.status.toUpperCase()}</Text>
                </View>
                <View style={styles.separator} />
                <Text style={styles.detail}>With {isAssignedMusician ? clientName : musicianName}</Text>
                <Text style={[styles.detail, styles.detailMuted]}>{booking.venue} · {booking.serviceArea}</Text>
                {user?.role === 'client' && Number.isFinite(booking.venueCoordinates?.latitude) && Number.isFinite(booking.venueCoordinates?.longitude) ? (
                  <View style={styles.venueMap}>
                    <Text style={styles.mapTitle}>Your event venue</Text>
                    <OpenStreetMap
                      origin={booking.venueCoordinates}
                      eventLabel={booking.venue}
                      musicians={booking.musician?.mapCoordinates ? [{
                        id: booking.musician._id,
                        name: musicianName,
                        mapCoordinates: booking.musician.mapCoordinates,
                        genres: booking.musician.genres,
                        hourlyRate: booking.musician.hourlyRate,
                        serviceArea: booking.musician.serviceArea,
                      }] : []}
                      height={isNarrow ? 180 : 220}
                    />
                    <Text style={styles.mapNote}>Venue pin is approximate; the musician pin shows their general service area.</Text>
                  </View>
                ) : null}
                <Text style={styles.detail}>{booking.durationHours} hour{booking.durationHours === 1 ? '' : 's'}{booking.budget != null ? ` · ₱${booking.budget.toLocaleString()} budget` : ''}</Text>
                {booking.notes ? <Text style={styles.notes}>{booking.notes}</Text> : null}
                {!previewMode && user ? (
                  <View style={styles.actionsContainer}>
                    <View style={styles.messageActionRow}>
                      <Pressable
                        onPress={() => router.push({
                          pathname: '/messages/[bookingId]',
                          params: {
                            bookingId: String(booking._id),
                            eventType: booking.eventType,
                            contactName: isAssignedMusician ? clientName : musicianName,
                          },
                        })}
                        style={styles.messageButton}
                      >
                        <Text style={styles.messageButtonText}>💬 Message {isAssignedMusician ? clientName : musicianName}</Text>
                      </Pressable>
                    </View>
                    <View style={styles.lifecycleActionRow}>
                      {canRespond ? (
                        <>
                          <Pressable disabled={updatingId === booking._id} onPress={() => updateStatus(booking, 'accepted')} style={styles.button}><Text style={styles.buttonText}>Accept</Text></Pressable>
                          <Pressable disabled={updatingId === booking._id} onPress={() => updateStatus(booking, 'rejected')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Decline</Text></Pressable>
                        </>
                      ) : null}
                      {canCancel ? (
                        <Pressable
                          disabled={updatingId === booking._id}
                          onPress={() => cancelBooking(booking)}
                          accessibilityLabel={`Cancel booking: ${booking.eventType}`}
                          style={[styles.secondaryButton, pendingCancelId === booking._id && styles.cancelButtonArmed]}
                        >
                          <Text style={[styles.secondaryButtonText, pendingCancelId === booking._id && styles.cancelButtonArmedText]}>
                            {pendingCancelId === booking._id ? 'Tap again to confirm' : 'Cancel booking'}
                          </Text>
                        </Pressable>
                      ) : null}
                      {canDelete ? <Pressable disabled={updatingId === booking._id} onPress={() => deleteBooking(booking)} style={styles.dangerButton} accessibilityLabel={`Delete cancelled booking: ${booking.eventType}`}><Text style={styles.dangerButtonText}>Delete</Text></Pressable> : null}
                      {canComplete ? <Pressable disabled={updatingId === booking._id} onPress={() => updateStatus(booking, 'completed')} style={styles.button}><Text style={styles.buttonText}>Mark complete</Text></Pressable> : null}
                      {updatingId === booking._id ? <ActivityIndicator color={theme.accent} /> : null}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <AppFooter />
      </ScrollView>
      <AppAlert
        visible={Boolean(alertMessage)}
        title="Booking update"
        message={alertMessage}
        onDismiss={() => setAlertMessage('')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingTop: 16, paddingBottom: 0, flexGrow: 1, paddingHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 38, marginTop: 10 },
  subtitle: { color: theme.muted, fontSize: 14, marginTop: 8, marginBottom: 24 },
  previewNotice: { backgroundColor: '#EAE1D7', padding: 14, marginBottom: 18 },
  previewNoticeText: { color: theme.accent, fontSize: 12, lineHeight: 18 },
  empty: { alignItems: 'center', backgroundColor: '#F6F1EA', borderWidth: 1, borderColor: theme.border, padding: 20, marginTop: 12 },
  emptyTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 20, textAlign: 'center' },
  emptyCopy: { color: theme.muted, fontSize: 13, marginTop: 10, textAlign: 'center' },
  list: { gap: 14 },
  bookingCard: { backgroundColor: '#F6F1EA', borderWidth: 1, borderColor: theme.border, padding: 16 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  eventType: { color: theme.accent, fontFamily: 'Georgia', fontSize: 18, textTransform: 'capitalize' },
  bookingDate: { color: theme.muted, fontSize: 12, marginTop: 5 },
  status: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, paddingVertical: 6, paddingHorizontal: 9, overflow: 'hidden', borderRadius: 12, backgroundColor: '#EAE1D7', color: theme.accent },
  status_pending: { backgroundColor: '#FEF9C3', color: '#713F12', borderWidth: 1, borderColor: '#FDE047' },
  status_accepted: { backgroundColor: '#E1E9D9', color: '#36543B', borderWidth: 1, borderColor: '#BBE1C3' },
  status_rejected: { backgroundColor: '#F4E4DF', color: '#8D3A2D', borderWidth: 1, borderColor: '#FCA5A5' },
  status_cancelled: { backgroundColor: '#FEF08A', color: '#854D0E', borderWidth: 1, borderColor: '#CA8A04' },
  status_completed: { backgroundColor: '#E6E0D5', color: theme.accent, borderWidth: 1, borderColor: '#D4C9B8' },
  separator: { height: 1, backgroundColor: theme.border, marginVertical: 13 },
  detail: { color: theme.accent, fontSize: 13, lineHeight: 20 },
  detailMuted: { color: theme.muted },
  venueMap: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#F6F1EA', padding: 6, marginTop: 12, marginBottom: 8 },
  venueMapText: { color: theme.accent, fontSize: 11, fontWeight: '700' },
  venueMapNote: { color: theme.muted, fontSize: 9, lineHeight: 14, marginTop: 5 },
  mapTitle: { color: theme.accent, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  mapNote: { color: theme.muted, fontSize: 10, lineHeight: 15, marginTop: 7 },
  notes: { color: theme.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  actionsContainer: { marginTop: 15, gap: 10 },
  messageActionRow: { flexDirection: 'row' },
  messageButton: { borderWidth: 1, borderColor: theme.accent, paddingVertical: 10, paddingHorizontal: 15, flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  messageButtonText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  lifecycleActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: theme.accent, paddingVertical: 10, paddingHorizontal: 16, minHeight: 40, justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: theme.accent, paddingVertical: 10, paddingHorizontal: 15, minHeight: 40, justifyContent: 'center' },
  secondaryButtonText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  cancelButtonArmed: { backgroundColor: '#9B2C20', borderColor: '#9B2C20' },
  cancelButtonArmedText: { color: '#fff' },
  dangerButton: { borderWidth: 1, borderColor: '#8D3A2D', paddingVertical: 10, paddingHorizontal: 15, minHeight: 40, justifyContent: 'center' },
  dangerButtonText: { color: '#8D3A2D', fontSize: 12, fontWeight: '700' },
  emptyButton: { marginTop: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 12, marginBottom: 16 },
  errorText: { color: '#9B2C20', fontSize: 12, flex: 1 },
  retry: { color: theme.accent, fontSize: 9, fontWeight: '700' },
});
