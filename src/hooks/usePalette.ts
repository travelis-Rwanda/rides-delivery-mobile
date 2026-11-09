import { useColorScheme } from 'react-native';

import { colors } from '../constants/colors';

export function usePalette() {
  const colorScheme = useColorScheme();
  return colors[colorScheme === 'dark' ? 'dark' : 'light'];
}
