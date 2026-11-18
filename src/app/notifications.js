import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppAlert from '../components/AppAlert';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { theme } from '../styles/theme';

const formatDate = (value) => new Date(value).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/notifications/mine', { token });
      setNotifications(result.items);
    } catch (requestError) {
      setError(requestError.message);
      setAlertMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Notification state is updated by the async request's completion handlers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
  }, [loadNotifications]);

  const openNotification = async (notification) => {
    if (!notification.readAt) {
      try {
        await apiRequest(`/notifications/${notification._id}/read`, { method: 'PATCH', token });
        setNotifications((current) => current.map((item) => (
          item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item
        )));
      } catch (requestError) {
        setAlertMessage(requestError.message);
      }
    }
    if (typeof notification.url === 'string' && notification.url.startsWith('/') && !notification.url.startsWith('//')) {
      router.push(notification.url);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : notifications.map((item) => item._id));
  };

  const toggleNotification = (id) => {
    setSelectedIds((current) => (current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]));
  };

  const markSelectedRead = async () => {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy(true);
    try {
      await apiRequest('/notifications/bulk-read', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ ids: selectedIds }),
      });
      const now = new Date().toISOString();
      const count = selectedIds.length;
      setNotifications((current) => current.map((item) => (
        selectedIds.includes(item._id) && !item.readAt ? { ...item, readAt: now } : item
      )));
      exitSelectionMode();
      setNotice(`${count} notification${count === 1 ? '' : 's'} marked as read.`);
    } catch (requestError) {
      setAlertMessage(requestError.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy(true);
    try {
      await apiRequest('/notifications/bulk-delete', {
        method: 'DELETE',
        token,
        body: JSON.stringify({ ids: selectedIds }),
      });
      const count = selectedIds.length;
      setNotifications((current) => current.filter((item) => !selectedIds.includes(item._id)));
      exitSelectionMode();
      setNotice(`${count} notification${count === 1 ? '' : 's'} deleted.`);
    } catch (requestError) {
      setAlertMessage(requestError.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const markAllRead = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH', token });
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
      setNotice('All notifications marked as read.');
    } catch (requestError) {
      setAlertMessage(requestError.message);
    } finally {
      setBulkBusy(false);
    }
  };

  if (authLoading || loading && token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader active="Alerts" />
        <View style={styles.center}><ActivityIndicator color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active="Alerts" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>YOUR GIGMATCH</Text>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Booking requests, updates, and messages.</Text>
        {!user ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sign in to see your notifications.</Text>
            <Pressable onPress={() => router.push('/auth')} style={styles.button}><Text style={styles.buttonText}>Sign in</Text></Pressable>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadNotifications}><Text style={styles.retry}>RETRY</Text></Pressable>
          </View>
        ) : null}
        {user && !error && !notifications.length ? (
          <View style={styles.empty}><Text style={styles.emptyText}>You&apos;re all caught up.</Text></View>
        ) : null}

        {user && notifications.length > 0 && !selectionMode ? (
          <View style={styles.toolbar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setSelectionMode(true); setNotice(''); }}
              style={styles.selectToggle}
            >
              <Text style={styles.selectToggleText}>Select</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={markAllRead}
              disabled={bulkBusy}
              style={[styles.selectToggle, bulkBusy && styles.actionButtonDisabled]}
            >
              <Text style={styles.selectToggleText}>Mark all read</Text>
            </Pressable>
          </View>
        ) : null}

        {user && selectionMode && notifications.length > 0 ? (
          <View style={styles.selectionBar}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              onPress={toggleSelectAll}
              style={styles.selectAllRow}
            >
              <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                {allSelected ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.selectAllLabel}>{allSelected ? 'Deselect all' : 'Select all'}</Text>
            </Pressable>
            <View style={styles.selectionActions}>
              <Text style={styles.selectionCount}>{selectedIds.length} selected</Text>
              <Pressable
                accessibilityRole="button"
                onPress={markSelectedRead}
                disabled={!selectedIds.length || bulkBusy}
                style={[styles.actionButton, (!selectedIds.length || bulkBusy) && styles.actionButtonDisabled]}
              >
                <Text style={styles.actionButtonText}>Mark as read</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={deleteSelected}
                disabled={!selectedIds.length || bulkBusy}
                style={[styles.actionButton, styles.actionButtonDanger, (!selectedIds.length || bulkBusy) && styles.actionButtonDisabled]}
              >
                <Text style={styles.actionButtonText}>Delete{selectedIds.length ? ` (${selectedIds.length})` : ''}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={exitSelectionMode} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {notice ? (
          <View style={styles.noticeBox}>
            <Text accessibilityRole="alert" style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {notifications.map((notification) => {
          const selected = selectedIds.includes(notification._id);
          return (
            <Pressable
              key={notification._id}
              accessibilityRole={selectionMode ? 'checkbox' : 'button'}
              accessibilityState={selectionMode ? { checked: selected } : undefined}
              onPress={() => (selectionMode ? toggleNotification(notification._id) : openNotification(notification))}
              style={[styles.notification, !notification.readAt && styles.unread, selectionMode && selected && styles.selected]}
            >
              {selectionMode ? (
                <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                  {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
              ) : null}
              <View style={styles.notificationContent}>
                <View style={styles.notificationTop}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  {!notification.readAt ? <Text style={styles.unreadLabel}>NEW</Text> : null}
                </View>
                <Text style={styles.notificationBody}>{notification.body}</Text>
                <Text style={styles.notificationDate}>
                  {formatDate(notification.createdAt)} · {selectionMode ? 'Tap to select' : 'Open'}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <AppFooter />
      </ScrollView>
      <AppAlert
        visible={Boolean(alertMessage)}
        title="Notifications unavailable"
        message={alertMessage}
        onDismiss={() => setAlertMessage('')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  content: { width: '90%', maxWidth: 760, alignSelf: 'center', paddingTop: 36, paddingBottom: 0, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 36, marginTop: 10 },
  subtitle: { color: theme.muted, fontSize: 13, lineHeight: 21, marginTop: 9, marginBottom: 20 },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 14 },
  selectToggle: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#F6F1EA', paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  selectToggleText: { color: theme.accent, fontSize: 11, fontWeight: '700' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', borderWidth: 1, borderColor: theme.border, backgroundColor: '#EEE5DB', padding: 12, marginBottom: 14, gap: 10 },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  selectAllLabel: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' },
  selectionCount: { color: theme.muted, fontSize: 11, marginRight: 2 },
  actionButton: { backgroundColor: theme.accent, paddingVertical: 8, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  actionButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  actionButtonDanger: { backgroundColor: '#9B2C20' },
  actionButtonDisabled: { opacity: 0.5 },
  cancelButton: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#F6F1EA', paddingVertical: 8, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  cancelButtonText: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: theme.accent, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: theme.accent },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  notification: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: '#F6F1EA', padding: 16, marginBottom: 10 },
  selected: { borderColor: theme.accent, borderWidth: 2 },
  notificationContent: { flex: 1 },
  noticeBox: { backgroundColor: '#E8F0E4', borderWidth: 1, borderColor: '#B7CDB0', padding: 12, marginBottom: 14 },
  noticeText: { color: '#3D6632', fontSize: 12 },
  unread: { borderLeftWidth: 4, borderLeftColor: theme.accent, backgroundColor: '#EEE5DB' },
  notificationTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  notificationTitle: { color: theme.accent, fontSize: 14, fontWeight: '700', flex: 1 },
  unreadLabel: { color: theme.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  notificationBody: { color: theme.text, fontSize: 12, lineHeight: 18, marginTop: 7 },
  notificationDate: { color: theme.muted, fontSize: 10, marginTop: 10 },
  empty: { alignItems: 'center', padding: 24, borderWidth: 1, borderColor: theme.border, backgroundColor: '#F6F1EA' },
  emptyText: { color: theme.muted, fontSize: 13, textAlign: 'center' },
  button: { minHeight: 44, justifyContent: 'center', backgroundColor: theme.accent, paddingHorizontal: 20, marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#F8E8E4', borderWidth: 1, borderColor: '#E4B9B0', padding: 12, marginBottom: 14 },
  errorText: { color: '#9B2C20', fontSize: 12, flex: 1 },
  retry: { color: theme.accent, fontSize: 9, fontWeight: '700' },
});
