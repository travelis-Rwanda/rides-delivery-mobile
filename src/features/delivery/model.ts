import {
  getService,
  previewCatalog,
  stockLimit,
  type ServiceId,
} from './services';
import { getMerchant } from '../merchants/catalog';
import {
  coordinateKey,
  isCoordinate,
  isRoadRoute,
  type Coordinate,
  type RoadRoute,
} from '../maps/places';

export type ParcelDirection = 'send' | 'receive';

export type DeliveryRequest = {
  id: string;
  service: ServiceId;
  merchantId?: string;
  parcelDirection?: ParcelDirection;
  pickup: string;
  pickupPoint?: Coordinate;
  destination: string;
  destinationPoint?: Coordinate;
  roadRoute?: RoadRoute;
  description: string;
  method: 'pickup' | 'collection';
  size: 'Small' | 'Medium' | 'Large';
  // Urgent deliveries go to the nearest driver instead of the cheapest.
  urgent?: boolean;
  notes: string;
  quantities: Record<string, number>;
  createdAt: string;
  previewConfirmed: boolean;
};

export function selectedItems(request: DeliveryRequest) {
  if (request.service !== 'restaurant' && request.service !== 'shop') return [];
  const catalog = request.merchantId
    ? (getMerchant(request.merchantId, request.service)?.products ?? [])
    : previewCatalog[request.service];
  return catalog.flatMap((item) => {
    const quantity = request.quantities[item.id] ?? 0;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

export function previewEstimate(request: DeliveryRequest) {
  const items = selectedItems(request);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const transport =
    request.service === 'cargo'
      ? 12000
      : request.size === 'Large' && request.service === 'parcel'
        ? 3000
        : 1500;
  const serviceFee = request.service === 'cargo' ? 1000 : 500;
  return {
    subtotal,
    transport,
    serviceFee,
    total: subtotal + transport + serviceFee,
  };
}

export function validateRequest(
  request: DeliveryRequest,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const merchantOrder =
    request.service === 'restaurant' || request.service === 'shop';
  if (request.merchantId && !getMerchant(request.merchantId, request.service))
    errors.merchant = 'Choose a valid business for this service.';
  const merchant = getMerchant(request.merchantId, request.service);
  if (
    merchant &&
    Object.entries(request.quantities).some(
      ([id, quantity]) =>
        !merchant.products.some((item) => item.id === id) ||
        !Number.isSafeInteger(quantity) ||
        quantity < 0,
    )
  )
    errors.items = 'Check the items and quantities in this business’s basket.';
  if (!request.pickup.trim())
    errors.pickup =
      request.method === 'collection'
        ? 'Enter a collection point.'
        : 'Enter a pickup address.';
  if (!request.destination.trim())
    errors.destination = 'Enter a delivery address.';
  if (!merchantOrder && !request.description.trim())
    errors.description =
      request.parcelDirection === 'receive'
        ? 'Tell us what the sender is handing over.'
        : 'Tell us what you would like to send.';
  if (merchantOrder) {
    const items = selectedItems(request);
    if (items.some((item) => item.quantity > stockLimit(item)))
      errors.items =
        'Adjust your basket to match available stock before continuing.';
    else if (items.length === 0)
      errors.items = 'Add at least one item to continue.';
  }
  const sameStop =
    request.pickupPoint && request.destinationPoint
      ? coordinateKey(request.pickupPoint) ===
        coordinateKey(request.destinationPoint)
      : request.pickup.trim().toLowerCase() ===
        request.destination.trim().toLowerCase();
  if (request.pickup.trim() && request.destination.trim() && sameStop)
    errors.destination = 'Choose a destination different from the pickup.';
  return errors;
}

export function isDeliveryRequest(value: unknown): value is DeliveryRequest {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    !!r.id &&
    !!getService(r.service) &&
    (r.parcelDirection === undefined ||
      (r.service === 'parcel' &&
        (r.parcelDirection === 'send' || r.parcelDirection === 'receive'))) &&
    (r.merchantId === undefined ||
      (typeof r.merchantId === 'string' &&
        !!getMerchant(r.merchantId, r.service))) &&
    ['pickup', 'destination', 'description', 'notes', 'createdAt'].every(
      (key) => typeof r[key] === 'string',
    ) &&
    (r.pickupPoint === undefined || isCoordinate(r.pickupPoint)) &&
    (r.destinationPoint === undefined || isCoordinate(r.destinationPoint)) &&
    (r.roadRoute === undefined ||
      (isCoordinate(r.pickupPoint) &&
        isCoordinate(r.destinationPoint) &&
        isRoadRoute(r.roadRoute))) &&
    Number.isFinite(Date.parse(r.createdAt as string)) &&
    (r.method === 'pickup' || r.method === 'collection') &&
    ['Small', 'Medium', 'Large'].includes(r.size as string) &&
    (r.urgent === undefined || typeof r.urgent === 'boolean') &&
    typeof r.previewConfirmed === 'boolean' &&
    !!r.quantities &&
    typeof r.quantities === 'object' &&
    !Array.isArray(r.quantities) &&
    Object.values(r.quantities).every(
      (quantity) =>
        typeof quantity === 'number' &&
        Number.isSafeInteger(quantity) &&
        quantity >= 0,
    ) &&
    (r.merchantId === undefined ||
      Object.keys(r.quantities).every((id) =>
        getMerchant(r.merchantId, r.service)?.products.some(
          (item) => item.id === id,
        ),
      ))
  );
}
