import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Text } from '../../components/ui/Text';
import {
  Button,
  EmptyState,
  Footer,
  Header,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { formatMoney } from '../../features/delivery/services';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { useMerchantCart } from '../../features/merchants/MerchantCartProvider';
import {
  basketSummary,
  getMerchant,
  type Merchant,
} from '../../features/merchants/catalog';
import { CatalogImage } from '../../features/merchants/components/CatalogImage';
import { ProductTile } from '../../features/merchants/components/ProductTile';
import { SearchField } from '../../features/merchants/components/SearchField';
import { usePalette } from '../../hooks/usePalette';

export default function MerchantRoute() {
  const { id, request, edit } = useLocalSearchParams<{
    id: string;
    request?: string;
    edit?: string;
  }>();
  const merchant = getMerchant(id);
  if (!merchant)
    return (
      <Page>
        <Header title="Business" />
        <PageScroll>
          <EmptyState
            title="Business not found"
            description="This business is not available in the preview directory."
          >
            <Button
              label="Explore restaurants"
              onPress={() => router.replace('/browse/restaurant')}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  return (
    <MerchantMenu
      key={`${merchant.id}-${request ?? 'new'}`}
      merchant={merchant}
      requestId={request}
      editing={edit === '1'}
    />
  );
}

function MerchantMenu({
  merchant,
  requestId,
  editing,
}: {
  merchant: Merchant;
  requestId?: string;
  editing: boolean;
}) {
  const palette = usePalette();
  const { requests } = useDelivery();
  const existing = requests.find(
    (request) => request.id === requestId && request.merchantId === merchant.id,
  );
  const { quantities, replace } = useMerchantCart(
    merchant.id,
    requestId,
    existing?.quantities,
  );
  const [query, setQuery] = useState('');
  const summary = basketSummary(merchant, quantities);
  const products = merchant.products.filter((item) =>
    `${item.name} ${item.description}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Page avoidKeyboard>
      <Header
        title={
          merchant.service === 'restaurant' ? 'On the menu' : 'Inside the shop'
        }
      />
      <PageScroll>
        <CatalogImage
          imageKey={merchant.cover}
          style={{ height: 160, borderRadius: 24, marginTop: 4 }}
        />
        <View className="mb-5 mt-4">
          <View className="mb-2 flex-row items-center justify-between gap-3">
            <Text className="text-[10px] font-medium tracking-[1px] text-primary">
              {merchant.category.toUpperCase()}
            </Text>
            <Text className="text-[9px] text-muted-foreground">
              PREVIEW BUSINESS
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            className="text-[28px] font-medium leading-9 tracking-[-0.7px] text-foreground"
          >
            {merchant.name}
          </Text>
          <Text className="mt-2 text-[12px] leading-5 text-muted-foreground">
            {merchant.description}
          </Text>
        </View>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={
            merchant.service === 'restaurant'
              ? 'Find something delicious'
              : 'Find what you need'
          }
        />
        <View className="mb-4 mt-5 flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="flex-1 text-[16px] font-medium text-foreground"
          >
            {query ? 'Matching items' : merchant.collection}
          </Text>
          <Text className="ml-3 text-[10px] text-muted-foreground">
            {products.length} items
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-between">
          {products.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              quantity={quantities[product.id] ?? 0}
              onChange={(quantity) =>
                replace({ ...quantities, [product.id]: quantity })
              }
            />
          ))}
        </View>
        {!products.length && (
          <EmptyState
            icon="search"
            title="No matching items"
            description="Try another search to explore this catalogue."
          >
            <Button
              label="Clear search"
              secondary
              onPress={() => setQuery('')}
            />
          </EmptyState>
        )}
        <View className="flex-row items-start gap-2.5 border-t border-border pt-4">
          <Icon name="shield" size={16} color={palette['muted-foreground']} />
          <Text className="flex-1 text-[10px] leading-[17px] text-muted-foreground">
            Illustrative prices and photos. Your basket becomes a saved preview;
            no order is sent to the business.
          </Text>
        </View>
      </PageScroll>
      <Footer>
        {summary.count > 0 && (
          <View className="mb-1 flex-row justify-between gap-3">
            <Text className="text-[11px] text-muted-foreground">
              {summary.count} {summary.count === 1 ? 'item' : 'items'} in your
              basket
            </Text>
            <Text className="text-[12px] font-medium text-foreground">
              {formatMoney(summary.subtotal)}
            </Text>
          </View>
        )}
        <Button
          label={
            summary.count
              ? editing
                ? 'Update basket'
                : 'Continue to delivery'
              : 'Add items to your basket'
          }
          disabled={summary.count === 0}
          onPress={() => {
            if (editing && router.canGoBack()) {
              router.back();
              return;
            }
            router.navigate({
              pathname: '/delivery/[service]',
              params: {
                service: merchant.service,
                merchant: merchant.id,
                ...(requestId ? { id: requestId } : {}),
              },
            });
          }}
        />
        <Text className="text-center text-[10px] leading-4 text-muted-foreground">
          {summary.count
            ? 'Transport fare and service fee shown separately at review.'
            : 'Choose something you like to get started.'}
        </Text>
      </Footer>
    </Page>
  );
}
