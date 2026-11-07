# rides-delivery-mobile

Expo mobile app using NativeWind 4 and Tailwind CSS 3.

## Customer delivery UI

Routes live under `src/app/` and use Expo Router. Discover offers parcel,
restaurant, shop, and cargo services; each leads through a request form, shared
order review, and preview confirmation. Activity separates locally saved previews
from future active and past bookings. Help includes accessible expandable FAQs.

This is a frontend preview: sample catalogue prices and estimates are illustrative.
No request is sent, driver booked, merchant contacted, or payment taken. Saved
previews use AsyncStorage on the current device. Existing Rides authentication is
not replaced. Merchant catalogues, collection-point availability, quotes, booking,
payments, and real order history still require the existing Rides APIs.

Shared controls are in `src/components/ui/`; delivery types, validation,
illustrative data, storage, and vector scenes are in `src/features/delivery/`.
Service IDs and stored data are validated before use. Save failures remain
visible and do not produce a successful confirmation.

The bottom navigation uses `src/components/navigation/AnimatedTabBar.tsx`.
Inactive tabs show their icons; the selected tab lifts its icon and reveals its
Stolzl label underneath, inside a sliding pill. Equal-width slots keep touch
targets in place, and the bar grows with the system font scale (up to 1.5×).
Labels stay at their final size and fade/translate into place with a 260ms easing
curve; only the icons receive press scaling. Reanimated springs drive the
sliding highlight and touch feedback,
respecting the device's reduced-motion preference. Tab press/long-press events,
accessible names and selection state, and safe-area spacing remain connected to
Expo Router.

## Styling

The UI bundles the supplied Rides logo at `assets/brand/rides-logo.png` and the
installed Stolzl Regular, Medium, and Bold faces under `assets/fonts/`. Expo Font
loads the three weights as one `Stolzl` family before rendering the app. Shared
text and field primitives, plus the navigation labels, all use that family.
The PNG is preserved with its original transparency.

The approved Rides light and dark palettes live in `src/constants/colors.js`.
`tailwind.config.js` turns these tokens into CSS variables and semantic utilities.
The app follows the device's light/dark appearance automatically. On iOS,
primary/tint/star, warning, destructive, and accent foreground use Apple system
colors; Android and web use the supplied hex values. Brand success green stays
separate from system green. Muted tokens retain their supplied alpha values.

```tsx
<View className="flex-1 bg-background p-6">
  <View className="rounded-2xl border border-border bg-card p-4">
    <Text className="text-lg font-bold text-foreground">Delivery details</Text>
    <Text className="text-muted-foreground">Your delivery updates</Text>
    <Text className="text-primary">View delivery</Text>
    <Text className="bg-success-muted text-success">Delivered</Text>
  </View>
</View>
```

Other tokens include `secondary`, `accent`, `warning`, `destructive`, `input`,
`surface`, and foreground variants such as `text-primary-foreground`.
Aliases include `tint`, `star`, `brand-green`, `surface-alt`, and `system-blue`.
Opaque colors support opacity modifiers, for example `bg-primary/50` on Android
and web. Use the explicit muted tokens for the approved translucent colors.

After changing Babel, Metro, or theme configuration, restart Metro with:

```sh
npm start -- --clear
```

Rebuild an existing development client after adding native dependencies.

## Checks

```sh
npm run lint
npm run typecheck
npm test
```

Setup follows the [NativeWind installation guide](https://www.nativewind.dev/docs/getting-started/installation).
