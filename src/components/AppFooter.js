import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../styles/theme';
import HoverPressable from './HoverPressable';

export default function AppFooter() {
  const router = useRouter();

  return (
    <View style={styles.footerArea}>
      <View style={styles.linksRow}>
        <HoverPressable onPress={() => router.push('/about')} hoverStyle={styles.linkHovered}>
          <Text style={styles.footerLink}>About</Text>
        </HoverPressable>
        <HoverPressable onPress={() => router.push('/contact')} hoverStyle={styles.linkHovered}>
          <Text style={styles.footerLink}>Contact</Text>
        </HoverPressable>
        <HoverPressable onPress={() => router.push('/feedback')} hoverStyle={styles.linkHovered}>
          <Text style={styles.footerLink}>Feedback</Text>
        </HoverPressable>
      </View>
      <Text style={styles.footerCopyright}>GIGMATCH  ·  MADE FOR THE MOMENTS THAT MOVE US</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footerArea: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.panelSoft,
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  footerLink: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkHovered: {
    opacity: 0.7,
  },
  footerCopyright: {
    color: theme.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
