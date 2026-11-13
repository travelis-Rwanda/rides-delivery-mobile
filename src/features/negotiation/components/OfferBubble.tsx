import { View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { formatMoney } from '../../delivery/services';
import { bubbleLabel, statusCaption } from '../chat';
import type { Offer, Party } from '../negotiation';

// One message in the chat. Every message is just a price. The viewer's own
// messages sit on the right in blue, the other side's on the left.
export function OfferBubble({
  offer,
  index,
  viewer,
}: {
  offer: Offer;
  index: number;
  viewer: Party;
}) {
  const mine = offer.by === viewer;
  const who = bubbleLabel(offer, index, viewer);
  const caption = statusCaption(offer, viewer);
  const faded =
    offer.status === 'countered' ||
    offer.status === 'declined' ||
    offer.status === 'expired';
  return (
    <View
      accessible
      accessibilityLabel={`${who}, ${formatMoney(offer.amount)}. ${caption}`}
      className={`mb-3 max-w-[80%] rounded-[20px] px-4 py-3 ${mine ? 'self-end bg-primary' : 'self-start bg-card'} ${faded ? 'opacity-60' : ''}`}
    >
      <Text
        className={`text-[10px] font-medium tracking-wider ${mine ? 'text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {who.toUpperCase()}
      </Text>
      <Text
        className={`mt-1 text-xl font-bold tracking-tight ${mine ? 'text-primary-foreground' : 'text-foreground'}`}
      >
        {formatMoney(offer.amount)}
      </Text>
      {!!caption && (
        <Text
          className={`mt-1 text-[11px] ${mine ? 'text-primary-foreground' : 'text-muted-foreground'}`}
        >
          {caption}
        </Text>
      )}
    </View>
  );
}