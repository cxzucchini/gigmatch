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

async function buildAvatarPayload(asset) {
  if (!asset) return null;
  if (asset.base64 && typeof asset.base64 === 'string') {
    const rawMime = asset.mimeType || '';
    const mimeType = rawMime.startsWith('image/') ? rawMime : 'image/jpeg';
    const rawDataUrl = `data:${mimeType};base64,${asset.base64}`;
    return compressWebDataUrl(rawDataUrl, 800, 0.65);
  }
  return asset.uri || null;
}

export default function ClientProfileScreen() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user || null;
  const token = auth?.token || null;
  const authLoading = Boolean(auth?.loading);
  const refreshUser = auth?.refreshUser;

  const userId = user?._id || user?.id || '';
  const userRole = user?.role || '';
  const isAdmin = userRole === 'admin';

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarPayload, setAvatarPayload] = useState(null);

  const [error, setError] = useState('');
  const [savedAlertVisible, setSavedAlertVisible] = useState(false);
  const loadedKeyRef = useRef('');

  const loadClientProfile = useCallback(async () => {
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

    setFullName(user?.name || '');
    const initialAvatar = user?.avatarUrl || user?.profilePicture || user?.avatar || null;
    if (initialAvatar) {
      setAvatarUri(initialAvatar);
      setAvatarPayload(initialAvatar);
    }

    try {
      const data = await apiRequest('/users/me/profile', { token });
      const profile = data?.profile || data || {};
      if (profile.name) setFullName(profile.name);
      if (profile.phone) setPhone(profile.phone);
      if (profile.city || profile.location) setCity(profile.city || profile.location);
      if (profile.bio || profile.notes) setBio(profile.bio || profile.notes);
      const savedAvatar =
        profile.avatarUrl || profile.profilePicture || profile.avatar || null;
      if (savedAvatar) {
        setAvatarUri(savedAvatar);
        setAvatarPayload(savedAvatar);
      }
    } catch {
      // Keep defaults from auth user if no saved profile exists yet.
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
    loadClientProfile();
  }, [authLoading, isAdmin, loadClientProfile, router]);

  const pickAvatarImage = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const previewUri = asset.uri || null;
        const payload = await buildAvatarPayload(asset);

        if (!previewUri && !payload) {
          setError('Please choose a valid profile photo.');
          return;
        }

        if (typeof payload === 'string' && payload.length > 3_200_000) {
          setError('Profile photo is too large. Please choose a smaller image.');
          return;
        }

        setAvatarUri(previewUri || payload);
        setAvatarPayload(payload || previewUri);
      }
    } catch {
      setError('Could not open your photo library. Please try again.');
    }
  };

  const removeAvatarImage = () => {
    setAvatarUri(null);
    setAvatarPayload('');
  };

  const handleSaveProfile = async () => {
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your name (at least 2 characters).');
      return;
    }

    if (phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) {
      setError('Please enter a valid contact number.');
      return;
    }

    setSaving(true);
    try {
      const photoToSave = avatarPayload !== null ? avatarPayload : avatarUri || '';

      await apiRequest('/users/me/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          bio: bio.trim(),
          avatarUrl: photoToSave,
          profilePicture: photoToSave,
        }),
      });

      loadedKeyRef.current = '';
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }
      setSavedAlertVisible(true);
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your profile right now.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingProfile || isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Account" />
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Account" />
        <View style={styles.centerContent}>
          <Text style={styles.kicker}>CLIENT PROFILE</Text>
          <Text style={styles.title}>Set up your profile.</Text>
          <Text style={styles.subtitle}>
            Sign in to view and update your account profile.
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

  const initials = (fullName || user.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Account" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>CLIENT PROFILE</Text>
          <Text style={styles.title}>Your profile.</Text>
          <Text style={styles.subtitle}>
            Manage your profile photo and basic account details.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Profile picture</Text>
            <View style={styles.avatarRow}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  accessibilityLabel="Client profile picture"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}

              <View style={styles.avatarActions}>
                <HoverPressable
                  onPress={pickAvatarImage}
                  style={styles.secondaryButton}
                  hoverStyle={styles.secondaryButtonHovered}
                >
                  <Text style={styles.secondaryButtonText}>
                    {avatarUri ? 'Change photo' : 'Upload photo'}
                  </Text>
                </HoverPressable>

                {avatarUri ? (
                  <HoverPressable
                    onPress={removeAvatarImage}
                    style={styles.removePhotoButton}
                  >
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </HoverPressable>
                ) : null}
              </View>
            </View>

            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={theme.muted}
              style={styles.input}
              accessibilityLabel="Full name"
            />

            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={user.email || ''}
              editable={false}
              style={[styles.input, styles.inputReadonly]}
              accessibilityLabel="Email address"
            />

            <Text style={styles.label}>Phone number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 09XX XXX XXXX"
              placeholderTextColor={theme.muted}
              keyboardType="phone-pad"
              style={styles.input}
              accessibilityLabel="Phone number"
            />

            <Text style={styles.label}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Iloilo City"
              placeholderTextColor={theme.muted}
              style={styles.input}
              accessibilityLabel="City"
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="A short note about you..."
              placeholderTextColor={theme.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.input, styles.textArea]}
              accessibilityLabel="Bio"
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
              <Text style={styles.primaryButtonText}>Save profile</Text>
            )}
          </HoverPressable>

          <HoverPressable
            onPress={() => router.push('/')}
            style={styles.secondaryLink}
          >
            <Text style={styles.secondaryLinkText}>Back to home</Text>
          </HoverPressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppAlert
        visible={savedAlertVisible}
        title="Profile saved"
        message="Your profile has been updated."
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#EAE1D7',
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#EAE1D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: theme.accent,
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '700',
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: '#FBF9F6',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  secondaryButtonHovered: {
    backgroundColor: '#EAE1D7',
  },
  secondaryButtonText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  removePhotoButton: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FBF9F6',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  removePhotoText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
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
  inputReadonly: {
    backgroundColor: '#EAE1D7',
    color: theme.muted,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
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
    paddingVertical: 14,
  },
  secondaryLinkText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});