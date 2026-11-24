import { useState } from 'react';
import { View } from 'react-native';

import { ConfirmRemoveButton } from '../../components/ui/ConfirmRemoveButton';
import { Button, Footer } from '../../components/ui/primitives';
import { Text } from '../../components/ui/Text';
import { isMomoMerchantCode } from '../../features/shop-workspace/model';
import { useShopWorkspace } from '../../features/shop-workspace/ShopWorkspaceProvider';
import {
  ShopField,
  ShopIntro,
  ShopPage,
  ShopPanel,
  ShopTag,
} from '../../features/shop-workspace/ui';

export default function ShopMomoScreen() {
  const { workspace } = useShopWorkspace();
  if (!workspace) return <ShopPage title="MoMo merchant code" />;
  return (
    <MerchantCodeForm
      key={workspace.momoMerchantCode ?? ''}
      savedCode={workspace.momoMerchantCode}
    />
  );
}

function MerchantCodeForm({ savedCode }: { savedCode?: string }) {
  const { saving, update } = useShopWorkspace();
  const [code, setCode] = useState(savedCode ?? '');
  const [error, setError] = useState('');
  const trimmedCode = code.trim();
  const changed = trimmedCode !== (savedCode ?? '');

  async function save() {
    if (!isMomoMerchantCode(trimmedCode)) {
      setError(
        trimmedCode
          ? 'Enter the merchant code using digits only.'
          : 'Enter your merchant code.',
      );
      return;
    }
    await update((current) => ({ ...current, momoMerchantCode: trimmedCode }));
  }

  return (
    <ShopPage
      title="MoMo merchant code"
      footer={
        <Footer>
          <Button
            label="Save merchant code"
            icon="check"
            disabled={saving || (!!savedCode && !changed)}
            onPress={() => void save()}
          />
        </Footer>
      }
    >
      <ShopIntro
        eyebrow="MTN MOMO PAY"
        title={savedCode ? 'Manage your code' : 'Add your merchant code'}
        description="Enter the merchant code assigned to your shop by MTN MoMo Pay."
        status={
          savedCode && (
            <ShopTag
              label={changed ? 'Unsaved changes' : 'Code saved'}
              tone={changed ? 'warning' : 'success'}
            />
          )
        }
      />
      <View className="gap-4">
        <ShopPanel>
          <ShopField
            label="Merchant code"
            placeholder="Enter your merchant code"
            inputMode="numeric"
            value={code}
            error={error}
            editable={!saving}
            onChangeText={(value) => {
              setCode(value);
              setError('');
            }}
          />
          <Text
            accessibilityLiveRegion="polite"
            className="text-xs leading-5 text-muted-foreground"
          >
            {savedCode && !changed
              ? 'Your merchant code is saved on this device.'
              : 'The preview saves your code on this device.'}
          </Text>
        </ShopPanel>
        {savedCode && (
          <ConfirmRemoveButton
            label="Remove merchant code"
            description="Remove the saved code from this shop in the preview?"
            disabled={saving}
            onConfirm={() =>
              void update((current) => ({
                ...current,
                momoMerchantCode: undefined,
              }))
            }
          />
        )}
      </View>
    </ShopPage>
  );
}
