import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PageLayout from '../components/PageLayout';
import AppAlert from '../components/AppAlert';
import HoverPressable from '../components/HoverPressable';
import { theme } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { isMongoId, normalizeMusician } from '../utils/musician';
import {
  formatDateInput,
  toApiDate,
  formatTimeInput,
  toApiTime,
} from '../utils/bookingDateTime';
import { formatPriceInput, toPriceValue } from '../utils/inputFormatting';

const paymentOptions = ['Cash', 'Bank transfer', 'GCash', 'Maya'];

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const [artist, setArtist] = useState(null);
  const [loadingArtist, setLoadingArtist] = useState(true);
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState(formatDateInput(params.date));
  const [eventTime, setEventTime] = useState('');
  const [eventPeriod, setEventPeriod] = useState('AM');
  const [venue, setVenue] = useState('');
  const [duration, setDuration] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [budget, setBudget] = useState('');
  const [requests, setRequests] = useState('');
  const [payment, setPayment] = useState('');
  const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmBooking, setConfirmBooking] = useState(false);
  const [error, setError] = useState('');
  const [mapWarning, setMapWarning] = useState('');

  useEffect(() => {
    let active = true;
    if (!isMongoId(params.artistId)) {
      // The selected artist is derived from route params when no API lookup is needed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setArtist(null);
      setLoadingArtist(false);
      setError('');
      return () => { active = false; };
    }

    setLoadingArtist(true);
    apiRequest(`/musicians/${params.artistId}`)
      .then((profile) => {
        if (active) setArtist(normalizeMusician(profile));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoadingArtist(false);
      });

    return () => { active = false; };
  }, [params.artistId]);

  const submit = async () => {
    setError('');
    if (!user || !token) {
      setError('Sign in with a client account to send a booking request.');
      return;
    }
    if (user.role !== 'client') {
      setError('Only client accounts can request bookings. Sign in with an event host account.');
      return;
    }
    if (!artist || !isMongoId(String(artist._id))) {
      setError('Choose a published musician profile before requesting a booking.');
      return;
    }
    if (!eventType.trim()) {
      setError('Please enter the type of event.');
      return;
    }
    const apiDate = toApiDate(eventDate);
    if (!apiDate) {
      setError('Enter a valid date in MM/DD/YYYY format.');
      return;
    }
    const apiTime = toApiTime(eventTime, eventPeriod);
    if (!apiTime) {
      setError('Enter a valid 12-hour start time, such as 07:30, and select AM or PM.');
      return;
    }
    const parsedDuration = Number(duration);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 12) {
      setError('Performance length must be 1–12 whole hours.');
      return;
    }
    if (!venue.trim() || !serviceArea.trim()) {
      setError('Please enter the venue and service area.');
      return;
    }
    const budgetValue = toPriceValue(budget);
    if (budget.trim() && !Number.isFinite(budgetValue)) {
      setError('Budget must be a non-negative number.');
      return;
    }

    setSubmitting(true);
    try {
      const createdBooking = await apiRequest('/bookings', {
        method: 'POST',
        token,
        body: JSON.stringify({
          musicianId: artist._id,
          eventType: eventType.trim(),
          eventDate: apiDate,
          startTime: apiTime,
          eventTimezone: 'Asia/Manila',
          durationHours: parsedDuration,
          venue: venue.trim(),
          serviceArea: serviceArea.trim(),
          ...(budget.trim() ? { budget: budgetValue } : {}),
          paymentPreference: payment.toLowerCase().replace(' ', '_') || 'other',
          notes: requests.trim(),
        }),
      

});
      setMapWarning(createdBooking.mapWarning || '');
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout active="Book">
      <View style={styles.heading}>
        <Text style={styles.kicker}>LET'S MAKE IT A NIGHT</Text>
        <Text style={styles.title}>Booking request</Text>
        <Text style={styles.copy}>Tell us a little about your event. Times are in Philippine time (Asia/Manila); your artist will confirm details with you.</Text>
      </View>

      {submitted ? (
        <View style={styles.confirmation}>
          <Text style={styles.confirmationMark}>✓</Text>
          <Text style={styles.confirmationTitle}>{`Request sent to ${artist.name}.`}</Text>
          <Text style={styles.copy}>Your booking request is pending the musician's response.</Text>
          {mapWarning ? <Text style={styles.mapWarning}>{mapWarning}</Text> : null}
          <HoverPressable onPress={() => router.push('/bookings')} style={styles.primaryButton} hoverStyle={styles.buttonHovered}>
            <Text style={styles.primaryButtonText}>View my bookings</Text>
          </HoverPressable>
        </View>
      ) : (
        <View style={styles.form}>
          {loadingArtist ? <ActivityIndicator color={theme.accent} /> : null}
          {artist ? (
            <View style={styles.artistCard}>
              <View style={styles.artistInfo}>
                <Text style={styles.artistLabel}>REQUESTING</Text>
                <Text style={styles.artistName}>{artist.name}</Text>
                <Text style={styles.artistRate}>Est. ₱{artist.price.toLocaleString()}+ per set</Text>
              </View>
              <HoverPressable onPress={() => router.push('/')}><Text style={styles.changeArtist}>CHANGE</Text></HoverPressable>
            </View>
          ) : (
            <View style={styles.chooseArtist}>
              <Text style={styles.sectionTitle}>Choose your artist</Text>
              <Text style={styles.copyLeft}>Select a performer first, then return to finish your request.</Text>
              <HoverPressable onPress={() => router.push('/')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Browse artists</Text></HoverPressable>
            </View>
          )}

          {authLoading ? (
            <View style={styles.authLoading}><ActivityIndicator color={theme.accent} /></View>
          ) : !user ? (
            <View style={styles.signInGate}>
              <Text style={styles.signInGateTitle}>Sign in to request a booking</Text>
              <Text style={styles.signInGateCopy}>Booking requests are only available to signed-in event hosts. Sign in or create a free account, then come back to send your request.</Text>
              <HoverPressable onPress={() => router.push('/auth')} style={styles.gateButton} hoverStyle={styles.buttonHovered} accessibilityRole="button">
                <Text style={styles.gateButtonText}>Sign in or create account</Text>
              </HoverPressable>
            </View>
          ) : (
            <>
          <Text style={styles.sectionTitle}>Event details</Text>
          <Text style={styles.label}>Event type</Text>
          <TextInput value={eventType} onChangeText={setEventType} placeholder="e.g. Wedding, birthday, corporate" placeholderTextColor={theme.muted} accessibilityLabel="Event type" style={styles.input} />
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Event date (MM/DD/YYYY)</Text>
              <TextInput
                value={eventDate}
                onChangeText={(value) => setEventDate(formatDateInput(value))}
                placeholder="MM/DD/YYYY"
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel="Event date, month day year"
                placeholderTextColor={theme.muted}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Start time (12-hour)</Text>
              <View style={styles.timeRow}>
                <TextInput
                  value={eventTime}
                  onChangeText={(value) => setEventTime(formatTimeInput(value))}
                  placeholder="HH:MM"
                  keyboardType="number-pad"
                  maxLength={5}
                  accessibilityLabel="Start time, 12-hour format"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, styles.timeInput]}
                />
                <View style={styles.periodOptions}>
                  {['AM', 'PM'].map((period) => (
                    <HoverPressable
                      key={period}
                      accessibilityRole="button"
                      accessibilityLabel={period}
                      accessibilityState={{ selected: eventPeriod === period }}
                      onPress={() => setEventPeriod(period)}
                      style={[styles.periodOption, eventPeriod === period && styles.periodSelected]}
                    >
                      <Text style={[styles.periodText, eventPeriod === period && styles.periodTextSelected]}>{period}</Text>
                    </HoverPressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Venue and city</Text>
              <TextInput value={venue} onChangeText={setVenue} placeholder="Venue, city" placeholderTextColor={theme.muted} accessibilityLabel="Venue and city" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Service area / city</Text>
              <TextInput value={serviceArea} onChangeText={setServiceArea} placeholder="e.g. Quezon City" placeholderTextColor={theme.muted} accessibilityLabel="Service area or city" style={styles.input} />
            </View>
          </View>
          <Text style={styles.label}>Performance length (whole hours)</Text>
          <TextInput value={duration} onChangeText={setDuration} placeholder="e.g. 2" keyboardType="number-pad" placeholderTextColor={theme.muted} accessibilityLabel="Performance length in whole hours" style={styles.input} />
          <Text style={styles.label}>Budget in PHP (optional)</Text>
          <TextInput value={budget} onChangeText={(value) => setBudget(formatPriceInput(value))} placeholder="e.g. 10,000" keyboardType="number-pad" maxLength={10} placeholderTextColor={theme.muted} accessibilityLabel="Budget in Philippine pesos, optional" style={styles.input} />

          <Text style={styles.sectionTitle}>Payment preference</Text>
          <Text style={styles.helper}>This is a preference only. Payment is arranged directly after booking details are confirmed.</Text>
          <View style={styles.paymentGrid}>
            {paymentOptions.map((option) => (
              <HoverPressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`Payment preference: ${option}`}
                accessibilityState={{ selected: payment === option }}
                onPress={() => setPayment(option)}
                style={[styles.paymentOption, payment === option && styles.paymentSelected]}
              >
                <Text style={[styles.paymentText, payment === option && styles.paymentTextSelected]}>{option}</Text>
              </HoverPressable>
            ))}
          </View>

          <Text style={styles.label}>Venue notes or special requests</Text>
          <TextInput value={requests} onChangeText={setRequests} placeholder="Share event details, setup needs, or songs you'd love to hear." placeholderTextColor={theme.muted} accessibilityLabel="Venue notes or special requests" multiline style={[styles.input, styles.notes]} />

          <View style={styles.checkoutConfirmation}>
            <Text style={styles.checkoutLabel}>Before you send</Text>
            <HoverPressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmBooking }}
              accessibilityLabel="I confirm my event details are correct"
              onPress={() => setConfirmBooking((previous) => !previous)}
              style={styles.checkoutItem}
              hoverStyle={styles.checkoutItemHovered}
            >
              <View style={[styles.checkoutCheckbox, confirmBooking && styles.checkoutCheckboxChecked]}>
                {confirmBooking ? <Text style={styles.checkoutCheck}>✓</Text> : null}
              </View>
              <Text style={styles.checkoutText}>
                I've reviewed my event details and I'm ready to send this booking request{artist ? ` to ${artist.name}` : ''}.
              </Text>
            </HoverPressable>
            <Text style={styles.checkoutNote}>
              You can still adjust details with the artist after sending — nothing is charged.
            </Text>
          </View>

          <HoverPressable onPress={submit} disabled={submitting || loadingArtist || !confirmBooking} style={[styles.primaryButton, (!artist || submitting || !confirmBooking) && styles.disabledButton]} hoverStyle={styles.buttonHovered}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send booking request</Text>}
                  </HoverPressable>
                    <View style={styles.checklistSection}>
                      <Text style={styles.checklistTitle}>What’s included in your booking</Text>
                      <View style={styles.checklistItem}><Text style={styles.checklistCheck}>✓</Text><Text style={styles.checklistText}>Per set: {artist?.durationSetMinutes || 45} minutes of performance</Text></View>
                      <View style={styles.checklistItem}><Text style={styles.checklistCheck}>✓</Text><Text style={styles.checklistText}>Sound & lighting equipment {artist?.equipment ? 'included' : 'not provided'}</Text></View>
                      <View style={styles.checklistItem}><Text style={styles.checklistCheck}>✓</Text><Text style={styles.checklistText}>Payment arranged directly with the artist after confirmation</Text></View>
                      <View style={styles.checklistItem}><Text style={styles.checklistCheck}>✓</Text><Text style={styles.checklistText}>You’ll receive a confirmation email when the artist accepts</Text></View>
                    </View>
                    <Text style={styles.disclaimer}>Sending a request does not confirm the booking or charge a payment.</Text>
            <Text style={styles.locationDisclosure}>To show your event on the private booking map, the venue and city are sent to OpenStreetMap Nominatim for an approximate location lookup. The map is visible to the booking participants only.</Text>
            </>
          )}
        </View>
      )}
      <AppAlert
        visible={Boolean(error)}
        title="Booking request problem"
        message={error}
        onDismiss={() => setError('')}
      />
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  kicker: { color: theme.muted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 38, textAlign: 'center' },
  copy: { color: theme.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 540, marginTop: 10 },
  copyLeft: { color: theme.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  form: { width: '90%', maxWidth: 760, alignSelf: 'center', backgroundColor: '#F5F0E7', borderWidth: 1, borderColor: theme.border, padding: 24 },
  artistCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EAE1D7', padding: 17, marginBottom: 24 },
  artistLabel: { color: theme.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  artistName: { color: theme.accent, fontFamily: 'Georgia', fontSize: 23, marginTop: 4 },
  artistRate: { color: theme.muted, fontSize: 12, marginTop: 3 },
  changeArtist: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, padding: 8 },
  chooseArtist: { backgroundColor: '#EAE1D7', padding: 18, marginBottom: 24 },
  sectionTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 22, marginTop: 20, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, flexBasis: 220 },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeInput: { flex: 1, minWidth: 72 },
  periodOptions: { flexDirection: 'row', borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6' },
  periodOption: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  periodSelected: { backgroundColor: theme.accent },
  periodText: { color: theme.accent, fontSize: 11, fontWeight: '700' },
  periodTextSelected: { color: '#fff' },
  label: { color: theme.accent, fontSize: 12, fontWeight: '600', marginBottom: 7, marginTop: 10 },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingHorizontal: 13, paddingVertical: 12, color: theme.text, minHeight: 48 },
  helper: { color: theme.muted, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 10 },
  paymentOption: { flexGrow: 1, flexBasis: 120, minHeight: 48, justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6' },
  paymentSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  paymentText: { color: theme.accent, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  paymentTextSelected: { color: '#fff' },
  notes: { minHeight: 104, textAlignVertical: 'top' },
  checkoutConfirmation: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', padding: 18, marginTop: 20 },
  checkoutLabel: { color: theme.accent, fontFamily: 'Georgia', fontSize: 18, marginBottom: 12 },
  checkoutSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.border },
  checkoutSummaryLabel: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  checkoutSummaryValue: { color: theme.accent, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  checkoutNote: { color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
  checkoutItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, padding: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: '#EAE1D7' },
  checkoutItemHovered: { borderColor: theme.accent },
  checkoutCheckbox: { width: 22, height: 22, borderWidth: 1, borderColor: theme.accent, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9F6' },
  checkoutCheckboxChecked: { backgroundColor: theme.accent, borderColor: theme.accent },
  checkoutCheck: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkoutText: { color: theme.text, fontSize: 12, lineHeight: 18, flex: 1 },
  primaryButton: { backgroundColor: theme.accentDark, paddingVertical: 16, alignItems: 'center', alignSelf: 'stretch', marginTop: 20 },
  buttonHovered: { backgroundColor: theme.accent, transform: [{ translateY: -2 }], shadowColor: '#35251D', shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.6 },
  disabledButton: { opacity: 0.75 },
  secondaryButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.accent, paddingVertical: 10, paddingHorizontal: 16, marginTop: 14 },
  secondaryButtonText: { color: theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  disclaimer: { color: theme.muted, fontSize: 10, textAlign: 'center', marginTop: 11 },
  locationDisclosure: { color: theme.text, backgroundColor: '#EAE1D7', borderLeftWidth: 3, borderLeftColor: theme.accent, padding: 12, fontSize: 12, lineHeight: 18, marginTop: 10 },
  mapWarning: { color: '#765219', backgroundColor: '#F6EEDC', padding: 10, fontSize: 11, lineHeight: 17, marginTop: 14 },
  confirmation: { width: '90%', maxWidth: 620, minHeight: 300, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: '#F5F0E7' },
  confirmationMark: { color: '#fff', backgroundColor: theme.accent, width: 52, height: 52, borderRadius: 26, textAlign: 'center', textAlignVertical: 'center', fontSize: 28, overflow: 'hidden' },
  confirmationTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 27, marginTop: 17 },
  error: { color: '#9B2C20', backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 10, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  signInGate: { backgroundColor: '#EAE1D7', padding: 20, alignItems: 'center' },
  signInGateTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 23 },
  signInGateCopy: { color: theme.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  gateButton: { backgroundColor: theme.accentDark, paddingVertical: 16, alignItems: 'center', alignSelf: 'stretch', marginTop: 16 },
  gateButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.6 },
  authLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
    checklistSection: { backgroundColor: '#f5f2ee', borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 18, marginBottom: 16 },
    checklistTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 16, marginBottom: 12 },
    checklistItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    checklistCheck: { color: theme.accent, fontSize: 16, fontWeight: '700' },
    checklistText: { color: theme.text, fontSize: 13, lineHeight: 18, flex: 1 },
  

});
