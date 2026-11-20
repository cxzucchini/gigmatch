import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { createOpenStreetMapHtml } from '../utils/openStreetMapHtml';

export default function OpenStreetMap({ origin, musicians, eventLabel = 'Your event', height = 360 }) {
  const html = useMemo(
    () => createOpenStreetMapHtml(origin, musicians, eventLabel),
    [origin, musicians, eventLabel],
  );

  return (
    <WebView
      source={{ html }}
      originWhitelist={['*']}
      javaScriptEnabled
      userAgent="Gigmatch/1.0"
      style={[styles.map, { height }]}
      accessibilityLabel="OpenStreetMap showing the event and nearby musicians"
    />
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', backgroundColor: '#f2efe9' },
});
