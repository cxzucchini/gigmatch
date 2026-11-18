import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import HoverPressable from './HoverPressable';

const POLL_INTERVAL_MS = 15000;
const TOAST_VISIBLE_MS = 6000;

const UnreadCountContext = createContext(0);

// Unread notification count for the signed-in user (0 when signed out) —
// used by the header to badge the "Notifications" link.
export function useUnreadNotifications() {
  return useContext(UnreadCountContext);
}

// Sits at the app root: polls the signed-in user's notifications and pops a
// small non-blocking toast (top of screen, auto-dismisses) whenever a new
// notification arrives. Checks run on sign-in, a 15s interval, every screen
// navigation, and the moment the tab/app becomes active again — so an alert
// is never more than a few seconds behind, even after the tab sat in the
// background. Also publishes the unread count for the header badge.
export default function InAppNotificationAlert({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const { token } = useAuth();
  const seenIdsRef = useRef(null); // null until the first successful fetch (baseline)
  const pathnameRef = useRef(pathname);
  const inFlightRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null); // { title, message, url }
  // Created once per mount; kept in state (not a ref) so the React compiler
  // lint allows reading it during render for the Animated styles.
  const [fade] = useState(() => new Animated.Value(0));

  const poll = useCallback(async () => {
    if (!token || inFlightRef.current) return;
    // Browsers throttle timers in background tabs anyway; skip the fetch and
    // let the "tab became active" handler below catch up instantly.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    inFlightRef.current = true;
    try {
      const result = await apiRequest('/notifications/mine', { token });
      const items = Array.isArray(result.items) ? result.items : [];
      setUnreadCount(result.unreadCount || 0);
      if (seenIdsRef.current === null) {
        // First load for this session: baseline existing notifications silently.
        seenIdsRef.current = new Set(items.map((item) => item._id));
        setToast(null);
        return;
      }
      const seen = seenIdsRef.current;
      const fresh = items.filter((item) => !seen.has(item._id));
      fresh.forEach((item) => seen.add(item._id));
      if (!fresh.length || pathnameRef.current.startsWith('/notifications')) return;
      const latest = fresh[0]; // items are sorted newest first by the API
      setToast({
        title: latest.title || 'New notification',
        message: fresh.length > 1
          ? `${latest.body || 'You have a new notification.'} (+${fresh.length - 1} more new)`
          : latest.body || 'You have a new notification.',
        url: latest.url || null,
      });
    } catch (error) {
      console.warn(`Could not check for new notifications: ${error.message}`);
    } finally {
      inFlightRef.current = false;
    }
  }, [token]);

  const dismissToast = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [fade]);

  const openToast = useCallback(() => {
    const target = toast && toast.url ? toast.url : null;
    if (target) {
      router.push(target);
    } else if (!pathnameRef.current.startsWith('/notifications')) {
      router.push('/notifications');
    }
    dismissToast();
  }, [toast, router, dismissToast]);

  // Animate the toast in and start its auto-dismiss countdown.
  useEffect(() => {
    if (!toast) return undefined;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(dismissToast, TOAST_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, fade, dismissToast]);

  useEffect(() => {
    const navigated = pathnameRef.current !== pathname;
    pathnameRef.current = pathname;
    if (navigated && seenIdsRef.current !== null) {
      // Moving between screens is a natural moment to check for news.
      poll();
    }
  }, [pathname, poll]);

  useEffect(() => {
    seenIdsRef.current = null;
    if (!token) return undefined;
    // Baseline immediately on sign-in; state updates happen in the async
    // continuation, not synchronously during the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, poll]);

  useEffect(() => {
    if (!token) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll(); // tab focused / app foregrounded: catch up now
    });
    return () => subscription.remove();
  }, [token, poll]);

  return (
    <UnreadCountContext.Provider value={unreadCount}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastAnchor,
            Platform.OS !== 'web' && { top: (insets.top || 0) + 12 },
            { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] },
          ]}
        >
          {/* RN-web implements box-none as pointer-events:none, which children
              inherit — re-enable interaction on the toast card itself. */}
          <View pointerEvents="auto" style={[styles.toastWrap, wide && styles.toastWrapWide]}>
            <HoverPressable
              accessibilityRole="button"
              accessibilityLabel={`New notification: ${toast.title}. Tap to view.`}
              onPress={openToast}
              style={styles.toast}
              hoverStyle={styles.toastHovered}
            >
              <View style={styles.toastAccentBar} />
              <View style={styles.toastTextWrap}>
                <Text numberOfLines={1} style={styles.toastTitle}>{toast.title}</Text>
                <Text numberOfLines={2} style={styles.toastMessage}>{toast.message}</Text>
              </View>
              <Text style={styles.toastAction}>View</Text>
            </HoverPressable>
          </View>
        </Animated.View>
      )}
    </UnreadCountContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastAnchor: { position: 'absolute', top: 12, left: 0, right: 0, zIndex: 1000 },
  toastWrap: { marginHorizontal: 16 },
  toastWrapWide: { alignSelf: 'flex-end', maxWidth: 400, marginHorizontal: 28 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBF7F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 11,
    paddingHorizontal: 14,
    shadowColor: '#35251D',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 24,
  },
  toastHovered: { transform: [{ translateY: -1 }], shadowOpacity: 0.24 },
  toastAccentBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: theme.accent },
  toastTextWrap: { flex: 1, minWidth: 0 },
  toastTitle: { color: theme.accent, fontWeight: '700', fontSize: 13 },
  toastMessage: { color: theme.muted, fontSize: 12, marginTop: 2 },
  toastAction: { color: theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});
