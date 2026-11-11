import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Footer, Notice } from '../../components/ui/primitives';
import { Text } from '../../components/ui/Text';
import { AddressField } from '../../features/delivery/components/AddressField';
import { MapCanvas } from '../../features/maps/components/MapCanvas';
import { pickupColor } from '../../features/maps/components/mapTypes';
import type { Coordinate } from '../../features/maps/places';
import { useShopWorkspace } from '../../features/shop-workspace/ShopWorkspaceProvider';
import type { ShopApplication } from '../../features/shop-workspace/model';
import {
  ShopIntro,
  ShopField,
  ShopPage,
  ShopPanel,
  ShopSection,
  ShopTag,
} from '../../features/shop-workspace/ui';

import {
  ShopPhoto,
  ShopPhotoEditor,
  useShopPhotoDraft,
} from '../../features/shop-workspace/ShopPhoto';

const businessFields = [
  { key: 'name', label: 'Shop name', placeholder: 'Name customers will see' },
  { key: 'category', label: 'Category', placeholder: 'e.g. Groceries' },
  { key: 'contact', label: 'Business contact', placeholder: 'Phone or email' },
] as const;
const pickupField = { key: 'pickupAddress', label: 'Pickup address' } as const;
const requiredFields = [...businessFields, pickupField];
type FieldKey = (typeof requiredFields)[number]['key'];

export default function ShopRegistration() {
  const { workspace } = useShopWorkspace();
  return workspace ? (
    <RegistrationForm application={workspace.application} />
  ) : (
    <ShopPage title="Register a shop" />
  );
}

