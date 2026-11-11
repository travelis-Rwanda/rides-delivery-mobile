import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, View } from 'react-native';

import { Text } from './Text';
import { Button } from './primitives';

/** Keep destructive draft edits behind the same confirmation on native and web. */
export function ConfirmRemoveButton({
  label,
  description,
  onConfirm,
  disabled = false,
}: {
  label: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        label={label}
        icon="minus"
        secondary
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
      />
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-center bg-black/70 px-6 py-12">
          <ScrollView
            bounces={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={() => setOpen(false)}
              className="mx-auto w-full max-w-md gap-5 rounded-[24px] border border-border bg-card p-6"
            >
              <Text
                accessibilityRole="header"
                className="text-xl font-medium text-foreground"
              >
                {label}?
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                {description}
              </Text>
              <View className="gap-3">
                <Button
                  label="Cancel"
                  secondary
                  icon="close"
                  onPress={() => setOpen(false)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => {
                    setOpen(false);
                    onConfirm();
                  }}
                  className="min-h-14 items-center justify-center rounded-[16px] bg-red-600 px-5 py-4 active:opacity-70"
                >
                  <Text className="text-center text-sm font-medium text-white">
                    {label}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
