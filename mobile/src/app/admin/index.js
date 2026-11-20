import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import HoverPressable from '../../components/HoverPressable';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { theme } from '../../styles/theme';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    if (!token || user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    try {
      setError('');
      const data = await apiRequest('/admin/stats', { token });
      setStats(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load admin stats.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    Promise.resolve().then(loadStats);
  }, [loadStats]);

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
          <Text style={styles.title}>Admin console.</Text>
          <Text style={styles.subtitle}>This area is restricted to Gigmatch administrators.</Text>
          <HoverPressable onPress={() => router.push('/auth')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </HoverPressable>
        </View>
      </SafeAreaView>
    );
  }

  const statCards = [
    {
      label: 'Musician verifications pending',
      value: stats ? stats.pendingMusicianVerifications : null,
      route: '/admin/verifications',
      urgent: stats ? stats.pendingMusicianVerifications > 0 : false,
    },
    {
      label: 'ID verifications pending',
      value: stats ? stats.pendingIdVerifications : null,
      route: '/admin/id-verifications',
      urgent: stats ? stats.pendingIdVerifications > 0 : false,
    },
    { label: 'Registered users', value: stats ? stats.totalUsers : null },
    { label: 'Musician profiles', value: stats ? stats.totalMusicians : null },
    { label: 'Bookings', value: stats ? stats.totalBookings : null },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Admin" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>ADMIN CONSOLE</Text>
        <Text style={styles.title}>Admin overview.</Text>
        <Text style={styles.subtitle}>Review verification queues and keep the Gigmatch community safe.</Text>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((card) => {
              const body = (
                <>
                  <Text style={[styles.statValue, card.urgent && styles.statValueUrgent]}>
                    {card.value == null ? '—' : card.value}
                  </Text>
                  <Text style={styles.statLabel}>{card.label}</Text>
                  {card.route ? <Text style={styles.statAction}>Open queue →</Text> : null}
                </>
              );
              return card.route ? (
                <HoverPressable
                  key={card.label}
                  accessibilityRole="button"
                  accessibilityLabel={card.label}
                  onPress={() => router.push(card.route)}
                  style={[styles.statCard, card.urgent && styles.statCardUrgent]}
                >
                  {body}
                </HoverPressable>
              ) : (
                <View key={card.label} style={styles.statCard}>
                  {body}
                </View>
              );
            })}
          </View>
        )}
        <AppFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  content: { width: '90%', maxWidth: 860, alignSelf: 'center', paddingTop: 36, paddingBottom: 40, flexGrow: 1 },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 36, marginTop: 10 },
  subtitle: { color: theme.muted, fontSize: 13, lineHeight: 21, marginTop: 9, marginBottom: 20 },
  error: { color: '#9B2C20', backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 10, fontSize: 12, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flexGrow: 1, flexBasis: 220, borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', padding: 16 },
  statCardUrgent: { borderColor: '#D7B5AC', backgroundColor: '#F2E5E1' },
  statValue: { color: theme.accent, fontFamily: 'Georgia', fontSize: 32 },
  statValueUrgent: { color: '#8D4C3E' },
  statLabel: { color: theme.muted, fontSize: 12, fontWeight: '600', marginTop: 6 },
  statAction: { color: theme.accent, fontSize: 11, fontWeight: '700', marginTop: 10 },
  primaryButton: { backgroundColor: theme.accentDark, minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
});
