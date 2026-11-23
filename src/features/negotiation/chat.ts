import { MAX_MESSAGES_PER_PARTY, type Offer, type Party } from './negotiation';

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

// What to tell each side while the driver's reply clock is running. The clock
// only runs while the driver has not replied to the customer's message.
export function finalOfferNotice(
  viewer: Party,
  lastBy: Party,
  secondsLeft: number,
  otherName: string,
) {
  const time = `${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`;
  if (lastBy !== viewer)
    return `Reply within ${time}, or the job moves on to the next driver.`;
  return `Waiting for ${otherName} to reply. ${time} left before the job moves on.`;
}

// How many messages each side has left in this driver's chat.
export function messagesLeftNote(left: number) {
  if (left <= 0)
    return 'You have no messages left in this chat. Accept or decline the last offer.';
  return `You have ${left} of ${MAX_MESSAGES_PER_PARTY} messages left in this chat.`;
}