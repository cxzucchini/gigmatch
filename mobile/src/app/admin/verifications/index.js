import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../styles/theme';
import { apiRequest } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AppHeader from '../../../components/AppHeader';
import AppAlert from '../../../components/AppAlert';

const platformIcons = {
  youtube: '▶️',
  instagram: '📷',
  tiktok: '🎵',
  facebook: '📘',
  spotify: '🎧',
  soundcloud: '☁️',
};

export default function AdminVerificationListScreen() {
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadPendingProfiles();
  }, [token]);

  const loadPendingProfiles = async () => {
    if (!token) {
      return;
    }
    try {
      const data = await apiRequest('/admin/verifications/pending', { token });
      setPendingProfiles(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  const renderProfile = ({ item }) => {
  const handleOpenReview = () => router.push(`/admin/verifications/${item._id}`);
  return (
    <TouchableOpacity style={styles.card} onPress={handleOpenReview}>
      <Text style={styles.musicianName}>{item.user?.name}</Text>
      <Text style={styles.musicianInfo}>{item.bio?.substring(0, 100)}...</Text>
      <Text style={styles.genres}>{item.genres?.join(', ')}</Text>
      <View style={styles.statsRow}>
        <Text style={styles.info}>${item.hourlyRate}/hr • {item.serviceArea}</Text>
      </View>
      <View style={styles.socialIcons}>
        {Boolean(item.socialLinks) && Object.keys(item.socialLinks).map((key) => (
          <Text key={key} style={styles.iconText}>{platformIcons[key] || '🔗'}</Text>
        ))}
      </View>
      {Boolean(item.govIdImage) && (
        <Text style={styles.govIdText}>Government ID: provided</Text>
      )}
    </TouchableOpacity>
  );
};

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Verification Queue" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Verification Queue" />
      {error && <AppAlert message={error} type="error" />}
      {pendingProfiles.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No profiles pending verification.</Text>
        </View>
      ) : (
        <FlatList
          data={pendingProfiles}
          keyExtractor={(item) => item._id}
          renderItem={renderProfile}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No pending verifications.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16 },
  card: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  musicianName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.accent,
    marginBottom: 4,
  },
  musicianInfo: {
    fontSize: 13,
    color: theme.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  genres: {
    fontSize: 12,
    color: theme.muted,
    marginBottom: 8,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  info: { fontSize: 12, color: theme.muted },
  socialIcons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  iconText: { fontSize: 18 },
  govIdText: { fontSize: 11, color: theme.muted, fontStyle: 'italic' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: theme.muted, fontSize: 14, textAlign: 'center' },
});