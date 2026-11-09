import { Text as NativeText, type TextProps } from 'react-native';

// A single text primitive keeps every screen on the bundled brand family.
// Expo Font registers the regular, medium and bold faces under this family.
export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: 'Stolzl' }, style]} />;
}
