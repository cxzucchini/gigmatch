import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppHeader from '../../../components/AppHeader';
import AppAlert from '../../../components/AppAlert';
import HoverPressable from '../../../components/HoverPressable';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../services/api';
import { theme } from '../../../styles/theme';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

export default function AdminIdVerificationReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [approvedAlert, setApprovedAlert] = useState(false);
  const [rejectedAlert, setRejectedAlert] = useState(false);

  const loadSubmission = useCallback(async () => {
    if (!token || user?.role !== 'admin' || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError('');
      const data = await apiRequest(`/admin/id-verifications/${id}`, { token });
      setSubmission(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load this ID submission.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, id]);

  useEffect(() => {
    Promise.resolve().then(loadSubmission);
  }, [loadSubmission]);

  const handleApprove = async () => {
    setActing(true);
    setActionError('');
    try {
      const updated = await apiRequest(`/admin/id-verifications/${id}/approve`, { method: 'POST', token });
      setSubmission(updated);
      setApprovedAlert(true);
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to approve this submission.');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setActionError('Write a short reason so the member knows what to fix.');
      return;
    }
    setActing(true);
    setActionError('');
    try {
      const updated = await apiRequest(`/admin/id-verifications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
        token,
      });
      setSubmission(updated);
      setRejectedAlert(true);
    } catch (requestError) {
      setActionError(requestError.message || 'Unable to reject this submission.');
    } finally {
      setActing(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Admin" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Admin" />
        <View style={styles.centerContent}>
          <Text style={styles.title}>Review ID.</Text>
          <Text style={styles.subtitle}>This area is restricted to Gigmatch administrators.</Text>
          <HoverPressable onPress={() => router.push('/auth')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </HoverPressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Admin" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  if (error || !submission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Admin" />
        <View style={styles.centerContent}>
          <Text style={styles.title}>Review ID.</Text>
          <Text accessibilityRole="alert" style={styles.error}>{error || 'ID submission not found.'}</Text>
          <HoverPressable onPress={() => router.push('/admin/id-verifications')} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Back to queue</Text>
          </HoverPressable>
        </View>
      </SafeAreaView>
    );
  }

  const verification = submission.idVerification || {};
  const isPending = verification.status === 'pending';
  const statusChip = {
    pending: { backgroundColor: '#EAE1D7', borderColor: '#D8C9B8', color: theme.accent },
    approved: { backgroundColor: '#E8EFE4', borderColor: '#C4D1BD', color: '#36543B' },
    rejected: { backgroundColor: '#F2E5E1', borderColor: '#D7B5AC', color: '#8D4C3E' },
  }[verification.status] || { backgroundColor: '#EAE1D7', borderColor: '#D8C9B8', color: theme.accent };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Admin" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>ADMIN · ID REVIEW</Text>
        <Text style={styles.title}>Review ID.</Text>
        <Text style={styles.subtitle}>Check that the name and photo are legible before approving.</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.detailMain}>
              <Text style={styles.detailLabel}>MEMBER</Text>
              <Text style={styles.detailValue}>{submission.name}</Text>
              <Text style={styles.detailSub}>{submission.email}</Text>
              <Text style={styles.detailSub}>{submission.role === 'musician' ? 'Musician' : 'Event host'}{submission.isVerified ? ' · verified' : ' · not verified'}</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusChip.backgroundColor, borderColor: statusChip.borderColor }]}>
              <Text style={[styles.statusChipText, { color: statusChip.color }]}>{(verification.status || 'pending').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.detailLabel}>ID TYPE</Text>
          <Text style={styles.detailValue}>{verification.idDocumentType || '—'}</Text>
          <Text style={styles.detailLabel}>SUBMITTED</Text>
          <Text style={styles.detailSub}>{formatDate(verification.submittedAt)}</Text>
          {verification.reviewedAt ? (
            <>
              <Text style={styles.detailLabel}>REVIEWED</Text>
              <Text style={styles.detailSub}>{formatDate(verification.reviewedAt)}{verification.reviewedBy ? ` · by ${verification.reviewedBy}` : ''}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.detailLabel}>ID PHOTO</Text>
          {verification.idDocumentUrl ? (
            <Image
              source={{ uri: verification.idDocumentUrl }}
              style={styles.idImage}
              resizeMode="contain"
              accessible
              accessibilityLabel="Uploaded government ID photo"
            />
          ) : (
            <Text style={styles.detailSub}>No photo attached.</Text>
          )}
        </View>

        {isPending ? (
          <View style={styles.card}>
            <Text style={styles.detailLabel}>DECISION</Text>
            <Text style={styles.rejectHint}>Rejecting asks the member to upload a clearer photo. Add a short reason:</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Photo is blurry, please retake in good light"
              placeholderTextColor={theme.muted}
              multiline
              style={styles.rejectInput}
            />
            {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
            <View style={styles.actionRow}>
              <HoverPressable
                accessibilityRole="button"
                accessibilityLabel="Approve ID verification"
                disabled={acting}
                onPress={handleApprove}
                style={[styles.primaryButton, acting && styles.buttonDisabled]}
              >
                <Text style={styles.primaryButtonText}>{acting ? 'Saving…' : 'Approve'}</Text>
              </HoverPressable>
              <HoverPressable
                accessibilityRole="button"
                accessibilityLabel="Reject ID verification"
                disabled={acting}
                onPress={handleReject}
                style={[styles.secondaryButton, acting && styles.buttonDisabled]}
              >
                <Text style={styles.secondaryButtonText}>Reject</Text>
              </HoverPressable>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.detailLabel}>DECISION</Text>
            <Text style={styles.detailSub}>This submission was already {verification.status}. No further action is needed.</Text>
            {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
          </View>
        )}

        <HoverPressable onPress={() => router.push('/admin/id-verifications')} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back to queue</Text>
        </HoverPressable>
      </ScrollView>

      <AppAlert
        visible={approvedAlert}
        title="ID approved"
        message="The member's account is now marked verified."
        onDismiss={() => {
          setApprovedAlert(false);
          router.replace('/admin/id-verifications');
        }}
      />
      <AppAlert
        visible={rejectedAlert}
        title="ID rejected"
        message="The submission was rejected. The member can upload a new photo."
        onDismiss={() => {
          setRejectedAlert(false);
          router.replace('/admin/id-verifications');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  content: { width: '90%', maxWidth: 720, alignSelf: 'center', paddingTop: 30, paddingBottom: 40 },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 32, marginTop: 8 },
  subtitle: { color: theme.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 16 },
  card: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', padding: 16, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  detailMain: { flex: 1 },
  detailLabel: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 10, marginBottom: 4 },
  detailValue: { color: theme.accent, fontSize: 16, fontWeight: '700' },
  detailSub: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  statusChip: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  idImage: { width: '100%', height: 320, borderWidth: 1, borderColor: theme.border, backgroundColor: '#fff', marginTop: 8 },
  rejectHint: { color: theme.muted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  rejectInput: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', color: theme.text, fontSize: 13, padding: 10, minHeight: 64, textAlignVertical: 'top', marginBottom: 4 },
  error: { color: '#9B2C20', backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 10, fontSize: 12, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryButton: { flex: 1, backgroundColor: theme.accentDark, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: theme.accent, backgroundColor: 'transparent', minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { color: theme.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  buttonDisabled: { opacity: 0.6 },
  backLink: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 20 },
  backLinkText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
});
