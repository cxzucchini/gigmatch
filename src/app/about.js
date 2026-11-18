import React from 'react';
import { View, Text, ImageBackground, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import PageLayout from '../components/PageLayout';
import { theme } from '../styles/theme';

export default function AboutScreen() {
  const router = useRouter();
  return (
    <PageLayout active="About">
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1600&q=85' }}
        imageStyle={styles.heroImage}
        style={styles.hero}
      >
        <View style={styles.shade} />
        <Text style={styles.kicker}>OUR STORY</Text>
        <Text style={styles.heroTitle}>A little more music.{'\n'}A lot more meaning.</Text>
        <Text style={styles.heroCopy}>Gigmatch brings people and performers together for the moments worth remembering.</Text>
      </ImageBackground>

      <View style={styles.intro}>
        <Text style={styles.kickerDark}>WHY GIGMATCH</Text>
        <Text style={styles.title}>Every great event has a soundtrack.</Text>
        <Text style={styles.copy}>Finding the right live performer shouldn&apos;t be hard. We make it easier for event hosts to discover talented musicians, understand what they offer, and start a booking with confidence. For artists, Gigmatch is a place to share their craft and find the stages that fit.</Text>
      </View>

      <View style={styles.values}>
        <View style={styles.valueCard}>
          <Text style={styles.valueNumber}>01</Text>
          <Text style={styles.valueTitle}>Made for discovery</Text>
          <Text style={styles.valueCopy}>Explore artists by sound, style, location, and budget.</Text>
        </View>
        <View style={styles.valueCard}>
          <Text style={styles.valueNumber}>02</Text>
          <Text style={styles.valueTitle}>Built around people</Text>
          <Text style={styles.valueCopy}>Get to know the musicians behind every performance.</Text>
        </View>
        <View style={styles.valueCard}>
          <Text style={styles.valueNumber}>03</Text>
          <Text style={styles.valueTitle}>Here for the moment</Text>
          <Text style={styles.valueCopy}>From a backyard celebration to a night on the dance floor.</Text>
        </View>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Ready to find your sound?</Text>
        <Pressable onPress={() => router.push('/')} style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Explore artists</Text>
        </Pressable>
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 420, justifyContent: 'center', paddingHorizontal: 36, margin: 20, backgroundColor: theme.accent },
  heroImage: { borderRadius: 4 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(38, 26, 19, 0.53)' },
  kicker: { color: '#E8D0B8', letterSpacing: 2, fontSize: 10, fontWeight: '700', marginBottom: 18 },
  heroTitle: { color: '#fffaf3', fontFamily: 'Georgia', fontSize: 46, lineHeight: 54, maxWidth: 650 },
  heroCopy: { color: '#F3E9DF', fontSize: 15, lineHeight: 24, marginTop: 16, maxWidth: 480 },
  intro: { maxWidth: 740, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 26, paddingVertical: 46 },
  kickerDark: { color: theme.muted, letterSpacing: 2, fontSize: 10, fontWeight: '700', marginBottom: 12 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 34, textAlign: 'center', lineHeight: 42 },
  copy: { color: theme.muted, fontSize: 15, lineHeight: 25, textAlign: 'center', marginTop: 14 },
  values: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 22 },
  valueCard: { flexGrow: 1, flexBasis: 240, maxWidth: 340, backgroundColor: theme.panelSoft, borderColor: theme.border, borderWidth: 1, padding: 22, minHeight: 170 },
  valueNumber: { color: '#B78A68', fontFamily: 'Georgia', fontSize: 28, marginBottom: 15 },
  valueTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 21, marginBottom: 8 },
  valueCopy: { color: theme.muted, fontSize: 13, lineHeight: 20 },
  cta: { marginHorizontal: 20, marginTop: 30, padding: 30, alignItems: 'center', backgroundColor: '#EAE1D7' },
  ctaTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 27, textAlign: 'center' },
  ctaButton: { backgroundColor: theme.accent, borderRadius: 25, paddingVertical: 13, paddingHorizontal: 22, marginTop: 18 },
  ctaButtonText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
});
