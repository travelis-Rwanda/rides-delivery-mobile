import { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { usePalette } from '../../hooks/usePalette';
import { Icon, type IconName } from '../ui/Icon';
import { Text } from '../ui/Text';

// Infer the navigator's own public props so this stays aligned with Expo Router.
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

const ICONS: Record<string, IconName> = {
  index: 'home',
  activity: 'activity',
  help: 'help',
};
const GAP = 6;
const LABEL_LINE_HEIGHT = 18;
const LABEL_GAP = 4;
const CONTENT_TRANSITION = {
  duration: 260,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
  reduceMotion: ReduceMotion.System,
} as const;
const SPRING = {
  stiffness: 300,
  damping: 28,
  mass: 0.8,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

export function AnimatedTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: TabBarProps) {
  const palette = usePalette();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const selectedIndex = useSharedValue(state.index);

  // Equal slots keep each touch target in place while the icon and label animate.
  const availableWidth = rowWidth || Math.min(440, windowWidth - 40) - 16;
  const slotWidth = Math.max(
    48,
    (availableWidth - GAP * (state.routes.length - 1)) / state.routes.length,
  );
  const labelHeight = LABEL_LINE_HEIGHT * Math.min(fontScale, 1.5);
  const rowHeight = Math.ceil(22 + LABEL_GAP + labelHeight + 12);

  useEffect(() => {
    selectedIndex.set(withSpring(state.index, SPRING));
  }, [state.index, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: slotWidth,
    transform: [{ translateX: selectedIndex.get() * (slotWidth + GAP) }],
  }));

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: palette.background,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingLeft: Math.max(insets.left, 20),
          paddingRight: Math.max(insets.right, 20),
        },
      ]}
    >
      <View
        style={[
          styles.frame,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}
      >
        <View
          accessibilityRole="tablist"
          style={[styles.row, { height: rowHeight }]}
          onLayout={({ nativeEvent }) => {
            const nextWidth = nativeEvent.layout.width;
            setRowWidth((current) =>
              Math.abs(current - nextWidth) < 0.5 ? current : nextWidth,
            );
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              { backgroundColor: palette.secondary },
              indicatorStyle,
            ]}
          />

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : (options.title ?? route.name);
            const focused = state.index === index;

            return (
              <TabButton
                key={route.key}
                label={label}
                icon={ICONS[route.name] ?? 'home'}
                focused={focused}
                labelHeight={labelHeight}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarButtonTestID}
                onPress={() => {
                  const event = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigateToTab(route.key);
                  }
                }}
                onLongPress={() => {
                  emitter.emit({ type: 'tabLongPress', target: route.key });
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

type TabButtonProps = {
  label: string;
  icon: IconName;
  focused: boolean;
  labelHeight: number;
  accessibilityLabel: string;
  testID?: string;
  onPress: () => void;
  onLongPress: () => void;
};

function TabButton({
  label,
  icon,
  focused,
  labelHeight,
  accessibilityLabel,
  testID,
  onPress,
  onLongPress,
}: TabButtonProps) {
  const palette = usePalette();
  const progress = useSharedValue(focused ? 1 : 0);
  const pressedScale = useSharedValue(1);

  useEffect(() => {
    progress.set(withTiming(focused ? 1 : 0, CONTENT_TRANSITION));
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -progress.get() * ((labelHeight + LABEL_GAP) / 2) },
      { scale: pressedScale.get() },
    ],
  }));
  // Keep the text fully laid out at its final size. Animating its container's
  // height made native text fitting compete with the reveal on every frame.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * 4 }],
  }));
  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
  }));
  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }));

  return (
    <View style={styles.slot}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: focused }}
        aria-selected={focused}
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          pressedScale.set(
            withTiming(0.94, {
              duration: 90,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }}
        onPressOut={() => {
          pressedScale.set(withSpring(1, SPRING));
        }}
        style={styles.button}
      >
        <View pointerEvents="none" aria-hidden style={styles.content}>
          <Animated.View style={[styles.icon, iconStyle]}>
            <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
              <Icon name={icon} color={palette['muted-foreground']} size={22} />
            </Animated.View>
            <Animated.View style={[styles.iconLayer, activeIconStyle]}>
              <Icon name={icon} color={palette.primary} size={22} />
            </Animated.View>
          </Animated.View>
          <Animated.View
            style={[
              styles.labelContainer,
              {
                height: labelHeight,
                marginTop: 11 + LABEL_GAP - (labelHeight + LABEL_GAP) / 2,
              },
              labelStyle,
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={1.5}
              style={[styles.label, { color: palette.primary }]}
            >
              {label}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { paddingTop: 8, alignItems: 'center' },
  frame: {
    width: '100%',
    maxWidth: 440,
    padding: 7,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: GAP },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 25,
  },
  slot: { flex: 1, minWidth: 48 },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 22, height: 22 },
  iconLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    top: '50%',
    left: 4,
    right: 4,
    justifyContent: 'center',
  },
  label: {
    width: '100%',
    fontSize: 12,
    lineHeight: LABEL_LINE_HEIGHT,
    fontWeight: '500',
    textAlign: 'center',
  },
});
