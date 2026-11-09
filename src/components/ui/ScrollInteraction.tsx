import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type RefObject,
  type Ref,
} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  type PressableProps,
  type ScrollViewProps,
  type ScrollViewInstance,
} from 'react-native';

import { createPressIntent, type ScrollActivity } from './pressIntent';

const ScrollContext = createContext<RefObject<ScrollActivity> | null>(null);

export function ScrollArea({
  ref,
  ...props
}: ScrollViewProps & { ref?: Ref<ScrollViewInstance> }) {
  const activity = useRef<ScrollActivity>({
    version: 0,
    dragging: false,
    momentum: false,
  });

  return (
    <ScrollContext.Provider value={activity}>
      <ScrollView
        ref={ref}
        {...props}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
        canCancelContentTouches
        onScroll={(event) => {
          activity.current.version += 1;
          props.onScroll?.(event);
        }}
        onScrollBeginDrag={(event) => {
          activity.current.dragging = true;
          activity.current.version += 1;
          props.onScrollBeginDrag?.(event);
        }}
        onScrollEndDrag={(event) => {
          activity.current.dragging = false;
          props.onScrollEndDrag?.(event);
        }}
        onMomentumScrollBegin={(event) => {
          activity.current.momentum = true;
          activity.current.version += 1;
          props.onMomentumScrollBegin?.(event);
        }}
        onMomentumScrollEnd={(event) => {
          activity.current.momentum = false;
          props.onMomentumScrollEnd?.(event);
        }}
      />
    </ScrollContext.Provider>
  );
}

export function ScrollPressable({ onPress, style, ...props }: PressableProps) {
  const scroll = useContext(ScrollContext);
  const intent = useRef(createPressIntent());
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const start = (point: { pageX: number; pageY: number }) => {
    clearTimeout(resetTimer.current);
    intent.current.start(point, scroll?.current);
  };
  const end = () => {
    // onPress follows release in the same event. Clear cancelled touch state
    // afterwards so a later keyboard/screen-reader activation remains available.
    resetTimer.current = setTimeout(() => intent.current.reset(), 0);
  };

  return (
    <Pressable
      {...props}
      unstable_pressDelay={100}
      {...(Platform.OS === 'web'
        ? {
            onPointerDown: (event) => start(event.nativeEvent),
            onPointerMove: (event) => intent.current.move(event.nativeEvent),
            onPointerUp: (event) => {
              intent.current.move(event.nativeEvent);
              end();
            },
            onPointerCancel: () => {
              intent.current.cancel();
              end();
            },
          }
        : {
            onTouchStart: (event) => {
              start(event.nativeEvent);
              if (event.nativeEvent.touches.length > 1) intent.current.cancel();
            },
            onTouchMove: (event) => intent.current.move(event.nativeEvent),
            onTouchEnd: (event) => {
              intent.current.move(event.nativeEvent);
              end();
            },
            onTouchCancel: () => {
              intent.current.cancel();
              end();
            },
          })}
      onPress={(event) => {
        intent.current.move(event.nativeEvent);
        if (intent.current.canActivate(scroll?.current)) onPress?.(event);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        { opacity: state.pressed ? 0.92 : 1 },
      ]}
    />
  );
}
