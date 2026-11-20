import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../styles/theme';
import { apiRequest } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AppHeader from '../../../components/AppHeader';
import HoverPressable from '../../../components/HoverPressable';

const platformIcons = {
  youtube: '▶️',
  instagram: '📷',
  tiktok: '🎵',
  facebook: '📘',
  spotify: '🎧',
  soundcloud: '☁️',
};

export default function AdminVerificationReviewScreen() {
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, [id, token]);

  const loadProfile = async () => {
    if (!token || !id) {
      return;
    }
    try {
      const data = await apiRequest(`/admin/verifications/${id}`, { token });
      setProfile(data);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActing(true);
    try {
      await apiRequest(`/admin/verifications/${id}/approve`, {
        method: 'POST',
        token,
        body: JSON.stringify({ notes: 'Verified by admin' }),
      });
      router.push('/admin/verifications');
    } catch (err) {
      setError(err.message || 'Failed to approve');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async (reason) => {
    setActing(true);
    try {
      await apiRequest(`/admin/verifications/${id}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      });
      setProfile({ ...profile, verificationStatus: 'rejected' });
    } catch (err) {
      setError(err.message || 'Failed to reject');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Verification Review" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <AppHeader title="Verification Review" />
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.error}>Profile not found</Text>
      </View>
    );
  }

  const socialKeys = Object.keys(profile.socialLinks || {});

  return (
    <ScrollView style={styles.container}>
      <AppHeader title="Verification Review" />
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Musician Info</Text>
        <Text style={styles.name}>{profile.user?.name}</Text>
        <Text style={styles.info}>{profile.user?.email}</Text>
        <Text style={styles.info}>📍 {profile.serviceArea}</Text>
        <Text style={styles.info}>⏱️ {profile.experienceYears} years experience</Text>
        <Text style={styles.info}>💰 ${profile.hourlyRate}/hr</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Genres</Text>
        <Text style={styles.genres}>{profile.genres?.join(', ')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Links</Text>
        <View style={styles.socialGrid}>
          {socialKeys.map((key) => (
            <View key={key} style={styles.socialItem}>
              <Text style={styles.icon}>{platformIcons[key] || '🔗'}</Text>
              <Text style={styles.socialLabel}>{key}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Government ID</Text>
        {profile.govIdImage ? (
          <Image source={{ uri: profile.govIdImage }} style={styles.idImage} resizeMode="contain" />
        ) : (
          <Text style={styles.info}>No government ID provided</Text>
        )}
      </View>

      {profile.verificationStatus === 'rejected' && (
        <Text style={styles.rejectedNotice}>This profile was rejected.</Text>
      )}

      {profile.verificationStatus !== 'approved' && (
        <View style={styles.actionRow}>
          <HoverPressable
            accessibilityRole="button"
            accessibilityLabel="Approve verification"
            disabled={acting}
            onPress={handleApprove}
            style={[styles.approveButton, acting && styles.buttonDisabled]}
          >
            <Text style={styles.approveButtonText}>{acting ? 'Saving…' : 'Approve'}</Text>
          </HoverPressable>
          <HoverPressable
            accessibilityRole="button"
            accessibilityLabel="Reject verification"
            disabled={acting}
            onPress={() => {
              handleReject('Insufficient documentation');
            }}
            style={[styles.rejectButton, acting && styles.buttonDisabled]}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </HoverPressable>
        </View>
      )}

      {profile.verificationStatus === 'pending' && (
        <Text style={styles.status}>Status: Pending verification</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: theme.muted, textAlign: 'center', marginTop: 20 },
  errorText: {
    color: '#9B2C20',
    backgroundColor: '#F8E8E4',
    borderWidth: 1,
    borderColor: '#E4B9B0',
    padding: 10,
    fontSize: 12,
    margin: 16,
  },
  rejectedNotice: {
    color: '#8D4C3E',
    backgroundColor: '#F2E5E1',
    borderWidth: 1,
    borderColor: '#D7B5AC',
    padding: 12,
    fontSize: 13,
    margin: 16,
  },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.muted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  name: { fontSize: 22, fontWeight: '700', color: theme.accent, marginBottom: 4 },
  info: { fontSize: 13, color: theme.text, marginBottom: 2 },
  genres: { fontSize: 14, color: theme.text },
  bio: { fontSize: 14, lineHeight: 20, color: theme.text },
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  socialItem: { alignItems: 'center' },
  icon: { fontSize: 28, marginBottom: 4 },
  socialLabel: { fontSize: 11, color: theme.muted, textTransform: 'uppercase' },
  idImage: { width: '100%', height: 200, borderWidth: 1, borderColor: theme.border, borderRadius: 8 },
  actionRow: { flexDirection: 'row', gap: 12, padding: 16, justifyContent: 'center' },
  approveButton: {
    flex: 1,
    backgroundColor: theme.accentDark,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButtonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#B85C4B',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: { color: '#8D4C3E', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  buttonDisabled: { opacity: 0.6 },
  status: { padding: 16, textAlign: 'center', color: theme.muted },
});