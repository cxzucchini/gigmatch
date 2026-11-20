import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useUnreadNotifications } from './InAppNotificationAlert';
import HoverPressable from './HoverPressable';

export default function AppHeader({ active }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 760;
  const { user } = useAuth();
  const unreadCount = useUnreadNotifications();
  const [menuVisible, setMenuVisible] = useState(false);

  const links = [
    { label: 'Discover', route: '/' },
    ...(user ? [] : [
      { label: 'About', route: '/about' },
      { label: 'Contact', route: '/contact' },
      { label: 'Feedback', route: '/feedback' },
    ]),
    ...(user ? [{ label: 'Bookings', route: '/bookings' }] : []),
    ...(user ? [{ label: 'Messages', route: '/messages' }] : []),
    ...(user ? [{ label: 'Notifications', route: '/notifications', badge: unreadCount }] : []),
    ...(user?.role === 'musician' ? [{ label: 'My profile', route: '/musician/profile' }] : []),
    ...(user?.role === 'admin' ? [{ label: 'Admin', route: '/admin' }] : []),
  ];

  const accountButton = (
    <HoverPressable
      onPress={() => router.push('/auth')}
      style={styles.bookButton}
      hoverStyle={styles.bookButtonHovered}
      pressedStyle={styles.bookButtonPressed}
      accessibilityRole="button"
      accessibilityLabel={user ? `Profile for ${user.name}` : 'Get started'}
    >
      {user ? (
        <View style={styles.accountButtonContent}>
          <View style={styles.profileIcon}>
            <View style={styles.profileHead} />
            <View style={styles.profileBody} />
          </View>
          <Text style={styles.bookTextSize}>{user.name.split(' ')[0]}</Text>
        </View>
      ) : (
        <Text style={styles.bookTextSize}>GET STARTED</Text>
      )}
    </HoverPressable>
  );

  return (
    <View style={[styles.container, desktop && styles.desktopContainer]}>
      <View style={[styles.mainNavRow, desktop && styles.mainNavRowDesktop]}>
        {desktop ? (
          <>
            <HoverPressable
              accessibilityRole="link"
              accessibilityLabel="Gigmatch home"
              onPress={() => router.push('/')}
              style={styles.brand}
              hoverStyle={styles.brandHovered}
            >
              <Text style={styles.brandName}>Gigmatch</Text>
              <Text style={styles.brandTag}>LIVE MUSIC, FOUND</Text>
            </HoverPressable>
            <View style={[styles.links, styles.desktopLinks]}>
            {links.map((link) => (
              <HoverPressable
                key={link.label}
                accessibilityRole="link"
                accessibilityLabel={link.label}
                onPress={() => router.push(link.route)}
                style={styles.linkWrap}
                hoverStyle={styles.linkHovered}
              >
                <View style={styles.linkInner}>
                  <Text style={[styles.link, active === link.label && styles.activeLink]}>{link.label}</Text>
                  {Boolean(link.badge) && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{link.badge > 9 ? '9+' : String(link.badge)}</Text>
                    </View>
                  )}
                </View>
                {active === link.label && <View style={styles.activeRule} />}
              </HoverPressable>
            ))}
            {accountButton}
          </View>
          </>
        ) : (
          <View style={styles.mobileWrapper}>
            <View style={styles.mobileLeftGroup}>
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={styles.hamburgerButton}
                accessibilityLabel="Open navigation menu"
              >
                <View style={styles.hamburgerIcon}>
                  <View style={styles.hamburgerLineTop} />
                  <View style={styles.hamburgerLineMid} />
                  <View style={styles.hamburgerLineBottom} />
                </View>
              </TouchableOpacity>
              <HoverPressable
                accessibilityRole="link"
                accessibilityLabel="Gigmatch home"
                onPress={() => router.push('/')}
                style={styles.mobileBrand}
                hoverStyle={styles.brandHovered}
              >
                <Text style={styles.mobileBrandName}>Gigmatch</Text>
              </HoverPressable>
            </View>
            {accountButton}
          </View>
        )}
      </View>

      {/* Mobile Menu Drawer */}
      <Modal
        animationType="slide"
        transparent
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.drawerContent}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                style={styles.closeButton}
                accessibilityLabel="Close menu"
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.drawerLinks}>
              {links.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  onPress={() => { setMenuVisible(false); router.push(link.route); }}
                  style={[styles.drawerLinkWrap, active === link.label && styles.drawerLinkActive]}
                  accessibilityRole="link"
                  accessibilityLabel={link.label}
                >
                  <Text style={[styles.drawerLink, active === link.label && styles.drawerLinkActiveText]}>
                    {link.label}
                  </Text>
                  {Boolean(link.badge) && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{link.badge > 9 ? '9+' : String(link.badge)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.drawerFooter}>
              <HoverPressable
                onPress={() => { setMenuVisible(false); router.push('/auth'); }}
                style={styles.drawerGetStartedButton}
              >
                <Text style={styles.drawerGetStartedText}>GET STARTED</Text>
              </HoverPressable>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.background, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#DED4C9', overflow: 'visible' },
  desktopContainer: { paddingHorizontal: 28, paddingVertical: 18, overflow: 'visible' },
  mainNavRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  mainNavRowDesktop: { flex: 1, alignSelf: 'stretch', width: '100%', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4, flex: 1, minWidth: 80 },
  brandHovered: { opacity: 0.82 },
  desktopBrand: { marginBottom: 0 },
  brandName: { color: theme.accent, fontFamily: 'Georgia', fontSize: 24 },
  mobileBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileBrandName: { color: theme.accent, fontFamily: 'Georgia', fontSize: 20 },
  brandTag: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  links: { alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: '100%', paddingVertical: 6 },
  desktopLinks: { flexDirection: 'row', alignItems: 'center', gap: 24, marginLeft: 'auto', paddingLeft: 24, paddingVertical: 0, minWidth: 0 },
  linkWrap: { minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  linkHovered: { transform: [{ translateY: -2 }] },
  linkInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { color: theme.muted, fontSize: 13, letterSpacing: 0.3 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#8D3A2D', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  activeLink: { color: theme.accent, fontWeight: '700' },
  activeRule: { height: 2, backgroundColor: theme.accent, width: '100%', marginTop: 3 },
  bookButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: theme.accent,
    borderRadius: 20,
  },
  bookButtonHovered: { backgroundColor: theme.accentDark, transform: [{ translateY: -1 }], shadowColor: '#35251D', shadowOpacity: 0.14, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  bookButtonPressed: { opacity: 0.88, transform: [{ translateY: 0 }] },
  bookTextSize: { color: '#fff', fontSize: 12, fontFamily: 'Arial', fontWeight: '600', letterSpacing: 0.25 },
  accountButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileIcon: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingTop: 2, gap: 1 },
  profileHead: { width: 5, height: 5, borderRadius: 2, backgroundColor: theme.accent },
  profileBody: { width: 9, height: 6, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: theme.accent },
  
  // Mobile hamburger menu
  mobileWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  mobileLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hamburgerButton: { padding: 10, zIndex: 10, borderRadius: 8 },
  hamburgerIcon: { width: 20, height: 14, justifyContent: 'space-between', alignItems: 'center' },
  hamburgerLineTop: { width: 20, height: 1.75, backgroundColor: '#4A3525', borderRadius: 0.875 },
  hamburgerLineMid: { width: 20, height: 1.75, backgroundColor: '#4A3525', borderRadius: 0.875 },
  hamburgerLineBottom: { width: 20, height: 1.75, backgroundColor: '#4A3525', borderRadius: 0.875 },
  mobileAccountButton: { marginLeft: 4 },
  mobileNav: { flex: 1, minWidth: 80 },
  
  // Modal drawer
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  drawerContent: { width: '80%', backgroundColor: theme.background, height: '100%', borderLeftWidth: 1, borderLeftColor: '#DED4C9' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#DED4C9' },
  drawerTitle: { fontSize: 18, fontWeight: '700', color: theme.accent },
  closeButton: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(173,115,95,0.2)' },
  closeText: { fontSize: 16, color: theme.muted, lineHeight: 20 },
  drawerLinks: { paddingVertical: 8, paddingHorizontal: 12 },
  drawerLinkWrap: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(222,212,201,0.2)' },
  drawerLink: { fontSize: 16, color: theme.muted },
  drawerLinkActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  drawerLinkActiveText: { color: theme.accent, fontWeight: '700' },
  drawerFooter: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(222,212,201,0.2)', backgroundColor: theme.background },
  drawerGetStartedButton: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10, backgroundColor: theme.accent, borderRadius: 20 },
  drawerGetStartedText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});