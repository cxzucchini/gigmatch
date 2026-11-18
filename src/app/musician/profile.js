import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import AppAlert from '../../components/AppAlert';
import HoverPressable from '../../components/HoverPressable';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { getUpcomingDates } from '../../utils/availability';
import { formatPriceInput, toPriceValue, formatContactPhoneInput } from '../../utils/inputFormatting';
import { theme } from '../../styles/theme';

export default function MusicianProfileScreen() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [genres, setGenres] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [imageSelected, setImageSelected] = useState(false);
  const [equipment, setEquipment] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [customUnavailableDate, setCustomUnavailableDate] = useState('');
  const [updatingAvailability, setUpdatingAvailability] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);
  const availabilityYRef = useRef(0);
  const upcomingDates = getUpcomingDates();
  const upcomingDateValues = new Set(upcomingDates.map(({ dateValue }) => dateValue));
  const otherBlockedDates = unavailableDates.filter((date) => !upcomingDateValues.has(date));

  const loadProfile = useCallback(async () => {
    if (!token || user?.role !== 'musician') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
        try {
          const current = await apiRequest('/musicians/me', { token });
          setProfile(current);
      setBio(current.bio || '');
      setGenres((current.genres || []).join(', '));
      setExperienceYears(String(current.experienceYears ?? 0));
      setHourlyRate(current.hourlyRate == null ? '' : formatPriceInput(String(current.hourlyRate)));
      setServiceArea(current.serviceArea || '');
      setContactPhone(formatContactPhoneInput(current.contactPhone || ''));
      setProfileImageUrl(current.profileImageUrl || '');
      if (current.profileImageUrl) {
        setImageUri(current.profileImageUrl);
      }
      setEquipment(Boolean(current.equipment));
      const availability = await apiRequest('/musicians/me/availability', { token   
});
      setUnavailableDates(availability.unavailableDates || []);
    } catch (requestError) {
      if (requestError.status === 404) {
        setProfile(null);
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  const saveProfile = async (publish) => {
    setError('');
    setMessage('');
    const parsedRate = toPriceValue(hourlyRate);
    const parsedExperience = Number(experienceYears);
    if (experienceYears.trim() && (!Number.isInteger(parsedExperience) || parsedExperience < 0 || parsedExperience > 80)) {
      setError('Experience must be a whole number between 0 and 80 years.');
      return;
    }

    setSaving(true);
    try {
      const saved = await apiRequest('/musicians/me', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          bio,
          genres: genres.split(',').map((genre) => genre.trim()).filter(Boolean),
          experienceYears: parsedExperience || 0,
          hourlyRate: parsedRate || 0,
          serviceArea,
          contactPhone,
          profileImageUrl,
          equipment,
          published: publish,
        }),
        
});
      setProfile(saved);
      setMessage(saved.locationWarning || (publish
        ? 'Your profile is published and visible in discovery.'
        : 'Your profile has been saved as a draft.'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const setDateUnavailable = async (date, unavailable) => {
    setError('');
    setMessage('');
    setUpdatingAvailability(date);
    try {
      const result = await apiRequest('/musicians/me/availability', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ date, unavailable }),
        
});
      setUnavailableDates(result.unavailableDates);
      setCustomUnavailableDate('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingAvailability('');
    }
  };

  const pickProfileImage = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        
});
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        // For now, use the URI as the URL (in production, upload to Cloudinary)
        setProfileImageUrl(result.assets[0].uri);
        setImageSelected(true);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      setError('Failed to pick image');
    }
  };

  const removeProfileImage = () => {
    setImageUri(null);
    setProfileImageUrl('');
    setImageSelected(false);
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Profile" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!user || user.role !== 'musician') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Profile" />
        <View style={styles.centerContent}>
          <Text style={styles.title}>Musician profile</Text>
          <Text style={styles.subtitle}>Sign in with a musician account to create and publish your profile.</Text>
          <HoverPressable onPress={() => router.push('/auth')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </HoverPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Profile" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>YOUR ARTIST PAGE</Text>
        <Text style={styles.title}>Build your profile.</Text>
        <Text style={styles.subtitle}>Tell clients about your sound and the events you play. Save a draft while you work; publish when you&apos;re ready.</Text>
        {profile ? <Text style={styles.profileStatus}>{profile.published ? 'PUBLISHED PROFILE' : 'DRAFT PROFILE'}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Artist bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Describe your music, performance style, and experience."
          placeholderTextColor={theme.muted}
          accessibilityLabel="Artist bio"
          multiline
          style={[styles.input, styles.bioInput]}
        />

        <Text style={styles.label}>Genres (comma-separated)</Text>
        <TextInput
          value={genres}
          onChangeText={setGenres}
          placeholder="Acoustic, Pop, Jazz"
          placeholderTextColor={theme.muted}
          accessibilityLabel="Genres, comma-separated"
          style={styles.input}
        />

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Years of experience</Text>
            <TextInput
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.muted}
              accessibilityLabel="Years of experience"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Estimated set price (PHP)</Text>
            <TextInput
              value={hourlyRate}
              onChangeText={(value) => setHourlyRate(formatPriceInput(value))}
              keyboardType="number-pad"
              placeholder="5,000"
              placeholderTextColor={theme.muted}
              maxLength={10}
              accessibilityLabel="Estimated set price in Philippine pesos"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Service area</Text>
        <TextInput
          value={serviceArea}
          onChangeText={setServiceArea}
          placeholder="City or general area (not home address)"
          placeholderTextColor={theme.muted}
          accessibilityLabel="Service area"
          style={styles.input}
        />

        <Text style={styles.label}>Contact number (optional)</Text>
        <TextInput
          value={contactPhone}
          onChangeText={(value) => setContactPhone(formatContactPhoneInput(value))}
          placeholder="+63 912 345 6789"
          placeholderTextColor={theme.muted}
          accessibilityLabel="Contact number, optional"
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={16}
          style={styles.input}
        />
        <Text style={styles.note}>This number is shown on your public artist profile so clients can contact you outside Gigmatch chat.</Text>

        <Text style={styles.label}>Profile picture</Text>
        {imageUri ? (
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.profileImage}
            />
            <HoverPressable
              onPress={removeProfileImage}
              style={styles.removeImageButton}
            >
              <Text style={styles.removeImageText}>Remove</Text>
            </HoverPressable>
          </View>
        ) : null}
        <HoverPressable
          onPress={pickProfileImage}
          style={styles.profilePictureButton}
        >
          <Text style={styles.profilePictureText}>Change Profile Picture</Text>
        </HoverPressable>
        {imageSelected && <Text style={styles.success}>Image selected successfully</Text>}

        <View style={styles.equipmentRow}>
          <Text style={styles.equipmentLabel}>I provide sound &amp; lighting equipment</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: equipment }}
            accessibilityLabel={`Sound equipment toggle, currently ${equipment ? 'on' : 'off'}`}
            onPress={() => setEquipment(!equipment)}
            style={[styles.equipmentToggle, equipment && styles.equipmentToggleActive]}
          >
            <View style={[styles.equipmentToggleThumb, equipment && styles.equipmentToggleThumbActive]} />
          </Pressable>
        </View>
        <Text style={styles.note}>When enabled, clients see you provide 🎧 Sound &amp; lighting equipment.</Text>

        <View style={styles.actions}>
          <HoverPressable disabled={saving} onPress={() => saveProfile(false)} style={styles.secondaryButton}>
            {saving ? <ActivityIndicator color={theme.accent} /> : <Text style={styles.secondaryButtonText}>Save as draft</Text>}
          </HoverPressable>
          <HoverPressable disabled={saving} onPress={() => saveProfile(true)} style={styles.primaryButton}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{profile?.published ? 'Save & update profile' : 'Save & publish profile'}</Text>}
          </HoverPressable>
        </View>

        <View style={styles.availabilitySection} onLayout={(event) => { availabilityYRef.current = event.nativeEvent.layout.y; }}>
          <Text style={styles.sectionTitle}>Availability calendar</Text>
          <Text style={styles.availabilityDescription}>
            Dates are open for booking by default. Mark dates you cannot perform as unavailable. Confirmed bookings will also appear to clients.
          </Text>
          {!profile ? (
            <Text style={styles.availabilityPrompt}>Save your profile first to manage your calendar.</Text>
          ) : (
            <>
              <View style={styles.customDateRow}>
                <TextInput
                  value={customUnavailableDate}
                  onChangeText={setCustomUnavailableDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, styles.customDateInput]}
                  accessibilityLabel="Date to mark unavailable"
                />
                <HoverPressable
                  disabled={updatingAvailability !== '' || !customUnavailableDate.trim()}
                  onPress={() => setDateUnavailable(customUnavailableDate.trim(), true)}
                  style={[styles.customDateButton, (updatingAvailability !== '' || !customUnavailableDate.trim()) && styles.availabilityButtonDisabled]}
                >
                  <Text style={styles.customDateButtonText}>Block date</Text>
                </HoverPressable>
              </View>
              <Text style={styles.availabilityHint}>Choose a date in the next 30 days or enter any future date above. Select a blocked date to reopen it.</Text>
              <View style={styles.availabilityGrid}>
                {upcomingDates.map(({ dateValue, label }) => {
                  const blocked = unavailableDates.includes(dateValue);
                  return (
                    <HoverPressable
                      key={dateValue}
                      accessibilityRole="button"
                      accessibilityLabel={`${label}, ${blocked ? 'unavailable; select to reopen' : 'available; select to block'}`}
                      disabled={updatingAvailability !== ''}
                      onPress={() => setDateUnavailable(dateValue, !blocked)}
                      style={[styles.availabilityDate, blocked && styles.unavailableDate, updatingAvailability === dateValue && styles.updatingDate]}
                    >
                      <Text style={[styles.availabilityDateLabel, blocked && styles.unavailableText]}>{label}</Text>
                      <Text style={[styles.availabilityDateStatus, blocked && styles.unavailableText]}>
                        {updatingAvailability === dateValue ? 'Saving…' : blocked ? 'Unavailable · reopen' : 'Available · block'}
                      </Text>
                    </HoverPressable>
                  );
                })}
              </View>
              {otherBlockedDates.length ? (
                <View style={styles.otherBlockedDates}>
                  <Text style={styles.availabilityHint}>Other blocked dates</Text>
                  {otherBlockedDates.map((date) => (
                    <HoverPressable
                      key={date}
                      disabled={updatingAvailability !== ''}
                      onPress={() => setDateUnavailable(date, false)}
                      style={styles.otherBlockedDate}
                    >
                      <Text style={styles.unavailableText}>{date} · Select to reopen</Text>
                    </HoverPressable>
                  ))}
                </View>
              ) : null}
              {unavailableDates.length ? (
                <Text style={styles.blockedSummary}>{unavailableDates.length} date{unavailableDates.length === 1 ? '' : 's'} currently blocked.</Text>
              ) : null}
            </>
          )}
        </View>
        <AppFooter />
      </ScrollView>

      <AppAlert
        visible={Boolean(error)}
        title="Profile update problem"
        message={error}
        onDismiss={() => setError('')}
      />
      <AppAlert
        visible={Boolean(message)}
        title="Profile saved"
        message={message}
        onDismiss={() => {
          setMessage('');
          scrollRef.current?.scrollTo({ y: Math.max(availabilityYRef.current - 24, 0), animated: true   
});
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  content: { width: '90%', maxWidth: 760, alignSelf: 'center', paddingTop: 36, paddingBottom: 0, flexGrow: 1 },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 36, marginTop: 10 },
  subtitle: { color: theme.muted, fontSize: 13, lineHeight: 21, marginTop: 9, marginBottom: 20 },
  profileStatus: { alignSelf: 'flex-start', color: theme.accent, backgroundColor: '#EAE1D7', fontSize: 9, fontWeight: '700', letterSpacing: 1, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 10 },
  sectionTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 25, marginTop: 32, marginBottom: 8 },
  availabilitySection: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 30, paddingTop: 6 },
  availabilityDescription: { color: theme.muted, fontSize: 12, lineHeight: 19, marginBottom: 14 },
  availabilityPrompt: { color: theme.accent, backgroundColor: '#EAE1D7', padding: 12, fontSize: 12 },
  customDateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  customDateInput: { flexGrow: 1, flexBasis: 170 },
  customDateButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.accent, paddingHorizontal: 18 },
  availabilityButtonDisabled: { opacity: 0.55 },
  customDateButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  availabilityHint: { color: theme.muted, fontSize: 10, lineHeight: 16, marginBottom: 12 },
  availabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  availabilityDate: { flexGrow: 1, flexBasis: 145, borderWidth: 1, borderColor: '#C4D1BD', backgroundColor: '#E8EFE4', padding: 11 },
  unavailableDate: { borderColor: '#D7B5AC', backgroundColor: '#F2E5E1' },
  updatingDate: { opacity: 0.6 },
  availabilityDateLabel: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  availabilityDateStatus: { color: theme.muted, fontSize: 10, marginTop: 4 },
  unavailableText: { color: '#8D4C3E' },
  blockedSummary: { color: theme.accent, fontSize: 11, fontWeight: '600', marginTop: 12 },
  otherBlockedDates: { marginTop: 16 },
  otherBlockedDate: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#D7B5AC', backgroundColor: '#F2E5E1', padding: 10, marginBottom: 6 },
  label: { color: theme.accent, fontSize: 12, fontWeight: '600', marginBottom: 7, marginTop: 14 },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingHorizontal: 13, paddingVertical: 12, color: theme.text, minHeight: 48 },
  bioInput: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, flexBasis: 200 },
  note: { color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: 14 },
  profileImageContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  profileImage: { width: 96, height: 72, borderRadius: 6, borderWidth: 1, borderColor: theme.border },
  removeImageButton: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, marginBottom: 4 },
  removeImageText: { color: theme.text, fontSize: 11, fontWeight: '600' },
  profilePictureButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: theme.accent, paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  profilePictureText: { color: theme.accent, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  success: { color: theme.accent, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  primaryButton: { backgroundColor: theme.accentDark, minHeight: 46, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  secondaryButton: { minHeight: 46, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.accent },
  secondaryButtonText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  error: { color: '#9B2C20', backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 10, fontSize: 12, marginVertical: 8 },
  success: { color: '#36543B', backgroundColor: '#E1E9D9', padding: 10, fontSize: 12, marginVertical: 8 },
  equipmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 },
  equipmentLabel: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  equipmentToggle: { width: 44, height: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: '#fff', justifyContent: 'center', padding: 2 },
  equipmentToggleActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  equipmentToggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.muted },
  equipmentToggleThumbActive: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
});