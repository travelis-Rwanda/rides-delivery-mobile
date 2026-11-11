import { ConfirmRemoveButton } from '../../../components/ui/ConfirmRemoveButton';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, Footer } from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { formatMoney } from '../../../features/delivery/services';
import { useRestaurantWorkspace } from '../../../features/restaurant-workspace/RestaurantWorkspaceProvider';
import {
  useRestaurantPhotoDraft,
  RestaurantPhotoEditor,
} from '../../../features/restaurant-workspace/RestaurantPhoto';
import {
  RestaurantField,
  RestaurantIntro,
  RestaurantPage,
  RestaurantPanel,
  RestaurantSection,
} from '../../../features/restaurant-workspace/ui';
import type { RestaurantMenuItem } from '../../../features/restaurant-workspace/model';

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function wholeNumber(value: string): number | undefined {
  const n = Number(value.trim());
  return Number.isFinite(n) && n >= 0 && Math.floor(n) === n ? n : undefined;
}

export default function RestaurantItemEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workspace } = useRestaurantWorkspace();
  const item =
    id === 'new' ? undefined : workspace?.menu.find((m) => m.id === id);
  if (id !== 'new' && !item)
    return (
      <RestaurantPage title="Item details">
        <EmptyState
          title="Item unavailable"
          description="Return to the menu and choose another item."
        />
      </RestaurantPage>
    );
  return <ItemForm key={id} item={item} />;
}

function ItemForm({ item }: { item?: RestaurantMenuItem }) {
  const { update, saving } = useRestaurantWorkspace();
  const creating = !item;
  const photo = useRestaurantPhotoDraft(item?.photoKey);
  const [details, setDetails] = useState<RestaurantMenuItem>(
    item ?? {
      id: 'new',
      name: '',
      category: '',
      description: '',
      price: 0,
      available: true,
      imageKey: undefined,
      photoKey: undefined,
      variants: [],
    },
  );
  const [price, setPrice] = useState(creating ? '' : String(item?.price ?? ''));
  const [variants, setVariants] = useState(() =>
    (item?.variants ?? []).map((v) => ({
      ...v,
    })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function change<K extends keyof RestaurantMenuItem>(
    key: K,
    value: RestaurantMenuItem[K],
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const nextErrors: Record<string, string> = {};
    const priceValue = Number(price.trim());
    if (!details.name.trim()) nextErrors.name = 'Enter an item name.';
    if (!details.category.trim()) nextErrors.category = 'Enter a category.';
    if (!details.description.trim())
      nextErrors.description = 'Enter a description.';
    if (!price.trim() || !Number.isFinite(priceValue) || priceValue <= 0)
      nextErrors.price = 'Enter a positive price in RWF.';
    const variantNames = new Set<string>();
    const nextVariants = variants.map((v) => {
      const name = v.name.trim();
      const key = name.toLowerCase();
      if (!name || variantNames.has(key))
        nextErrors[`name-${v.id}`] = 'Enter a unique variation name.';
      variantNames.add(key);
      return { id: v.id, name, available: true };
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const saved = await photo.save((photoKey) => {
      const nextItem: RestaurantMenuItem = {
        ...details,
        id: creating ? newId() : details.id,
        name: details.name.trim(),
        category: details.category.trim(),
        description: details.description.trim(),
        price: priceValue,
        photoKey,
        imageKey: photo.asset || photo.removed ? undefined : details.imageKey,
        variants: nextVariants,
      };
      return update((current) => ({
        ...current,
        menu: creating
          ? [...current.menu, nextItem]
          : current.menu.map((entry) =>
              entry.id === nextItem.id ? nextItem : entry,
            ),
      }));
    });
    if (saved) {
      if (router.canGoBack()) router.back();
      else router.replace('/restaurant-workspace/menu');
    }
  }

  return (
    <RestaurantPage
      title={creating ? 'Add item' : 'Edit item'}
      footer={
        <Footer>
          <Button
            label="Save item"
            icon="check"
            loading={saving || photo.saving}
            onPress={() => void save()}
          />
        </Footer>
      }
    >
      <RestaurantIntro
        eyebrow="MENU ITEM"
        title={creating ? 'New item' : (item?.name ?? '')}
        description="Add a clear photo, set a price, and describe the dish."
      />
      <View className="gap-5">
        <RestaurantPhotoEditor
          title="Item photo"
          description="Choose a clear image for this menu item."
          draft={photo}
          photoKey={item?.photoKey}
          imageKey={item?.imageKey}
          disabled={saving || photo.saving}
        />
        <RestaurantPanel>
          <RestaurantSection icon="edit" title="Item details" />
          <RestaurantField
            label="Item name"
            placeholder="Name customers will see"
            value={details.name}
            onChangeText={(value) => change('name', value)}
            error={errors.name}
            maxLength={80}
          />
          <RestaurantField
            label="Category"
            placeholder="e.g. Starters"
            value={details.category}
            onChangeText={(value) => change('category', value)}
            error={errors.category}
            maxLength={60}
          />
          <RestaurantField
            label="Description"
            placeholder="Describe the dish, ingredients, or portion size"
            value={details.description}
            onChangeText={(value) => change('description', value)}
            error={errors.description}
            multiline
            maxLength={240}
          />
          <RestaurantField
            label="Price (RWF)"
            placeholder="e.g. 8000"
            value={price}
            onChangeText={setPrice}
            error={errors.price}
            keyboardType="number-pad"
            maxLength={9}
          />
        </RestaurantPanel>
        <RestaurantPanel>
          <RestaurantSection
            icon="shop"
            title="Variations"
            description="Optional variations with separate prices (e.g. Small, Large)."
          />
          {variants.map((variant, index) => (
            <View
              key={variant.id}
              className="gap-3 rounded-xl border border-border p-3"
            >
              <RestaurantField
                label={`Variation ${index + 1} name`}
                value={variant.name}
                maxLength={60}
                error={errors[`name-${variant.id}`]}
                onChangeText={(name) =>
                  setVariants((current) =>
                    current.map((entry) =>
                      entry.id === variant.id ? { ...entry, name } : entry,
                    ),
                  )
                }
              />
              <ConfirmRemoveButton
                label="Remove variation"
                description={`Remove ${variant.name.trim() || 'this variation'} from this draft? Save your changes to apply the removal.`}
                onConfirm={() =>
                  setVariants((current) =>
                    current.filter((entry) => entry.id !== variant.id),
                  )
                }
              />
            </View>
          ))}
          <Button
            label="Add variation"
            icon="plus"
            secondary
            onPress={() =>
              setVariants((current) => [
                ...current,
                { id: newId(), name: '', available: true },
              ])
            }
          />
        </RestaurantPanel>
      </View>
    </RestaurantPage>
  );
}
