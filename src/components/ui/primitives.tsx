import { router } from 'expo-router';
import { useContext, useRef, useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type TextInputInstance,
} from 'react-native';
import { Text } from './Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePalette } from '../../hooks/usePalette';
import { Icon, type IconName } from './Icon';
import { BrandMark } from './Brand';
import { KeyboardInputContext, KeyboardScroll } from './KeyboardScroll';

export function Page({
  children,
  avoidKeyboard = false,
}: PropsWithChildren<{ avoidKeyboard?: boolean }>) {
  const palette = usePalette();
  const content = (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: palette.background }}
    >
      {children}
    </SafeAreaView>
  );
  return avoidKeyboard ? (
    <KeyboardAvoidingView
      // This wraps our own header and safe area; there is no native header offset.
      behavior="padding"
      enabled={Platform.OS !== 'web'}
      keyboardVerticalOffset={0}
      style={{ flex: 1, backgroundColor: palette.background }}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );
}

export function PageScroll({ children }: PropsWithChildren) {
  return (
    <KeyboardScroll>
      <View className="mx-auto w-full max-w-2xl px-5 pb-8">{children}</View>
    </KeyboardScroll>
  );
}

export function Header({
  title,
  back = true,
  action,
}: {
  title: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  const palette = usePalette();
  return (
    <View className="mx-auto w-full max-w-2xl flex-row items-center gap-3 px-5 pb-4 pt-3">
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
          className="h-11 w-11 items-center justify-center rounded-[14px] bg-card active:opacity-60"
        >
          <Icon name="back" color={palette.foreground} />
        </Pressable>
      )}
      <Text
        accessibilityRole="header"
        className="flex-1 text-[15px] font-medium tracking-[-0.3px] text-foreground"
      >
        {title}
      </Text>
      {action ?? <BrandMark size={29} />}
    </View>
  );
}

export function Button({
  label,
  onPress,
  secondary,
  loading,
  disabled,
  icon = 'arrow',
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName | null;
}) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-14 flex-row items-center justify-center gap-3 rounded-[16px] px-5 py-4 active:opacity-70 ${secondary ? 'border border-border bg-card' : 'bg-primary'} ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator
          color={secondary ? palette.primary : palette['primary-foreground']}
        />
      ) : (
        <>
          <Text
            className={`text-[14px] font-medium ${secondary ? 'text-foreground' : 'text-primary-foreground'}`}
          >
            {label}
          </Text>
          {icon && (
            <Icon
              name={icon}
              size={19}
              color={
                secondary ? palette.foreground : palette['primary-foreground']
              }
            />
          )}
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  onFocus,
  onBlur,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const palette = usePalette();
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const keyboard = useContext(KeyboardInputContext);
  return (
    <View className="gap-2">
      <Text className="text-[12px] font-medium text-foreground">{label}</Text>
      <TextInput
        ref={input}
        accessibilityLabel={label}
        placeholderTextColor={palette['muted-foreground']}
        className={`min-h-14 rounded-[16px] border bg-card px-4 py-[18px] text-[14px] text-foreground ${error ? 'border-destructive' : focused ? 'border-primary' : 'border-input'}`}
        {...props}
        style={[{ fontFamily: 'Stolzl' }, style]}
        onFocus={(event) => {
          setFocused(true);
          keyboard?.focus(input.current);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          keyboard?.blur(input.current);
          onBlur?.(event);
        }}
      />
      {!!error && (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}

export function Notice({
  children,
  warning = false,
}: PropsWithChildren<{ warning?: boolean }>) {
  const palette = usePalette();
  return (
    <View
      className={`flex-row items-start gap-3 rounded-[16px] p-4 ${warning ? 'bg-warning-muted' : 'bg-card'}`}
    >
      <Icon
        name={warning ? 'help' : 'shield'}
        size={20}
        color={warning ? palette.warning : palette.primary}
      />
      <Text className="flex-1 text-[11px] leading-[19px] text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = 'parcel',
  title,
  description,
  children,
}: PropsWithChildren<{ icon?: IconName; title: string; description: string }>) {
  const palette = usePalette();
  return (
    <View className="items-center rounded-[24px] bg-card px-6 py-10">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Icon name={icon} size={29} color={palette.primary} />
      </View>
      <Text
        accessibilityRole="header"
        className="text-center text-[20px] font-medium leading-7 text-foreground"
      >
        {title}
      </Text>
      <Text className="mb-6 mt-3 max-w-xs text-center text-[12px] leading-[21px] text-muted-foreground">
        {description}
      </Text>
      {children}
    </View>
  );
}

export function Footer({ children }: PropsWithChildren) {
  const palette = usePalette();
  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="border-t border-border"
      style={{ backgroundColor: palette.card }}
    >
      <View className="mx-auto w-full max-w-2xl gap-2 px-5 pb-3 pt-4">
        {children}
      </View>
    </SafeAreaView>
  );
}

export function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View className="mb-7 mt-1 flex-row items-center">
      {['Service', 'Details', 'Review'].map((label, index) => (
        <View key={label} className="flex-1 flex-row items-center gap-2">
          <View
            className={`h-6 w-6 items-center justify-center rounded-full ${index < step ? 'bg-primary' : 'bg-muted'}`}
          >
            <Text
              className={`text-[10px] font-medium ${index < step ? 'text-white' : 'text-muted-foreground'}`}
            >
              {index + 1}
            </Text>
          </View>
          <Text
            className={`text-[10px] font-medium ${index === step - 1 ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {label}
          </Text>
          {index < 2 && <View className="mr-2 h-px flex-1 bg-border" />}
        </View>
      ))}
    </View>
  );
}
