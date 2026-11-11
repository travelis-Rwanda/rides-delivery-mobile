import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon, type IconName } from '../../components/ui/Icon';
import {
  Button,
  EmptyState,
  Field,
  Header,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import { usePalette } from '../../hooks/usePalette';
import { useRestaurantWorkspace } from './RestaurantWorkspaceProvider';

export function RestaurantPage({
  title,
  children,
  footer,
}: PropsWithChildren<{ title: string; footer?: React.ReactNode }>) {
  const { workspace, loading, error, reload } = useRestaurantWorkspace();
  const palette = usePalette();
  return (
    <Page avoidKeyboard>
      <Header title={title} />
      <PageScroll>
        {loading ? (
          <ActivityIndicator
            color={palette.primary}
            accessibilityLabel="Loading restaurant workspace"
          />
        ) : !workspace ? (
          <EmptyState title="Restaurant workspace unavailable" description={error}>
            <Button label="Try again" onPress={reload} />
          </EmptyState>
        ) : (
          <>
            {error ? (
              <Text
                accessibilityRole="alert"
                className="mb-4 rounded-xl bg-card p-4 text-sm text-destructive"
              >
                {error}
              </Text>
            ) : null}
            {children}
          </>
        )}
      </PageScroll>
      {workspace && footer}
    </Page>
  );
}

export function RestaurantIntro({
  eyebrow,
  title,
  description,
  status,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: ReactNode;
}) {
  return (
    <View className="mb-6 mt-2 gap-2.5">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-5 rounded-full bg-primary" />
          <Text className="text-[10px] font-medium tracking-widest text-primary">
            {eyebrow}
          </Text>
        </View>
        {status}
      </View>
      <Text
        accessibilityRole="header"
        className="text-[32px] font-medium leading-[39px] tracking-[-0.8px] text-foreground"
      >
        {title}
      </Text>
      <Text className="text-sm leading-6 text-muted-foreground">
        {description}
      </Text>
    </View>
  );
}

export function RestaurantField(
  props: Omit<ComponentProps<typeof Field>, 'outlined'>,
) {
  return <Field {...props} outlined />;
}

export function RestaurantPanel({ children }: PropsWithChildren) {
  return (
    <View className="gap-4 rounded-[22px] border border-border bg-card p-4">
      {children}
    </View>
  );
}

export function RestaurantSection({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description?: string;
}) {
  const palette = usePalette();
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-secondary">
        <Icon name={icon} color={palette.primary} size={19} />
      </View>
      <View className="flex-1 gap-1">
        <Text
          accessibilityRole="header"
          className="text-base font-medium text-foreground"
        >
          {title}
        </Text>
        {description && (
          <Text className="text-xs leading-5 text-muted-foreground">
            {description}
          </Text>
        )}
      </View>
    </View>
  );
}

export function RestaurantTag({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'warning' | 'success';
}) {
  const style = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-secondary text-primary',
    warning: 'bg-warning-muted text-warning',
    success: 'bg-success-muted text-success',
  }[tone];
  return (
    <Text
      className={`self-start overflow-hidden rounded-full px-3 py-1.5 text-[11px] font-medium ${style}`}
    >
      {label}
    </Text>
  );
}

export function RestaurantRow({
  title,
  description,
  icon,
  leading,
  grouped,
  onPress,
  children,
}: PropsWithChildren<{
  title: string;
  description: string;
  icon?: IconName;
  leading?: React.ReactNode;
  grouped?: boolean;
  onPress: () => void;
}>) {
  const palette = usePalette();
  return (
    <ScrollPressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-[74px] flex-row items-center gap-3 px-4 py-3 ${grouped ? '' : 'rounded-[20px] border border-border bg-card'}`}
    >
      {leading ??
        (icon && (
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary">
            <Icon name={icon} color={palette.primary} size={21} />
          </View>
        ))}
      <View className="flex-1 gap-1">
        <Text className="text-sm font-medium text-foreground">{title}</Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {description}
        </Text>
        {children}
      </View>
      <Icon name="chevron" color={palette['muted-foreground']} size={17} />
    </ScrollPressable>
  );
}
