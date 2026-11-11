import type { Offer, Party } from './negotiation';

// Wording for one price message, seen from the viewer's side of the chat.
// `index` is the message's position in the driver's thread, starting at 0.
export function bubbleLabel(offer: Offer, index: number, viewer: Party) {
  const mine = offer.by === viewer;
  if (viewer === 'customer')
    return mine
      ? 'Your counter-offer'
      : index === 0
        ? 'Driver’s offer'
        : 'Driver’s counter-offer';
  return mine
    ? index === 0
      ? 'Your offer'
      : 'Your counter-offer'
    : 'Customer’s counter-offer';
}

export function statusCaption(offer: Offer, viewer: Party) {
  if (offer.status === 'accepted') return 'Accepted';
  if (offer.status === 'declined') return 'Declined';
  if (offer.status === 'pending')
    return offer.by === viewer ? 'Waiting for reply' : 'Open offer';
  return ''; // countered: the next message is the reply
}