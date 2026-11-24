import type { DeliveryRequest } from '../delivery/model';
import {
  shopTrackingLabels,
  shopTrackingStatus,
} from '../delivery/shopTracking';
import { ShopTag } from './ui';

export function shopBookingRole(request: DeliveryRequest) {
  return request.parcelDirection === 'receive'
    ? 'Receiving parcel'
    : 'Sending parcel';
}

const bookingDate = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Kigali',
});

export function formatBookingDate(at: string) {
  return bookingDate.format(new Date(at));
}

export function BookingStatus({ request }: { request: DeliveryRequest }) {
  const status = shopTrackingStatus(request);
  const tone =
    status === 'completed' || status === 'delivered'
      ? 'success'
      : status === 'awaiting-pickup'
        ? 'warning'
        : status === 'draft' || status === 'cancelled'
          ? 'neutral'
          : 'primary';
  return <ShopTag label={shopTrackingLabels[status]} tone={tone} />;
}
