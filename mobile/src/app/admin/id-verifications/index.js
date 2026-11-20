import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../../../components/AppHeader';
import HoverPressable from '../../../components/HoverPressable';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../services/api';
import { theme } from '../../../styles/theme';

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

const statusChipStyles = {
  pending: { backgroundColor: '#EAE1D7', borderColor: '#D8C9B8', color: theme.accent },
  approved: { backgroundColor: '#E8EFE4', borderColor: '#C4D1BD', color: '#36543B' },
  rejected: { backgroundColor: '#F2E5E1', borderColor: '#D7B5AC', color: '#8D4C3E' },
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

export default function AdminIdVerificationQueueScreen() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQueue = useCallback(async () => {
    if (!token || user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError('');
      const data = await apiRequest(`/admin/id-verifications?status=${statusFilter}`, { token });
      setItems(data.items || []);
      setCount(data.count || 0);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load the ID verification queue.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, statusFilter]);

  useEffect(() => {
    Promise.resolve().then(loadQueue);
  }, [loadQueue]);

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
          <Text style={styles.title}>ID verifications.</Text>
          <Text style={styles.subtitle}>This area is restricted to Gigmatch administrators.</Text>
          <HoverPressable onPress={() => router.push('/auth')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </HoverPressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => {
    const submission = item.idVerification || {};
    const chip = statusChipStyles[submission.status] || statusChipStyles.pending;
    return (
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={`Review ID submission from ${item.name}`}
        onPress={() => router.push(`/admin/id-verifications/${item._id}`)}
        style={styles.card}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardMain}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardEmail}>{item.email}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: chip.backgroundColor, borderColor: chip.borderColor }]}>
            <Text style={[styles.statusChipText, { color: chip.color }]}>{(submission.status || 'pending').toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardMeta}>{submission.idDocumentType || 'ID'}</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMeta}>{item.role === 'musician' ? 'Musician' : 'Event host'}</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMeta}>Submitted {formatDate(submission.submittedAt)}</Text>
        </View>
      </HoverPressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Admin" />
      <View style={styles.body}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>ADMIN · ACCOUNT SECURITY</Text>
          <Text style={styles.title}>ID verifications.</Text>
          <Text style={styles.subtitle}>Government IDs uploaded by new accounts. Approve to mark an account verified; reject to request a better photo.</Text>
        </View>

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((option) => (
            <HoverPressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === option }}
              onPress={() => setStatusFilter(option)}
              style={[styles.filterOption, statusFilter === option && styles.filterOptionSelected]}
            >
              <Text style={[styles.filterText, statusFilter === option && styles.filterTextSelected]}>{option.toUpperCase()}</Text>
            </HoverPressable>
          ))}
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No {statusFilter === 'all' ? '' : statusFilter + ' '}ID submissions right now.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListHeaderComponent={<Text style={styles.countNote}>{count} submission{count === 1 ? '' : 's'}</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  body: { flex: 1 },
  heading: { width: '90%', maxWidth: 860, alignSelf: 'center', paddingTop: 30, paddingHorizontal: 0 },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 32, marginTop: 8 },
  subtitle: { color: theme.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '90%', maxWidth: 860, alignSelf: 'center', marginBottom: 14 },
  filterOption: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingVertical: 8, paddingHorizontal: 14 },
  filterOptionSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  filterText: { color: theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  filterTextSelected: { color: '#fff' },
  error: { color: '#9B2C20', backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 10, fontSize: 12, width: '90%', maxWidth: 860, alignSelf: 'center', marginBottom: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyCard: { width: '90%', maxWidth: 860, alignSelf: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', padding: 24 },
  emptyText: { color: theme.muted, fontSize: 13, textAlign: 'center' },
  list: { width: '90%', maxWidth: 860, alignSelf: 'center', paddingBottom: 40 },
  countNote: { color: theme.muted, fontSize: 11, fontWeight: '600', marginBottom: 10 },
  card: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', padding: 14, marginBottom: 10 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardMain: { flex: 1 },
  cardName: { color: theme.accent, fontSize: 15, fontWeight: '700' },
  cardEmail: { color: theme.muted, fontSize: 12, marginTop: 2 },
  statusChip: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  cardMeta: { color: theme.muted, fontSize: 11 },
  cardMetaDot: { color: theme.muted, fontSize: 11 },
  primaryButton: { backgroundColor: theme.accentDark, minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
});
