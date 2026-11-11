import { ConfirmRemoveButton } from '../../../components/ui/ConfirmRemoveButton';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, Footer } from '../../../components/ui/primitives';
import { useShopWorkspace } from '../../../features/shop-workspace/ShopWorkspaceProvider';
import {
  wholeNumber,
  type ShopProduct,
} from '../../../features/shop-workspace/model';
import {
  ShopPhotoEditor,
  useShopPhotoDraft,
} from '../../../features/shop-workspace/ShopPhoto';
import {
  ShopField,
  ShopIntro,
  ShopPage,
  ShopPanel,
  ShopSection,
} from '../../../features/shop-workspace/ui';

const emptyProduct: ShopProduct = {
  id: 'new',
  name: '',
  description: '',
  category: '',
  price: 0,
  stock: 0,
  variants: [],
};
const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export default function ShopProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workspace } = useShopWorkspace();
  const product =
    id === 'new'
      ? emptyProduct
      : workspace?.products.find((item) => item.id === id);
  if (!product)
    return (
      <ShopPage title="Product details">
        <EmptyState
          title="Product unavailable"
          description="Return to the catalogue and choose another product."
        />
      </ShopPage>
    );
  return <ProductForm key={product.id} product={product} />;
}

function ProductForm({ product }: { product: ShopProduct }) {
  const { update, saving } = useShopWorkspace();
  const creating = product.id === 'new';
  const photo = useShopPhotoDraft(product.photoKey);
  const [details, setDetails] = useState(product);
  const [price, setPrice] = useState(creating ? '' : String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [variants, setVariants] = useState(() =>
    product.variants.map((variant) => ({
      ...variant,
      stock: String(variant.stock),
    })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function change<K extends keyof ShopProduct>(key: K, value: ShopProduct[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const nextErrors: Record<string, string> = {};
    const priceValue = wholeNumber(price);
    const stockValue = wholeNumber(stock);
    if (!details.name.trim()) nextErrors.name = 'Enter a product name.';
    if (!details.category.trim()) nextErrors.category = 'Enter a category.';
    if (!details.description.trim())
      nextErrors.description = 'Enter a product description.';
    if (priceValue === undefined || priceValue === 0)
      nextErrors.price = 'Enter a positive whole price in RWF.';
    if (!variants.length && stockValue === undefined)
      nextErrors.stock = 'Enter a whole stock quantity of zero or more.';
    const variantNames = new Set<string>();
    const nextVariants = variants.map((variant) => {
      const name = variant.name.trim();
      const key = name.toLocaleLowerCase();
      const quantity = wholeNumber(variant.stock);
      if (!name || variantNames.has(key))
        nextErrors[`name-${variant.id}`] = 'Enter a unique variation name.';
      variantNames.add(key);
      if (quantity === undefined)
        nextErrors[`stock-${variant.id}`] =
          'Enter a whole stock quantity of zero or more.';
      return { id: variant.id, name, stock: quantity ?? 0 };
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || priceValue === undefined) return;
    const item: ShopProduct = {
      ...details,
      id: creating ? newId() : details.id,
      name: details.name.trim(),
      category: details.category.trim(),
      description: details.description.trim(),
      price: priceValue,
      stock: variants.length ? 0 : (stockValue ?? 0),

      variants: nextVariants,
    };
    const saved = await photo.save((photoKey) => {
      const nextItem = {
        ...item,
        photoKey,
        imageKey: photo.asset || photo.removed ? undefined : item.imageKey,
        imageUrl: photo.asset || photo.removed ? undefined : item.imageUrl,
      };
      return update((current) => ({
        ...current,
        products: creating
          ? [...current.products, nextItem]
          : current.products.map((entry) =>
              entry.id === item.id ? nextItem : entry,
            ),
      }));
    });
    if (saved) {
      if (router.canGoBack()) router.back();
      else router.replace('/shop-workspace/catalogue');
    }
  }

  return (
    <ShopPage
      title={creating ? 'Add product' : 'Edit product'}
      footer={
        <Footer>
          <Button
            label="Save product"
            icon="check"
            loading={saving || photo.saving}
            onPress={() => void save()}
          />
        </Footer>
      }
    >
      <ShopIntro
        eyebrow="CATALOGUE"
        title={creating ? 'New product' : product.name}
        description="Add a clear photo, set a price, and record the stock you have on hand."
      />
      <View className="gap-5">
        <ShopPhotoEditor
          title="Product photo"
          description="Choose a clear image for this catalogue item."
          draft={photo}
          photoKey={product.photoKey}
          imageKey={product.imageKey}
          imageUri={product.imageUrl}
          disabled={saving || photo.saving}
        />
        <ShopPanel>
          <ShopSection icon="edit" title="Product details" />
          <ShopField
            label="Product name"
            placeholder="Name customers will see"
            value={details.name}
            onChangeText={(value) => change('name', value)}
            error={errors.name}
            maxLength={80}
          />
          <ShopField
            label="Category"
            placeholder="e.g. Bakery"
            value={details.category}
            onChangeText={(value) => change('category', value)}
            error={errors.category}
            maxLength={60}
          />
          <ShopField
            label="Description"
            placeholder="Describe the item, size, or pack contents"
            value={details.description}
            onChangeText={(value) => change('description', value)}
            error={errors.description}
            multiline
            maxLength={240}
          />
          <ShopField
            label="Price (RWF)"
            placeholder="e.g. 3500"
            value={price}
            onChangeText={setPrice}
            error={errors.price}
            keyboardType="number-pad"
            maxLength={9}
          />
        </ShopPanel>
        <ShopPanel>
          <ShopSection
            icon="shop"
            title="Stock & variations"
            description="A quantity of zero marks the product or variation as out of stock."
          />
          {!variants.length && (
            <ShopField
              label="Stock quantity"
              value={stock}
              onChangeText={setStock}
              error={errors.stock}
              keyboardType="number-pad"
              maxLength={8}
            />
          )}
          {variants.map((variant, index) => (
            <View
              key={variant.id}
              className="gap-3 rounded-xl border border-border p-3"
            >
              <ShopField
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
              <ShopField
                label={`Variation ${index + 1} stock`}
                value={variant.stock}
                keyboardType="number-pad"
                maxLength={8}
                error={errors[`stock-${variant.id}`]}
                onChangeText={(quantity) =>
                  setVariants((current) =>
                    current.map((entry) =>
                      entry.id === variant.id
                        ? { ...entry, stock: quantity }
                        : entry,
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
                { id: newId(), name: '', stock: '0' },
              ])
            }
          />
        </ShopPanel>
      </View>
    </ShopPage>
  );
}
