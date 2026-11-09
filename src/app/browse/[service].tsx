import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import {
  Button,
  EmptyState,
  Header,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import {
  isMerchantService,
  merchants,
  searchMerchants,
  type MerchantService,
} from '../../features/merchants/catalog';
import { MerchantCard } from '../../features/merchants/components/MerchantCard';
import { SearchField } from '../../features/merchants/components/SearchField';

export default function BrowseRoute() {
  const { service } = useLocalSearchParams<{ service: string }>();
  if (!isMerchantService(service))
    return (
      <Page>
        <Header title="Explore" />
        <PageScroll>
          <EmptyState
            title="Choose a service"
            description="Open Food or Shops from Home to explore businesses."
          />
        </PageScroll>
      </Page>
    );
  return <MerchantDirectory key={service} service={service} />;
}

function MerchantDirectory({ service }: { service: MerchantService }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const food = service === 'restaurant';
  const categories = [
    'All',
    ...new Set(
      merchants
        .filter((merchant) => merchant.service === service)
        .map((merchant) => merchant.category),
    ),
  ];
  const results = searchMerchants(service, query, category);

  return (
    <Page avoidKeyboard>
      <Header title={food ? 'Restaurants' : 'Shops'} />
      <PageScroll>
        <View className="mb-5 mt-2">
          <View className="mb-3 flex-row items-center gap-2">
            <View className="h-1.5 w-1.5 rounded-full bg-primary" />
            <Text className="text-[10px] font-medium tracking-[1.4px] text-primary">
              {food ? 'SOMETHING GOOD IS COOKING' : 'THE EVERYDAY, MADE EASY'}
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            className="text-[31px] font-medium leading-[39px] tracking-[-0.9px] text-foreground"
          >
            {food ? 'Your next\ngood bite' : 'Everyday,\nwell stocked'}
            <Text className="text-primary">.</Text>
          </Text>
          <Text className="mt-2 text-[12px] leading-5 text-muted-foreground">
            {food
              ? 'Find your favourites. Discover something new.'
              : 'From the kitchen cupboard to your daily essentials.'}
          </Text>
        </View>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={
            food ? 'Search restaurants or dishes' : 'Search shops or products'
          }
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          contentContainerStyle={{ gap: 8, paddingVertical: 18 }}
        >
          {categories.map((label) => (
            <ScrollPressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${label}`}
              accessibilityState={{ selected: category === label }}
              onPress={() => setCategory(label)}
              className={`min-h-11 items-center justify-center rounded-full border px-4 ${category === label ? 'border-primary bg-primary' : 'border-border bg-card'}`}
            >
              <Text
                className={`text-[11px] font-medium ${category === label ? 'text-primary-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </Text>
            </ScrollPressable>
          ))}
        </ScrollView>
        <View className="mb-4 flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-[15px] font-medium text-foreground"
          >
            {query.trim()
              ? 'Search results'
              : food
                ? 'Places to try'
                : 'Shops to explore'}{' '}
            <Text className="text-muted-foreground">({results.length})</Text>
          </Text>
          <View className="rounded-full bg-secondary px-2.5 py-1">
            <Text className="text-[9px] font-medium text-primary">
              PREVIEW DIRECTORY
            </Text>
          </View>
        </View>
        {results.length ? (
          results.map((merchant, index) => (
            <MerchantCard
              key={merchant.id}
              merchant={merchant}
              featured={index === 0 && !query.trim() && category === 'All'}
            />
          ))
        ) : (
          <EmptyState
            icon="search"
            title="Nothing here just yet"
            description="Try a different name, dish, or category."
          >
            <Button
              label="Clear filters"
              icon="close"
              secondary
              onPress={() => {
                setQuery('');
                setCategory('All');
              }}
            />
          </EmptyState>
        )}
        <Text className="mt-6 text-[10px] leading-[17px] text-muted-foreground">
          Sample businesses and illustrative prices. Live availability will
          appear when ordering is connected.
        </Text>
      </PageScroll>
    </Page>
  );
}
