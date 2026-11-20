import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../components/AppHeader';
import AppAlert from '../components/AppAlert';
import HoverPressable from '../components/HoverPressable';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { theme } from '../styles/theme';

const ID_TYPES = ['Passport', "Driver's License", 'National ID (PhilID)', 'UMID', "Voter's ID", 'PRC ID'];

export default function VerifyIdScreen() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [verification, setVerification] = useState(null);
  const [idType, setIdType] = useState('');
  const [idImageUri, setIdImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSubmitted, setShowSubmitted] = useState(false);

  const destination = user?.role === 'musician' ? '/musician/profile' : '/';

  const loadStatus = useCallback(async () => {
    if (!token) {
      setChecking(false);
      return;
    }
    try {
      const data = await apiRequest('/auth/verify-id', { token });
      setVerification(data.verification || null);
      if (data.verification && data.verification.submittedAt && data.verification.status !== 'rejected') {
        setIdType(data.verification.idDocumentType || '');
        setIdImageUri(data.verification.idDocumentUrl || null);
      }
    } catch {
      // New accounts have no submission yet; show the form.
    } finally {
      setChecking(false);
    }
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(loadStatus);
  }, [loadStatus]);

  // A real submission always has submittedAt; schema defaults alone produce a
  // status-less 'pending' subdocument for accounts that never uploaded anything.
  const alreadySubmitted = Boolean(verification && verification.submittedAt);

  const pickIdImage = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIdImageUri(result.assets[0].uri);
      }
    } catch {
      setError('Could not open your photo library. Please try again.');
    }
  };

  const removeIdImage = () => {
    setIdImageUri(null);
  };

  const submitVerification = async () => {
    setError('');
    if (!idType) {
      setError('Choose the type of ID you are uploading.');
      return;
    }
    if (!idImageUri) {
      setError('Upload a clear photo of your ID.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest('/auth/verify-id', {
        method: 'POST',
        token,
        body: JSON.stringify({ idDocumentType: idType, idDocumentUrl: idImageUri }),
      });
      setVerification(data.verification);
      setShowSubmitted(true);
    } catch (requestError) {
      setError(requestError.message || 'Unable to submit your ID right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || checking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Account" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Account" />
        <View style={styles.centerContent}>
          <Text style={styles.title}>Verify your identity.</Text>
          <Text style={styles.subtitle}>Sign in to complete the required ID verification for your account.</Text>
          <HoverPressable onPress={() => router.push('/auth')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </HoverPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Account" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>ACCOUNT SECURITY</Text>
        <Text style={styles.title}>Verify your identity.</Text>
        <Text style={styles.subtitle}>
          To keep Gigmatch safe for everyone, every new account must upload one valid government-issued ID.
          Your ID is reviewed only by the Gigmatch trust &amp; safety team and is never shown to other users.
        </Text>

        {alreadySubmitted ? (
          <View style={styles.submittedCard}>
            <Text style={styles.submittedTitle}>
              {verification.status === 'approved' ? 'Your ID is verified.' : 'Your ID is under review.'}
            </Text>
            <Text style={styles.submittedText}>
              {verification.status === 'approved'
                ? 'Thank you — your account is fully verified and you have full access to Gigmatch.'
                : `We received your ${verification.idDocumentType || 'ID'}. Verification usually takes 1–2 days, but you can start using Gigmatch now.`}
            </Text>
            {idImageUri ? (
              <Image source={{ uri: idImageUri }} style={styles.idPreview} accessibilityLabel="Uploaded ID photo" />
            ) : null}
            <HoverPressable onPress={() => router.replace(destination)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Continue to Gigmatch</Text>
            </HoverPressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Choose your ID type</Text>
            <View style={styles.typeGrid}>
              {ID_TYPES.map((option) => (
                <HoverPressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${option}`}
                  accessibilityState={{ selected: idType === option }}
                  onPress={() => setIdType(option)}
                  style={[styles.typeOption, idType === option && styles.typeOptionSelected]}
                >
                  <Text style={[styles.typeText, idType === option && styles.typeTextSelected]}>{option}</Text>
                </HoverPressable>
              ))}
            </View>

            <Text style={styles.label}>Upload a photo of your ID</Text>
            {idImageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: idImageUri }} style={styles.idPreview} accessibilityLabel="Selected ID photo" />
                <HoverPressable onPress={removeIdImage} style={styles.removeImageButton}>
                  <Text style={styles.removeImageText}>Remove photo</Text>
                </HoverPressable>
              </View>
            ) : (
              <HoverPressable onPress={pickIdImage} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>Choose ID photo</Text>
              </HoverPressable>
            )}
            <Text style={styles.note}>
              Make sure the whole ID is visible, in focus, with no glare. Accepted: Passport, Driver&apos;s License,
              National ID (PhilID), UMID, Voter&apos;s ID, or PRC ID.
            </Text>

            <HoverPressable
              onPress={submitVerification}
              disabled={submitting || !idType || !idImageUri}
              style={[styles.primaryButton, (!idType || !idImageUri || submitting) && styles.buttonDisabled]}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Submit for verification</Text>}
            </HoverPressable>
            <Text style={styles.requiredNote}>ID verification is required to finish creating your account.</Text>
          </>
        )}
      </ScrollView>

      <AppAlert
        visible={showSubmitted}
        title="Verification submitted"
        message="Thank you! Your ID has been submitted for review. You can start using Gigmatch while we verify it."
        onDismiss={() => {
          setShowSubmitted(false);
          router.replace(destination);
        }}
      />
      <AppAlert
        visible={Boolean(error)}
        title="Verification problem"
        message={error}
        onDismiss={() => setError('')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  content: { width: '90%', maxWidth: 560, alignSelf: 'center', paddingTop: 36, paddingBottom: 40, flexGrow: 1 },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 36, marginTop: 10 },
  subtitle: { color: theme.muted, fontSize: 13, lineHeight: 21, marginTop: 9, marginBottom: 20 },
  label: { color: theme.accent, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { flexGrow: 1, flexBasis: 150, minHeight: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingVertical: 10, paddingHorizontal: 12 },
  typeOptionSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  typeText: { color: theme.accent, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  typeTextSelected: { color: '#fff' },
  uploadButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.accent, paddingVertical: 11, paddingHorizontal: 18 },
  uploadButtonText: { color: theme.accent, fontSize: 13, fontWeight: '700' },
  previewContainer: { alignItems: 'flex-start', marginBottom: 4 },
  idPreview: { width: 240, height: 150, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  removeImageButton: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  removeImageText: { color: theme.text, fontSize: 11, fontWeight: '600' },
  note: { color: theme.muted, fontSize: 11, lineHeight: 18, marginTop: 12, marginBottom: 6 },
  primaryButton: { backgroundColor: theme.accentDark, minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  buttonDisabled: { opacity: 0.6 },
  requiredNote: { color: theme.muted, fontSize: 10, lineHeight: 16, marginTop: 10, textAlign: 'center' },
  submittedCard: { borderWidth: 1, borderColor: '#C4D1BD', backgroundColor: '#E8EFE4', padding: 18 },
  submittedTitle: { color: '#36543B', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  submittedText: { color: '#36543B', fontSize: 12, lineHeight: 19, marginBottom: 10 },
});
