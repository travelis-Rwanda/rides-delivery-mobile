import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';
import {
  Platform,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';

import { usePalette } from '../../hooks/usePalette';
import { ScrollArea } from './ScrollInteraction';
import { inputScrollAdjustment } from './keyboardGeometry';

export const KeyboardInputContext = createContext<{
  focus: (input: TextInputInstance | null) => void;
  blur: (input: TextInputInstance | null) => void;
} | null>(null);

/** Keep the focused input inside the actual scroll viewport, above any footer. */
export function KeyboardScroll({ children }: PropsWithChildren) {
  const palette = usePalette();
  const scroll = useRef<ScrollViewInstance>(null);
  const focused = useRef<TextInputInstance | null>(null);
  const offset = useRef(0);
  const frame = useRef<number | undefined>(undefined);

  const ensureVisible = useCallback(() => {
    if (Platform.OS === 'web') return; // Browsers already scroll focused fields.
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      const viewport = scroll.current;
      const input = focused.current;
      if (!viewport || !input) return;
      viewport.measureInWindow((_x, top, _width, height) => {
        if (height <= 0) return;
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (focused.current !== input || scroll.current !== viewport) return;
          const delta = inputScrollAdjustment(
            { top, height },
            { top: inputTop, height: inputHeight },
          );
          if (Math.abs(delta) > 1)
            viewport.scrollTo({
              y: Math.max(0, offset.current + delta),
              animated: true,
            });
        });
      });
    });
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      focused.current = null;
    },
    [],
  );

  const inputs = useMemo(
    () => ({
      focus(input: TextInputInstance | null) {
        focused.current = input;
        ensureVisible();
      },
      blur(input: TextInputInstance | null) {
        if (focused.current === input) focused.current = null;
      },
    }),
    [ensureVisible],
  );

  return (
    <KeyboardInputContext.Provider value={inputs}>
      <ScrollArea
        ref={scroll}
        style={{ flex: 1, backgroundColor: palette.background }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets={false}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
        }}
        onLayout={ensureVisible}
        onKeyboardDidShow={ensureVisible}
        onContentSizeChange={ensureVisible}
      >
        {children}
      </ScrollArea>
    </KeyboardInputContext.Provider>
  );
}
