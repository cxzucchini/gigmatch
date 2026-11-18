import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { theme } from '../styles/theme';

export default function PageLayout({ active, children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader active={active} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
        <AppFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  content: { paddingBottom: 0, flexGrow: 1 },
});
