import type { IconName } from '../../components/ui/Icon';

export type ServiceId = 'parcel' | 'restaurant' | 'shop' | 'cargo';
export type Service = {
  id: ServiceId;
  title: string;
  label: string;
  description: string;
  eyebrow: string;
  icon: IconName;
  tone: 'blue' | 'green' | 'orange';
};

export const services: readonly Service[] = [
  {
    id: 'parcel',
    title: 'Send a parcel',
    label: 'Parcel delivery',
    description: 'From your doorstep to theirs.',
    eyebrow: 'SEND & RECEIVE',
    icon: 'parcel',
    tone: 'blue',
  },
  {
    id: 'restaurant',
    title: 'Restaurants',
    label: 'Restaurant delivery',
    description: 'Good food. Brought to you.',
    eyebrow: 'FRESH TO YOUR DOOR',
    icon: 'food',
    tone: 'orange',
  },
  {
    id: 'shop',
    title: 'Shops',
    label: 'Shop delivery',
    description: 'Your everyday, taken care of.',
    eyebrow: 'EVERYDAY ESSENTIALS',
    icon: 'shop',
    tone: 'green',
  },
  {
    id: 'cargo',
    title: 'Cargo & intercity',
    label: 'Cargo delivery',
    description: 'Bigger loads. Further places.',
    eyebrow: 'MORE ROOM TO MOVE',
    icon: 'cargo',
    tone: 'blue',
  },
];

export function getService(value: unknown): Service | undefined {
  return services.find((service) => service.id === value);
}

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: 'food' | 'shop';
  imageKey?: string;
};

// Illustrative catalogue and charges for the UI preview. These must be replaced
// by merchant and quote APIs before real ordering can be enabled.
export const previewCatalog: Record<
  'restaurant' | 'shop',
  readonly CatalogItem[]
> = {
  restaurant: [
    {
      id: 'chicken',
      imageKey: 'chicken',
      name: 'Grilled chicken & rice',
      description: 'Grilled chicken, rice, fresh salad',
      price: 6500,
      icon: 'food',
    },
    {
      id: 'bowl',
      imageKey: 'bowl',
      name: 'Garden bowl',
      description: 'Seasonal vegetables, grains, avocado',
      price: 4500,
      icon: 'food',
    },
    {
      id: 'burger',
      imageKey: 'burger',
      name: 'Classic beef burger',
      description: 'Beef patty, lettuce, tomato, fries',
      price: 5500,
      icon: 'food',
    },
  ],
  shop: [
    {
      id: 'produce',
      imageKey: 'produce',
      name: 'Fresh produce basket',
      description: 'A selection of everyday fruit and vegetables',
      price: 7000,
      icon: 'shop',
    },
    {
      id: 'pantry',
      imageKey: 'pantry',
      name: 'Pantry essentials',
      description: 'Rice, beans, and cooking oil',
      price: 12000,
      icon: 'shop',
    },
    {
      id: 'home',
      imageKey: 'home',
      name: 'Home care bundle',
      description: 'Everyday cleaning essentials',
      price: 8500,
      icon: 'shop',
    },
  ],
};

export const formatMoney = (amount: number) =>
  `RWF ${amount.toLocaleString('en-US')}`;