function RegistrationForm({ application }: { application: ShopApplication }) {
  const { update, saving } = useShopWorkspace();
  const photo = useShopPhotoDraft(application.photoKey);
  const [details, setDetails] = useState(application);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [savedDraft, setSavedDraft] = useState(false);
  const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);
  const busy = saving || photo.saving;
  const submitted = !!application.submittedAt;
  const { pickupAddress, pickupPoint } = submitted ? application : details;
  const markers = useMemo(
    () =>
      pickupPoint
        ? [{ point: pickupPoint, title: pickupAddress, color: pickupColor }]
        : [],
    [pickupAddress, pickupPoint],
  );

  function changeField(key: FieldKey, value: string, point?: Coordinate) {
    setSavedDraft(false);
    setDetails((current) => ({
      ...current,
      [key]: value,
      ...(key === 'pickupAddress' ? { pickupPoint: point } : {}),
    }));
    if (errors[key] && value.trim()) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  async function save(submit: boolean) {
    const next = {
      name: details.name.trim(),
      category: details.category.trim(),
      contact: details.contact.trim(),
      pickupAddress: details.pickupAddress.trim(),
      pickupPoint: details.pickupPoint,
      submittedAt: submit ? new Date().toISOString() : undefined,
    };
    const missing = submit
      ? requiredFields.filter(({ key }) => !next[key])
      : [];
    setErrors(
      Object.fromEntries(
        missing.map(({ key, label }) => [
          key,
          `Enter the ${label.toLowerCase()}.`,
        ]),
      ),
    );
    if (missing.length) return;
    const saved = await photo.save((photoKey) =>
      update((current) => {
        if (current.application.submittedAt)
          throw new Error('This application is already awaiting review.');
        return { ...current, application: { ...next, photoKey } };
      }),
    );
    if (saved) setSavedDraft(!submit);
  }

  async function withdraw() {
    const { submittedAt } = application;
    if (!submittedAt) return;
    const draft = { ...application, submittedAt: undefined };
    const saved = await update((current) => {
      if (current.application.submittedAt !== submittedAt) {
        throw new Error('This application is no longer awaiting review.');
      }
      return { ...current, application: draft };
    });
    if (saved) {
      setDetails(draft);
      setConfirmingWithdrawal(false);
      setSavedDraft(true);
    }
  }

  return (
    <ShopPage
      title="Register a shop"
      footer={
        submitted ? (
          <Footer>
            {confirmingWithdrawal && (
              <Text
                accessibilityLiveRegion="polite"
                className="text-sm leading-5 text-muted-foreground"
              >
                Your application will return to Draft. You can edit it and
                submit it again.
              </Text>
            )}
            <Button
              label={
                confirmingWithdrawal
                  ? 'Confirm withdrawal'
                  : 'Withdraw application'
              }
              icon={null}
              secondary
              loading={saving}
              onPress={() => {
                if (confirmingWithdrawal) void withdraw();
                else setConfirmingWithdrawal(true);
              }}
            />
            {confirmingWithdrawal && (
              <Button
                label="Keep application pending"
                icon={null}
                secondary
                disabled={saving}
                onPress={() => setConfirmingWithdrawal(false)}
              />
            )}
          </Footer>
        ) : (
          <Footer>
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void save(false)}
                className={`min-h-14 justify-center rounded-xl px-2 active:opacity-60 ${busy ? 'opacity-50' : ''}`}
              >
                <Text className="text-center text-sm font-medium text-foreground">
                  Save draft
                </Text>
              </Pressable>
              <View className="flex-1">
                <Button
                  label="Submit for review"
                  icon={null}
                  onPress={() => void save(true)}
                  loading={busy}
                />
              </View>
            </View>
          </Footer>
        )
      }
    >
      <ShopIntro
        eyebrow="SHOP ONBOARDING"
        title={submitted ? 'Application submitted' : 'Tell us about your shop'}
        description={
          submitted
            ? 'Your business details are ready for review.'
            : 'Add your business details and tell us where drivers should collect orders.'
        }
        status={
          <ShopTag
            label={submitted ? 'Awaiting review' : 'Draft'}
            tone={submitted ? 'warning' : 'neutral'}
          />
        }
      />
      <View className="gap-5">
        <ShopPanel>
          <ShopSection
            icon="shop"
            title="Business details"
            description={
              submitted ? undefined : 'These details are required for review.'
            }
          />
          {businessFields.map(({ key, label, placeholder }) =>
            submitted ? (
              <View key={key} className="gap-1">
                <Text className="text-xs text-muted-foreground">{label}</Text>
                <Text className="text-sm text-foreground">
                  {application[key]}
                </Text>
              </View>
            ) : (
              <ShopField
                key={key}
                label={label}
                placeholder={placeholder}
                value={details[key]}
                error={errors[key]}
                autoCapitalize={key === 'contact' ? 'none' : 'sentences'}
                autoCorrect={key !== 'contact'}
                maxLength={160}
                onChangeText={(value) => changeField(key, value)}
              />
            ),
          )}
        </ShopPanel>
        <ShopPanel>
          <ShopSection
            icon="pin"
            title="Pickup location"
            description={
              submitted ? undefined : 'Where drivers collect orders.'
            }
          />
          {submitted ? (
            <Text className="text-sm leading-6 text-foreground">
              {pickupAddress}
            </Text>
          ) : (
            <AddressField
              outlined
              label={pickupField.label}
              placeholder="Street, area, or landmark"
              value={pickupAddress}
              point={pickupPoint}
              error={errors.pickupAddress}
              maxLength={200}
              autoComplete="street-address"
              useDeviceLocation={false}
              autoFill={false}
              onChangeText={(value) => changeField('pickupAddress', value)}
              onSelectPlace={({ label, detail, latitude, longitude }) =>
                changeField(
                  'pickupAddress',
                  [label, detail].filter(Boolean).join(', ').slice(0, 200),
                  { latitude, longitude },
                )
              }
            />
          )}
          {markers.length > 0 && (
            <View className="overflow-hidden rounded-[14px] border border-border bg-muted">
              <MapCanvas
                markers={markers}
                height={210}
                label="Map showing the shop pickup location"
              />
            </View>
          )}
        </ShopPanel>
        {submitted ? (
          application.photoKey && (
            <ShopPanel>
              <ShopSection icon="image" title="Shop photo" />
              <ShopPhoto
                photoKey={application.photoKey}
                label={application.name}
                style={{ height: 170, borderRadius: 16 }}
              />
            </ShopPanel>
          )
        ) : (
          <ShopPhotoEditor
            title="Shop photo"
            description="Optional storefront photo or logo."
            draft={photo}
            photoKey={application.photoKey}
            disabled={busy}
          />
        )}
        {savedDraft && !photo.asset && !photo.removed && (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm text-success"
          >
            Draft saved on this device.
          </Text>
        )}
        <Notice>
          Registration is a preview. A live shop requires administrator review
          and activation.
        </Notice>
      </View>
    </ShopPage>
  );
}
