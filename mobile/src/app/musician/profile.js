import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import AppAlert from '../../components/AppAlert';
import HoverPressable from '../../components/HoverPressable';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { theme } from '../../styles/theme';

const GENRES = ['Jazz', 'Rock', 'RnB', 'Acoustic', 'Pop', 'OPM', 'Reggae', 'Classical'];
const SOUND_OPTIONS = ['With Sound', 'Artist Only'];

async function compressWebDataUrl(dataUrl, maxWidth = 800, quality = 0.65) {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !dataUrl) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function buildPhotoPayload(asset) {
  if (!asset) return null;
  if (asset.base64 && typeof asset.base64 === 'string') {
    const rawMime = asset.mimeType || '';
    const mimeType = rawMime.startsWith('image/') ? rawMime : 'image/jpeg';
    const rawDataUrl = `data:${mimeType};base64,${asset.base64}`;
    return compressWebDataUrl(rawDataUrl, 800, 0.65);
  }
  return asset.uri || null;
}

export default function MusicianProfileScreen() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user || null;
  const token = auth?.token || null;
  const authLoading = Boolean(auth?.loading);
  const refreshUser = auth?.refreshUser;

  const userId = user?._id || user?.id || '';
  const isAdmin = user?.role === 'admin';

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const [stageName, setStageName] = useState('');
  const [genre, setGenre] = useState('Acoustic');
  const [setRate, setSetRate] = useState('');
  const [soundSetup, setSoundSetup] = useState('With Sound');
  const [serviceArea, setServiceArea] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [photoPayload, setPhotoPayload] = useState(null);

  const [error, setError] = useState('');
  const [savedAlertVisible, setSavedAlertVisible] = useState(false);
  const loadedKeyRef = useRef('');

  const loadMusicianProfile = useCallback(async () => {
    if (!token || !userId || isAdmin) {
      setLoadingProfile(false);
      return;
    }

    const sessionKey = `${userId}:${token}`;
    if (loadedKeyRef.current === sessionKey) {
      setLoadingProfile(false);
      return;
    }
    loadedKeyRef.current = sessionKey;

    setStageName(user?.name || '');

    try {
      const data = await apiRequest('/musicians/me', { token });
      const profile = data?.profile || data?.musician || data || {};
      if (profile.name || profile.stageName) {
        setStageName(profile.name || profile.stageName);
      }
      if (profile.genre) setGenre(profile.genre);
      if (profile.price != null || profile.setRate != null) {
        setSetRate(String(profile.price ?? profile.setRate));
      }
      if (profile.soundSetup || profile.equipment) {
        setSoundSetup(profile.soundSetup || profile.equipment);
      }
      if (profile.serviceArea || profile.location || profile.city) {
        setServiceArea(profile.serviceArea || profile.location || profile.city);
      }
      if (profile.bio) setBio(profile.bio);
      const savedPhoto = profile.photoUrl || profile.avatarUrl || profile.image || null;
      if (savedPhoto) {
        setPhotoUri(savedPhoto);
        setPhotoPayload(savedPhoto);
      }
    } catch {
      // Keep initial defaults if no saved musician profile exists yet.
    } finally {
      setLoadingProfile(false);
    }
  }, [token, userId, isAdmin, user]);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      router.replace('/admin');
      return;
    }
    loadMusicianProfile();
  }, [authLoading, isAdmin, loadMusicianProfile, router]);

  const pickPhoto = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const previewUri = asset.uri || null;
        const payload = await buildPhotoPayload(asset);

        if (!previewUri && !payload) {
          setError('Please choose a valid photo.');
          return;
        }

        if (typeof payload === 'string' && payload.length > 3_200_000) {
          setError('Photo is too large. Please choose a smaller image.');
          return;
        }

        setPhotoUri(previewUri || payload);
        setPhotoPayload(payload || previewUri);
      }
    } catch {
      setError('Could not open your photo library. Please try again.');
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
    setPhotoPayload('');
  };

  const handleSaveProfile = async () => {
    setError('');

    if (stageName.trim().length < 2) {
      setError('Please enter your artist or band name.');
      return;
    }

    const numericRate = Number(String(setRate).replace(/[^0-9.]/g, ''));
    if (!numericRate || numericRate <= 0) {
      setError('Please enter a valid set rate.');
      return;
    }

    setSaving(true);
    try {
      const photoToSave = photoPayload !== null ? photoPayload : photoUri || '';

      await apiRequest('/musicians/me', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name: stageName.trim(),
          genre,
          price: numericRate,
          soundSetup,
          serviceArea: serviceArea.trim(),
          bio: bio.trim(),
          photoUrl: photoToSave,
          avatarUrl: photoToSave,
        }),
      });

      loadedKeyRef.current = '';
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }
      setSavedAlertVisible(true);
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your artist profile right now.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingProfile || isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="My profile" />
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="My profile" />
        <View style={styles.centerContent}>
          <Text style={styles.kicker}>ARTIST PROFILE</Text>
          <Text style={styles.title}>Set up your artist profile.</Text>
          <Text style={styles.subtitle}>
            Sign in to manage your performance details, rates, and availability.
          </Text>
          <HoverPressable
            onPress={() => router.push('/auth')}
            style={styles.primaryButton}
            hoverStyle={styles.primaryButtonHovered}
          >
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </HoverPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="My profile" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>ARTIST PROFILE</Text>
          <Text style={styles.title}>Your artist profile.</Text>
          <Text style={styles.subtitle}>
            Configure how event hosts discover your sound, set rates, and equipment setup.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Artist or band photo</Text>
            {photoUri ? (
              <View style={styles.previewWrap}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.coverImage}
                  accessibilityLabel="Artist profile photo"
                />
                <View style={styles.photoActions}>
                  <HoverPressable onPress={pickPhoto} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Change photo</Text>
                  </HoverPressable>
                  <HoverPressable onPress={removePhoto} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </HoverPressable>
                </View>
              </View>
            ) : (
              <HoverPressable onPress={pickPhoto} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Upload photo</Text>
              </HoverPressable>
            )}

            <Text style={styles.label}>Artist or band name</Text>
            <TextInput
              value={stageName}
              onChangeText={setStageName}
              placeholder="e.g. The Acoustic Collective"
              placeholderTextColor={theme.muted}
              style={styles.input}
              accessibilityLabel="Artist or band name"
            />

            <Text style={styles.label}>Primary genre</Text>
            <View style={styles.chipWrap}>
              {GENRES.map((item) => {
                const active = genre === item;
                return (
                  <HoverPressable
                    key={item}
                    onPress={() => setGenre(item)}
                    style={[styles.chip, active && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextSelected]}>{item}</Text>
                  </HoverPressable>
                );
              })}
            </View>

            <Text style={styles.label}>Set rate (per 45-min set)</Text>
            <TextInput
              value={setRate}
              onChangeText={setSetRate}
              placeholder="e.g. 5000"
              placeholderTextColor={theme.muted}
              keyboardType="numeric"
              style={styles.input}
              accessibilityLabel="Set rate"
            />

            <Text style={styles.label}>Sound setup</Text>
            <View style={styles.chipWrap}>
              {SOUND_OPTIONS.map((option) => {
                const active = soundSetup === option;
                return (
                  <HoverPressable
                    key={option}
                    onPress={() => setSoundSetup(option)}
                    style={[styles.chip, active && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextSelected]}>{option}</Text>
                  </HoverPressable>
                );
              })}
            </View>

            <Text style={styles.label}>Service area / city</Text>
            <TextInput
              value={serviceArea}
              onChangeText={setServiceArea}
              placeholder="e.g. Iloilo City"
              placeholderTextColor={theme.muted}
              style={styles.input}
              accessibilityLabel="Service area or city"
            />

            <Text style={styles.label}>Bio &amp; performance notes</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Describe your setlist, live experience, and gear..."
              placeholderTextColor={theme.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.input, styles.textArea]}
              accessibilityLabel="Bio and performance notes"
            />
          </View>

          <HoverPressable
            onPress={handleSaveProfile}
            disabled={saving}
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            hoverStyle={styles.primaryButtonHovered}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save artist profile</Text>
            )}
          </HoverPressable>

          <HoverPressable onPress={() => router.push('/verify-id')} style={styles.secondaryLink}>
            <Text style={styles.secondaryLinkText}>ID verification status</Text>
          </HoverPressable>

          <HoverPressable onPress={() => router.push('/')} style={styles.secondaryLink}>
            <Text style={styles.secondaryLinkText}>Back to discover</Text>
          </HoverPressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppAlert
        visible={savedAlertVisible}
        title="Profile saved"
        message="Your artist profile has been updated."
        onDismiss={() => {
          setSavedAlertVisible(false);
          router.replace('/');
        }}
      />
      <AppAlert
        visible={Boolean(error)}
        title="Could not save profile"
        message={error}
        onDismiss={() => setError('')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  keyboardAvoiding: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  content: {
    width: '92%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingTop: 28,
    paddingBottom: 48,
    flexGrow: 1,
  },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 34, lineHeight: 40, marginTop: 10 },
  subtitle: { color: theme.muted, fontSize: 13, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  card: {
    backgroundColor: '#F6F1EA',
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FBF9F6',
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: theme.text,
    fontSize: 13,
    minHeight: 46,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
  },
  previewWrap: {
    gap: 10,
  },
  coverImage: {
    width: '100%',
    height: 190,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#EAE1D7',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: '#FBF9F6',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  removeButton: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FBF9F6',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  removeButtonText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FBF9F6',
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  chipText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: theme.accentDark,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 6,
  },
  primaryButtonHovered: {
    opacity: 0.92,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryLinkText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});