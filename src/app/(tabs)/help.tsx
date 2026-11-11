import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/ui/Text';

import { Icon } from '../../components/ui/Icon';
import {
  Header,
  Notice,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { usePalette } from '../../hooks/usePalette';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';

const questions = [
  {
    title: 'What can I send with Rides?',
    answer:
      'Choose Parcel for everyday items, Restaurants for meals, Shops for products, or Cargo & intercity for bigger loads. Availability and vehicle suitability must be confirmed for each real request.',
  },
  {
    title: 'How do collection points work?',
    answer:
      'For parcels, you can choose a collection point drop-off instead of a driver pickup. The collection point and receiving arrangement must be confirmed before the delivery starts.',
  },
  {
    title: 'How is the final price confirmed?',
    answer:
      'The driver’s transport fare is shown separately from platform fees and item prices. For parcel and cargo requests, you approve the final driver offer before payment. The amounts in this preview are illustrative.',
  },
  {
    title: 'Do I need a new Rides account?',
    answer:
      'Delivery is part of the existing Rides ecosystem. It is designed to reuse your Rides account, so a separate delivery login is not needed.',
  },
  {
    title: 'Does confirming a preview book a delivery?',
    answer:
      'No. This version saves a preview on your device so you can review the experience. It does not send a request, book a driver, contact a merchant, or take a payment.',
  },
];

export default function HelpScreen() {
  const [open, setOpen] = useState<number | null>(0);
  const palette = usePalette();
  return (
    <Page>
      <Header title="Help & support" back={false} />
      <PageScroll>
        <View className="mb-6 py-3">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-[16px] bg-secondary">
            <Icon name="help" color={palette.primary} size={27} />
          </View>
          <Text
            accessibilityRole="header"
            className="text-[27px] font-medium tracking-[-0.7px] text-foreground"
          >
            Here to help.
          </Text>
          <Text className="mt-3 text-sm leading-6 text-muted-foreground">
            A few answers to make your next delivery a little easier.
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          className="mb-4 text-lg font-bold text-foreground"
        >
          Frequently asked questions
        </Text>
        <View className="mb-6 overflow-hidden rounded-[20px] bg-card">
          {questions.map((question, index) => (
            <View
              key={question.title}
              className={index > 0 ? 'border-t border-border' : ''}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open === index }}
                onPress={() => setOpen(open === index ? null : index)}
                className="min-h-16 flex-row items-center gap-4 p-5 active:opacity-60"
              >
                <Text className="flex-1 text-sm font-medium leading-5 text-foreground">
                  {question.title}
                </Text>
                <Icon
                  name={open === index ? 'minus' : 'plus'}
                  color={palette.primary}
                  size={18}
                />
              </Pressable>
              {open === index && (
                <Text className="px-5 pb-5 text-sm leading-6 text-muted-foreground">
                  {question.answer}
                </Text>
              )}
            </View>
          ))}
        </View>
        <Notice>
          You’re always in control. Review the delivery details and the final
          charges before confirming a real booking.
        </Notice>
        <ScrollPressable
          accessibilityRole="button"
          onPress={() => router.push('/shop-workspace')}
          className="mt-4 min-h-16 flex-row items-center gap-3 rounded-[18px] border border-border bg-card p-4"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Icon name="shop" color={palette.primary} size={20} />
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-sm font-medium text-foreground">
              Shop workspace
            </Text>
            <Text className="text-xs text-muted-foreground">
              Merchant preview
            </Text>
          </View>
          <Icon name="chevron" color={palette['muted-foreground']} size={17} />
        </ScrollPressable>
      </PageScroll>
    </Page>
  );
}
