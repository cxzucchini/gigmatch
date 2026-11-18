import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { theme } from '../../styles/theme';

const formatRelative = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function MessagesScreen() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const loadConversations = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/bookings/mine', { token });
      setConversations(result.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Load state is managed by this async request and its completion handlers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  const partnerNameOf = (conversation) => (user?.role === 'musician'
    ? (conversation.client?.name || 'Client')
    : (conversation.musician?.user?.name || 'Musician'));

  const openThread = (conversation) => {
    router.push({
      pathname: '/messages/[bookingId]',
      params: {
        bookingId: String(conversation._id),
        eventType: conversation.eventType || 'Event details',
        contactName: partnerNameOf(conversation),
      },
    });
  };

  // Deleting a chat clears the message thread for both participants; the
  // booking itself stays. First tap arms the button, second tap confirms.
  const deleteChat = async (conversation) => {
    const id = String(conversation._id);
    if (deletingId) return;
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    setDeletingId(id);
    setError('');
    try {
      await apiRequest(`/bookings/${id}/messages`, { method: 'DELETE', token });
      setPendingDeleteId('');
      setNotice(`Chat with ${partnerNameOf(conversation)} deleted. The conversation was cleared for both of you; the booking remains.`);
    } catch (requestError) {
      setError(requestError.message);
      setPendingDeleteId('');
    } finally {
      setDeletingId('');
    }
  };

  useEffect(() => {
    // Disarm an armed delete button if the user does not confirm in time.
    if (!pendingDeleteId) return undefined;
    const timeout = setTimeout(() => setPendingDeleteId(''), 4000);
    return () => clearTimeout(timeout);
  }, [pendingDeleteId]);

  if (authLoading || loading && token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Messages" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Messages" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>YOUR GIGMATCH</Text>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>{user ? 'Coordinate the details of each booking with your event partner.' : 'Sign in to see your booking conversations.'}</Text>

        {!user ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your conversations live here.</Text>
            <Pressable onPress={() => router.push('/auth')} style={[styles.button, styles.emptyButton]}>
              <Text style={styles.buttonText}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadConversations}><Text style={styles.retry}>RETRY</Text></Pressable>
          </View>
        ) : null}

        {user && !error && conversations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No conversations yet.</Text>
            <Text style={styles.emptyCopy}>Message a booking partner from My bookings and the thread will appear here.</Text>
            <Pressable onPress={() => router.push('/bookings')} style={[styles.button, styles.emptyButton]}>
              <Text style={styles.buttonText}>Go to bookings</Text>
            </Pressable>
          </View>
        ) : null}

        {notice ? (
          <View style={styles.noticeBox}>
            <Text accessibilityRole="alert" style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {conversations.map((conversation) => {
            const partnerName = partnerNameOf(conversation);
            const id = String(conversation._id);
            const armed = pendingDeleteId === id;
            const busy = deletingId === id;
            const eventDateLabel = conversation.eventDate
              ? new Date(conversation.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
              : '';
            return (
              <Pressable key={id} onPress={() => openThread(conversation)} style={styles.conversationCard}>
                <View style={styles.conversationMain}>
                  <Text style={styles.conversationName}>{partnerName}</Text>
                  <Text style={styles.conversationEvent}>{conversation.eventType}{eventDateLabel ? ` · ${eventDateLabel}` : ''}</Text>
                  <Text style={styles.conversationStatus}>Booking {conversation.status}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Pressable onPress={() => openThread(conversation)} style={styles.viewChatLink}>
                    <Text style={styles.conversationCta}>View chat →</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteChat(conversation)}
                    disabled={Boolean(deletingId)}
                    accessibilityLabel={`Delete chat with ${partnerName}`}
                    style={[styles.deleteChatButton, armed && styles.deleteChatConfirm]}
                  >
                    <Text style={[styles.deleteChatText, armed && styles.deleteChatConfirmText]}>
                      {busy ? '…' : armed ? 'Confirm?' : '🗑'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
        <AppFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  content: { width: '90%', maxWidth: 780, alignSelf: 'center', paddingTop: 38, paddingBottom: 0, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 38, marginTop: 10 },
  subtitle: { color: theme.muted, fontSize: 14, marginTop: 8, marginBottom: 24 },
  empty: { alignItems: 'center', backgroundColor: '#F6F1EA', borderWidth: 1, borderColor: theme.border, padding: 28, marginTop: 12 },
  emptyTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 24, textAlign: 'center' },
  emptyCopy: { color: theme.muted, fontSize: 13, marginTop: 10, textAlign: 'center' },
  list: { gap: 12, marginTop: 4 },
  conversationCard: { backgroundColor: '#F6F1EA', borderWidth: 1, borderColor: theme.border, padding: 18, gap: 4 },
  conversationMain: { gap: 4 },
  conversationName: { color: theme.accent, fontFamily: 'Georgia', fontSize: 20 },
  conversationEvent: { color: theme.muted, fontSize: 12 },
  conversationStatus: { color: theme.muted, fontSize: 11, textTransform: 'capitalize' },
  conversationCta: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  viewChatLink: { minHeight: 36, justifyContent: 'center' },
  deleteChatButton: { minWidth: 38, height: 38, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E4B9B0', backgroundColor: '#F8E8E4', alignItems: 'center', justifyContent: 'center' },
  deleteChatText: { color: '#9B2C20', fontSize: 13, fontWeight: '700' },
  deleteChatConfirm: { backgroundColor: '#9B2C20', borderColor: '#9B2C20' },
  deleteChatConfirmText: { color: '#fff', fontSize: 11 },
  noticeBox: { backgroundColor: '#E8F0E4', borderWidth: 1, borderColor: '#B7CDB0', padding: 12, marginTop: 4, marginBottom: 12 },
  noticeText: { color: '#3D6632', fontSize: 12 },
  button: { backgroundColor: theme.accent, paddingVertical: 10, paddingHorizontal: 16, minHeight: 40, justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyButton: { marginTop: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 12, marginBottom: 16 },
  errorText: { color: '#9B2C20', fontSize: 12, flex: 1 },
  retry: { color: theme.accent, fontSize: 9, fontWeight: '700' },
});
