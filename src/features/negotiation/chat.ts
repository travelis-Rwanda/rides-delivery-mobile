import type { Offer, Party } from './negotiation';

// Wording for one price message, seen from the viewer's side of the chat.
// `index` is the message's position in the driver's thread, starting at 0.
export function bubbleLabel(offer: Offer, index: number, viewer: Party) {
  const mine = offer.by === viewer;
  if (viewer === 'customer')
    return mine
      ? offer.carriedFrom
        ? 'Your offer, passed on'
        : 'Your counter-offer'
      : index === 0
        ? 'Driver’s offer'
        : 'Driver’s counter-offer';
  return mine
    ? index === 0
      ? 'Your offer'
      : 'Your counter-offer'
    : offer.carriedFrom
      ? 'Customer’s offer'
      : 'Customer’s counter-offer';
}

export function statusCaption(offer: Offer, viewer: Party) {
  if (offer.status === 'accepted') return 'Accepted';
  if (offer.status === 'declined') return 'Declined';
  if (offer.status === 'expired') return 'Time ran out';  
  if (offer.status === 'pending')
    return offer.by === viewer
      ? offer.carriedFrom
        ? 'Sent on to this driver'
        : 'Waiting for reply'
      : 'Open offer';
  return ''; // countered: the next message is the reply
}

// What to tell each side while a final offer's clock is running.
export function finalOfferNotice(
  viewer: Party,
  lastBy: Party,
  secondsLeft: number,
  otherName: string,
) {
  const time = `${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`;
  if (lastBy !== viewer)
    return `Final offer. Accept within ${time}, or it moves on to the next driver.`;
  return `Final offer sent. ${time} left for ${otherName} to accept before the job moves on.`;
}