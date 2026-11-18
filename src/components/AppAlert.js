import React from 'react';
import { Modal, StyleSheet, Text, View, Image } from 'react-native';
import { theme } from '../styles/theme';
import HoverPressable from './HoverPressable';

export default function AppAlert({ visible, title = 'Something needs attention', message, onDismiss, icon }) {
  // Default info icon (blue circle with white "i") as an inline SVG data URI
  const defaultIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMSIgZmlsbD0iIzRBOTBEOSIvPjxyZWN0IHg9IjExIiB5PSIxMC41IiB3aWR0aD0iMiIgaGVpZ2h0PSI3IiByeD0iMSIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iNy4yIiByPSIxLjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={styles.dialog}
        >
          <View style={styles.dialogHeader}>
            <Image source={{ uri: icon || defaultIcon }} style={styles.icon} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
          <HoverPressable onPress={onDismiss} style={styles.button} hoverStyle={styles.buttonHovered} accessibilityRole="button">
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>OK</Text>
            </View>
          </HoverPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(25, 18, 14, 0.55)' },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  icon: { width: 24, height: 24, marginRight: 12 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 23 },
  message: { color: theme.text, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent, marginTop: 20, paddingHorizontal: 20 },
  buttonHovered: { backgroundColor: theme.accentDark, transform: [{ translateY: -1 }] },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
