import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import AppAlert from '../../components/AppAlert';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { theme } from '../../styles/theme';

const formatTime = (date) => new Date(date).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function BookingMessagesScreen() {
  const router = useRouter();
  const { bookingId, eventType, contactName } = useLocalSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [notice, setNotice] = useState('');
  const scrollRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!token || typeof bookingId !== 'string') return;
    try {
      const result = await apiRequest(`/bookings/${bookingId}/messages`, { token });
      setMessages(result.items);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId, token]);

  useEffect(() => {
    // Initial and periodic refreshes update state when their requests settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      await apiRequest(`/bookings/${bookingId}/messages`, {
        method: 'POST',
        token,
        body: JSON.stringify({ text }),
      });
      setDraft('');
      await loadMessages();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  // Deleting the chat clears the whole thread for both participants; the
  // booking itself stays. First tap arms the button, second tap confirms.
  const deleteChat = async () => {
    if (deleting) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await apiRequest(`/bookings/${bookingId}/messages`, { method: 'DELETE', token });
      setMessages([]);
      setConfirmingDelete(false);
      setNotice('Chat deleted. The conversation was cleared for you and your booking partner.');
    } catch (requestError) {
      setError(requestError.message);
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!confirmingDelete) return undefined;
    const timeout = setTimeout(() => setConfirmingDelete(false), 4000);
    return () => clearTimeout(timeout);
  }, [confirmingDelete]);

  // On web, Enter sends the message (Shift+Enter inserts a line break);
  // native platforms keep Enter as a newline and use the Send button.
  const handleComposerKeyPress = (event) => {
    if (Platform.OS !== 'web') return;
    const { key, shiftKey } = event.nativeEvent || {};
    if (key !== 'Enter' || shiftKey) return;
    event.preventDefault();
    sendMessage();
  };

  if (authLoading || loading && token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Bookings" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Bookings" />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back to bookings</Text>
          </Pressable>
          {Boolean(messages.length) && !deleting ? (
            <Pressable
              onPress={deleteChat}
              disabled={deleting}
              accessibilityLabel="Delete chat"
              style={[styles.deleteChatButton, confirmingDelete && styles.deleteChatConfirm]}
            >
              <Text style={[styles.deleteChatText, confirmingDelete && styles.deleteChatConfirmText]}>
                {confirmingDelete ? 'Tap again to confirm' : '🗑 Delete chat'}
              </Text>
            </Pressable>
          ) : null}
          {deleting ? <ActivityIndicator color="#8D3A2D" /> : null}
        </View>
        <Text style={styles.kicker}>BOOKING CONVERSATION</Text>
        <Text style={styles.title}>{typeof eventType === 'string' ? eventType : 'Event details'}</Text>
        <Text style={styles.subtitle}>With {typeof contactName === 'string' ? contactName : 'your booking partner'}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadMessages}><Text style={styles.retry}>RETRY</Text></Pressable>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        >
          {!messages.length && !error ? (
            <Text style={styles.empty}>Start the conversation to coordinate event details, arrival time, and setup.</Text>
          ) : null}
          {messages.map((message) => {
            const isMine = String(message.sender?._id) === String(user?._id);
            return (
              <View key={message._id} style={[styles.messageRow, isMine && styles.myMessageRow]}>
                <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.sender, isMine && styles.mySender]}>{isMine ? 'You' : message.sender?.name || 'Booking partner'}</Text>
                  <Text style={[styles.messageText, isMine && styles.myMessageText]}>{message.text}</Text>
                  <Text style={[styles.timestamp, isMine && styles.myTimestamp]}>{formatTime(message.createdAt)}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message..."
            placeholderTextColor={theme.muted}
            multiline
            maxLength={2000}
            blurOnSubmit={false}
            onKeyPress={handleComposerKeyPress}
            style={styles.input}
            accessibilityLabel="Write a message"
          />
          <Pressable
            onPress={sendMessage}
            disabled={!draft.trim() || sending || !token}
            style={[styles.sendButton, (!draft.trim() || sending || !token) && styles.disabledButton]}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
          </Pressable>
        </View>
      </View>
      <AppAlert
        visible={Boolean(error)}
        title="Message problem"
        message={error}
        onDismiss={() => setError('')}
      />
      <AppAlert
        visible={Boolean(notice)}
        title="Chat deleted"
        message={notice}
        onDismiss={() => setNotice('')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  content: { flex: 1, width: '92%', maxWidth: 860, alignSelf: 'center', paddingTop: 24, paddingBottom: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: theme.accent, fontSize: 13, fontWeight: '600' },
  deleteChatButton: { borderWidth: 1, borderColor: '#8D3A2D', paddingVertical: 7, paddingHorizontal: 14 },
  deleteChatText: { color: '#8D3A2D', fontSize: 11, fontWeight: '700' },
  deleteChatConfirm: { backgroundColor: '#8D3A2D' },
  deleteChatConfirmText: { color: '#fff' },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 32, marginTop: 8 },
  subtitle: { color: theme.muted, fontSize: 13, marginTop: 5, marginBottom: 18 },
  messageList: { flexGrow: 1, gap: 12, paddingVertical: 16 },
  empty: { alignSelf: 'center', color: theme.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 440, marginVertical: 30 },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  myMessageRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: theme.border },
  theirBubble: { backgroundColor: '#F6F1EA' },
  myBubble: { backgroundColor: theme.accent, borderColor: theme.accent },
  sender: { color: theme.accent, fontSize: 10, fontWeight: '700', marginBottom: 5 },
  mySender: { color: '#E4C9A9' },
  messageText: { color: theme.text, fontSize: 13, lineHeight: 19 },
  myMessageText: { color: '#fff' },
  timestamp: { color: theme.muted, fontSize: 9, marginTop: 7, textAlign: 'right' },
  myTimestamp: { color: '#E4C9A9' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', color: theme.text, paddingHorizontal: 12, paddingVertical: 10 },
  sendButton: { minHeight: 46, justifyContent: 'center', backgroundColor: theme.accent, paddingHorizontal: 20 },
  disabledButton: { opacity: 0.55 },
  sendText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 12 },
  errorText: { color: '#9B2C20', fontSize: 12, flex: 1 },
  retry: { color: theme.accent, fontSize: 9, fontWeight: '700' },
});
