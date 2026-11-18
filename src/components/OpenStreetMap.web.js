import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createOpenStreetMapHtml } from '../utils/openStreetMapHtml';

export default function OpenStreetMap({ origin, musicians, eventLabel = 'Your event', height = 360 }) {
  const html = useMemo(
    () => createOpenStreetMapHtml(origin, musicians, eventLabel),
    [origin, musicians, eventLabel],
  );

  return (
    <View style={[styles.frame, { height }]}>
      {React.createElement('iframe', {
        srcDoc: html,
        title: 'OpenStreetMap showing the event and nearby musicians',
        loading: 'lazy',
        allowFullScreen: true,
        style: styles.iframe,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden' },
  iframe: { height: '100%', width: '100%', border: 0 },
});
