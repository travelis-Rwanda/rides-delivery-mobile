import { View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { finalOfferNotice } from '../chat';
import type { Party } from '../negotiation';

// The countdown shown while a final offer waits for an answer.
export function FinalOfferNotice({
  viewer,
  lastBy,
  secondsLeft,
  otherName,
}: {
  viewer: Party;
  lastBy: Party;
  secondsLeft: number;
  otherName: string;
}) {
  return (
    <View
      accessibilityRole="timer"
      className="mt-2 rounded-[20px] bg-warning-muted p-4"
    >
      <Text className="text-sm font-medium leading-5 text-foreground">
        {finalOfferNotice(viewer, lastBy, secondsLeft, otherName)}
      </Text>
    </View>
  );
}