import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import PageLayout from '../components/PageLayout';
import AppAlert from '../components/AppAlert';
import { theme } from '../styles/theme';

const ratings = [
  { score: 1, face: '☹', label: 'Not good' },
  { score: 2, face: '🙁', label: 'Could be better' },
  { score: 3, face: '😐', label: 'It was okay' },
  { score: 4, face: '🙂', label: 'Good' },
  { score: 5, face: '😄', label: 'Loved it' },
];

export default function FeedbackScreen() {
  const [rating, setRating] = useState(0);
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (!rating || !feedback.trim()) {
      setError('Please choose a rating and share a few words.');
      return;
    }
    setSubmitted(true);
    setEmail('');
    setFeedback('');
    setRating(0);
  };

  return (
    <PageLayout active="Feedback">
      <View style={styles.heading}>
        <Text style={styles.kicker}>YOUR VOICE MATTERS</Text>
        <Text style={styles.title}>Help us make it better.</Text>
        <Text style={styles.copy}>A few words from you can help us create a better experience for artists and event hosts.</Text>
      </View>
      <View style={styles.card}>
        {submitted ? (
          <View style={styles.success}>
            <Text style={styles.successMark}>✓</Text>
            <Text style={styles.successTitle}>Thanks for sharing.</Text>
            <Text style={styles.copy}>Your feedback has been recorded in this prototype.</Text>
            <Pressable onPress={() => setSubmitted(false)}><Text style={styles.again}>SEND MORE FEEDBACK</Text></Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Your email <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={theme.muted} accessibilityLabel="Your email, optional" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <Text style={[styles.label, styles.ratingLabel]}>How would you rate your experience?</Text>
            <View style={styles.ratingRow}>
              {ratings.map((item) => (
                <Pressable key={item.score} onPress={() => setRating(item.score)} style={[styles.ratingOption, rating === item.score && styles.ratingSelected]} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: rating === item.score }}>
                  <Text style={styles.face}>{item.face}</Text>
                  <Text style={[styles.ratingWord, rating === item.score && styles.ratingWordSelected]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Tell us a little more</Text>
            <TextInput value={feedback} onChangeText={setFeedback} placeholder="What went well? What could we improve?" placeholderTextColor={theme.muted} accessibilityLabel="Tell us a little more" multiline style={[styles.input, styles.messageInput]} />
            <Pressable onPress={submit} style={styles.button}><Text style={styles.buttonText}>Submit feedback</Text></Pressable>
            <Text style={styles.privacy}>Please don&apos;t include passwords or sensitive personal information.</Text>
          </>
        )}
      </View>
      <AppAlert
        visible={Boolean(error)}
        title="Almost there"
        message={error}
        onDismiss={() => setError('')}
      />
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 46, paddingBottom: 22 },
  kicker: { color: theme.muted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 12 },
  title: { color: theme.accent, fontFamily: 'Georgia', fontSize: 36, textAlign: 'center' },
  copy: { color: theme.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 500, marginTop: 10 },
  card: { width: '90%', maxWidth: 660, alignSelf: 'center', backgroundColor: '#F5F0E7', borderWidth: 1, borderColor: theme.border, padding: 26 },
  label: { color: theme.accent, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  optional: { color: theme.muted, fontWeight: '400' },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#FBF9F6', paddingHorizontal: 13, paddingVertical: 12, color: theme.text, minHeight: 48 },
  ratingLabel: { marginTop: 24 },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  ratingOption: { flexGrow: 1, flexBasis: 90, minHeight: 92, backgroundColor: '#E5DED4', alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 1, borderColor: 'transparent' },
  ratingSelected: { backgroundColor: '#EAD6C2', borderColor: theme.accent },
  face: { color: theme.accent, fontSize: 26 },
  ratingWord: { color: theme.muted, fontSize: 9, textAlign: 'center', marginTop: 5 },
  ratingWordSelected: { color: theme.accent, fontWeight: '700' },
  messageInput: { minHeight: 130, textAlignVertical: 'top' },
  button: { backgroundColor: theme.accentDark, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  privacy: { color: theme.muted, fontSize: 10, textAlign: 'center', marginTop: 12 },
  success: { alignItems: 'center', justifyContent: 'center', minHeight: 260 },
  successMark: { color: '#fff', backgroundColor: theme.accent, width: 48, height: 48, borderRadius: 24, textAlign: 'center', textAlignVertical: 'center', fontSize: 26, overflow: 'hidden' },
  successTitle: { color: theme.accent, fontFamily: 'Georgia', fontSize: 26, marginTop: 16 },
  again: { color: theme.accent, fontSize: 10, letterSpacing: 1.3, fontWeight: '700', marginTop: 24 },
});
