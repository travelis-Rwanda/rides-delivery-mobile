import { normalizeRwandaPhone } from '../delivery/contact';
import type { ParcelDirection } from '../delivery/model';
import type { ShopApplication } from './model';

export function shopTransportDefaults(
  direction: ParcelDirection,
  application?: ShopApplication,
) {
  const address = application?.pickupAddress.trim() ?? '';
  const point = address ? application?.pickupPoint : undefined;
  const name = application?.name.trim() ?? '';
  const phone = normalizeRwandaPhone(application?.contact ?? '') ?? '';
  const contact = name || phone ? { name, phone } : undefined;
  return direction === 'send'
    ? { pickup: address, pickupPoint: point, pickupContact: contact }
    : {
        destination: address,
        destinationPoint: point,
        receiverContact: contact,
      };
}
