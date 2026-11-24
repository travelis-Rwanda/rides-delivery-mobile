import type { DeliveryRequest } from './model';

const deliverySteps = [
  'on-the-way',
  'in-transit',
  'delivered',
  'completed',
] as const;
type DeliveryStep = (typeof deliverySteps)[number];
type TrackingStatus = 'draft' | 'awaiting-pickup' | DeliveryStep | 'cancelled';

export type ShopTrackingEvent = {
  status: DeliveryStep | 'cancelled';
  at: string;
};

export const shopTrackingLabels: Record<TrackingStatus, string> = {
  draft: 'Draft',
  'awaiting-pickup': 'Awaiting pickup',
  'on-the-way': 'Driver on the way',
  'in-transit': 'In transit',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function shopTrackingStatus(request: DeliveryRequest): TrackingStatus {
  return (
    request.shopTracking?.at(-1)?.status ??
    (request.previewConfirmed ? 'awaiting-pickup' : 'draft')
  );
}

export function isPastShopBooking(request: DeliveryRequest) {
  const status = shopTrackingStatus(request);
  return status === 'completed' || status === 'cancelled';
}

export function isShopTracking(
  value: unknown,
  confirmed: unknown,
): value is ShopTrackingEvent[] {
  return (
    Array.isArray(value) &&
    value.every((entry, index) => {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.at !== 'string' ||
        !Number.isFinite(Date.parse(entry.at))
      )
        return false;
      if (entry.status === 'cancelled') return value.length === 1;
      return (
        confirmed === true &&
        entry.status === deliverySteps[index] &&
        index < deliverySteps.length
      );
    })
  );
}

export function nextShopTrackingStep(request: DeliveryRequest) {
  const status = shopTrackingStatus(request);
  switch (status) {
    case 'awaiting-pickup':
      return {
        status: 'on-the-way',
        label: 'Simulate driver departure',
      } as const;
    case 'on-the-way':
      return { status: 'in-transit', label: 'Simulate pickup' } as const;
    case 'in-transit':
      return { status: 'delivered', label: 'Simulate delivery' } as const;
    case 'delivered':
      return {
        status: 'completed',
        label: 'Confirm arrival in preview',
      } as const;
    default:
      return undefined;
  }
}

export function recordShopTracking(
  request: DeliveryRequest,
  status: ShopTrackingEvent['status'],
): DeliveryRequest {
  const current = shopTrackingStatus(request);
  const allowed =
    status === 'cancelled'
      ? current === 'draft' || current === 'awaiting-pickup'
      : nextShopTrackingStep(request)?.status === status;
  if (request.bookingSource !== 'shop' || !allowed)
    throw new Error('This booking has already moved to another stage.');
  return {
    ...request,
    shopTracking: [
      ...(request.shopTracking ?? []),
      { status, at: new Date().toISOString() },
    ],
  };
}

export function shopTrackingTimeline(request: DeliveryRequest) {
  const events = request.shopTracking ?? [];
  const cancelled = shopTrackingStatus(request) === 'cancelled';
  const steps: { status: TrackingStatus; at?: string; reached: boolean }[] = [
    { status: 'draft', at: request.createdAt, reached: true },
  ];
  if (request.previewConfirmed || !cancelled) {
    steps.push({
      status: 'awaiting-pickup',
      reached: request.previewConfirmed,
    });
  }
  if (cancelled)
    return [
      ...steps,
      { status: 'cancelled' as const, at: events[0].at, reached: true },
    ];
  deliverySteps.forEach((status, index) => {
    const event = events[index];
    steps.push({ status, at: event?.at, reached: !!event });
  });
  return steps;
}
