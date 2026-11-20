import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function HoverPressable({
  style,
  hoverStyle = { opacity: 0.82 },
  pressedStyle = { opacity: 0.92 },
  title,
  intent,
  children,
  ...props
}) {
  const renderedTitle = title ? (
    <Text style={intent === 'danger' ? { color: '#D7B5AC' } : undefined}>
      {title}
    </Text>
  ) : null;

  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.hovered && hoverStyle,
        state.pressed && pressedStyle,
      ]}
    >
      {children || renderedTitle}
    </Pressable>
  );
}
