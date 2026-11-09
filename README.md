# rides-delivery-mobile

Expo mobile app using NativeWind 4 and Tailwind CSS 3.

## Customer delivery UI

Routes live under `src/app/` and use Expo Router. Discover offers parcel,
restaurant, shop, and cargo services. Food and Shops open searchable business
directories, followed by a business menu/catalogue, basket, delivery details,
shared order review, and preview confirmation. Parcel and Cargo open their request
forms directly. Activity separates locally saved previews
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

Business browsing lives in `src/features/merchants/`, with routes at
`/browse/[service]` and `/merchant/[id]`. Six fictional businesses demonstrate
search, categories, empty results, image cards, product search, quantity controls,
and separate in-memory baskets. Checkout saves the selected merchant ID and
validates that all items belong to that business. Older saved previews without a
merchant ID continue using their original sample catalogue. Merchant IDs, prices,
and products currently come from `catalog.ts`; no live merchant API is configured.
Nine stock photos are bundled locally for Expo Go and offline display, with
source/usage notes in `assets/catalog/README.md`. The design uses native controls,
Stolzl, and the existing Rides palette, with photo-led cards inspired by shadcn.

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

Home cards use `ScrollPressable` inside `PageScroll`: a gesture is cancelled after
10 points of movement or any intervening scroll, and a touch that stops momentum
cannot open a card. Normal taps and keyboard activation remain available; press
feedback waits 100ms and uses a subtle opacity change. Home navigation reuses
existing routes. The three tab scenes stay mounted and attached with no scene
animation, while the tab bar itself remains animated. The navigation theme uses
the same palette as the pages so transitions do not expose a different backdrop.
The native window background is also set through Expo SystemUI at module startup
and updated when the theme changes. Root, safe-area, scrolling, and footer views
have explicit backgrounds from their first render. Android stack screens slide
horizontally instead of using the default fade through the native window. These
runtime changes work in Expo Go with the already-installed `expo-system-ui`.

Delivery forms use `<Page avoidKeyboard>` so their safe area, scroll content, and
footer stay above the keyboard on both Android and iOS. `PageScroll` registers
the focused `Field`, then remeasures it after focus, keyboard appearance, or a
viewport change and scrolls only as far as needed to reveal it above the footer.
Scrolling keeps the keyboard open and preserves input focus; taps on form
controls remain available while editing. This uses
built-in React Native APIs and works in Expo Go.

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
