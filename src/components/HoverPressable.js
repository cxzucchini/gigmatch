import React from 'react';
import { Pressable } from 'react-native';

export default function HoverPressable({
  style,
  hoverStyle = { opacity: 0.82 },
  pressedStyle = { opacity: 0.92 },
  ...props
}) {
  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.hovered && hoverStyle,
        state.pressed && pressedStyle,
      ]}
    />
  );
}
