import { useState } from 'react';
import { View } from 'react-native';

import { Button, Footer, Notice } from '../../components/ui/primitives';
import { Text } from '../../components/ui/Text';
import { useRestaurantWorkspace } from '../../features/restaurant-workspace/RestaurantWorkspaceProvider';
import {
  useRestaurantPhotoDraft,
  RestaurantPhotoEditor,
  RestaurantPhoto,
} from '../../features/restaurant-workspace/RestaurantPhoto';
import {
  RestaurantField,
  RestaurantIntro,
  RestaurantPage,
  RestaurantPanel,
  RestaurantSection,
} from '../../features/restaurant-workspace/ui';
import { AddressField } from '../../features/delivery/components/AddressField';
import type { RestaurantApplication } from '../../features/restaurant-workspace/model';
import { MapCanvas } from '../../features/maps/components/MapCanvas';
import type { Place } from '../../features/maps/places';

export default function RestaurantRegistration() {
  const { workspace } = useRestaurantWorkspace();
  return workspace ? (
    <RegistrationForm application={workspace.application} />
  ) : (
    <RestaurantPage title="Registration" />
  );
}

function RegistrationForm({
  application,
}: {
  application: RestaurantApplication;
}) {
  const { update, saving } = useRestaurantWorkspace();
  const submitted = !!application?.submittedAt;
  const photo = useRestaurantPhotoDraft(application?.photoKey);
  const [savedDraft, setSavedDraft] = useState(false);
  const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);

  const [fields, setFields] = useState({
    name: application?.name ?? '',
    cuisine: application?.cuisine ?? '',
    contact: application?.contact ?? '',
    address: application?.address ?? '',
  });
  const [pickupPoint, setPickupPoint] = useState(application?.pickupPoint);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function change(key: keyof typeof fields, value: string) {
    setSavedDraft(false);
    if (key === 'address') setPickupPoint(undefined);
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handlePickupSelect(place: Place) {
    setPickupPoint({ latitude: place.latitude, longitude: place.longitude });
    setSavedDraft(false);
    setFields((current) => ({
      ...current,
      address: [place.label, place.detail].filter(Boolean).join(', '),
    }));
  }

  async function saveDraft() {
    const saved = await photo.save((photoKey) =>
      update((current) => ({
        ...current,
        application: {
          ...current.application,
          ...fields,
          pickupPoint,
          photoKey,
        },
      })),
    );
    if (saved) setSavedDraft(true);
  }

  async function submit() {
    const nextErrors: Record<string, string> = {};
    if (!fields.name.trim()) nextErrors.name = 'Enter the restaurant name.';
    if (!fields.cuisine.trim()) nextErrors.cuisine = 'Enter the cuisine type.';
    if (!fields.contact.trim()) nextErrors.contact = 'Enter a contact number.';
    if (!fields.address.trim()) nextErrors.address = 'Enter the address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    await photo.save((photoKey) =>
      update((current) => ({
        ...current,
        application: {
          ...current.application,
          ...fields,
          pickupPoint,
          photoKey,
          submittedAt: new Date().toISOString(),
        },
      })),
    );
  }

  const busy = saving || photo.saving;
  const mapMarkers = pickupPoint
    ? [
        {
          point: pickupPoint,
          title: fields.name || 'Restaurant',
          color: '#E05A1E',
        },
      ]
    : [];

  return (
    <RestaurantPage
      title="Registration"
      footer={
        !submitted ? (
          <Footer>
            <Button
              label="Submit registration"
              icon="check"
              loading={busy}
              onPress={() => void submit()}
            />
            <Button
              label="Save draft"
              icon={null}
              secondary
              disabled={busy}
              onPress={() => void saveDraft()}
            />
          </Footer>
        ) : (
          <Footer>
            {confirmingWithdrawal && (
              <Text className="text-sm leading-5 text-muted-foreground">
                Withdraw this application and return to an editable draft?
              </Text>
            )}
            <Button
              label={
                confirmingWithdrawal
                  ? 'Confirm withdrawal'
                  : 'Withdraw application'
              }
              secondary
              icon={null}
              loading={busy}
              onPress={() => {
                if (!confirmingWithdrawal) {
                  setConfirmingWithdrawal(true);
                  return;
                }
                void update((current) => {
                  if (
                    current.application.submittedAt !== application.submittedAt
                  )
                    throw new Error(
                      'This application has changed. Reopen it to continue.',
                    );
                  return {
                    ...current,
                    application: {
                      ...current.application,
                      submittedAt: undefined,
                    },
                  };
                }).then((saved) => {
                  if (saved) {
                    setConfirmingWithdrawal(false);
                    setSavedDraft(true);
                  }
                });
              }}
            />
            {confirmingWithdrawal && (
              <Button
                label="Keep application pending"
                secondary
                icon={null}
                disabled={busy}
                onPress={() => setConfirmingWithdrawal(false)}
              />
            )}
          </Footer>
        )
      }
    >
      <RestaurantIntro
        eyebrow="REGISTRATION"
        title={submitted ? 'Awaiting review' : 'Register your restaurant'}
        description={
          submitted
            ? 'Your restaurant registration has been submitted for review.'
            : 'Fill in your restaurant details to apply to join the Rides platform.'
        }
      />

      <View className="gap-5">
        <RestaurantPanel>
          <RestaurantSection icon="food" title="Restaurant details" />
          <RestaurantField
            label="Restaurant name"
            placeholder="As it will appear to customers"
            value={fields.name}
            onChangeText={(v) => change('name', v)}
            error={errors.name}
            maxLength={80}
            editable={!submitted}
          />
          <RestaurantField
            label="Cuisine type"
            placeholder="e.g. Rwandan, Italian, Fast food"
            value={fields.cuisine}
            onChangeText={(v) => change('cuisine', v)}
            error={errors.cuisine}
            maxLength={60}
            editable={!submitted}
          />
          <RestaurantField
            label="Contact number"
            placeholder="+250 7XX XXX XXX"
            value={fields.contact}
            onChangeText={(v) => change('contact', v)}
            error={errors.contact}
            keyboardType="phone-pad"
            maxLength={20}
            editable={!submitted}
          />
        </RestaurantPanel>

        <RestaurantPanel>
          <RestaurantSection
            icon="pin"
            title="Pickup location"
            description="Where drivers will collect orders."
          />
          <AddressField
            outlined
            label="Address"
            placeholder="Street name or area"
            value={fields.address}
            point={pickupPoint}
            onChangeText={(value) => change('address', value)}
            onSelectPlace={handlePickupSelect}
            error={errors.address}
            editable={!submitted}
            useDeviceLocation={false}
            autoFill={false}
            maxLength={200}
          />
          {mapMarkers.length > 0 && (
            <View className="overflow-hidden rounded-[14px]">
              <MapCanvas
                markers={mapMarkers}
                height={210}
                label="Map showing the restaurant pickup location"
              />
            </View>
          )}
        </RestaurantPanel>

        {submitted ? (
          application?.photoKey && (
            <RestaurantPanel>
              <RestaurantSection icon="edit" title="Restaurant photo" />
              <RestaurantPhoto
                photoKey={application.photoKey}
                label={application.name}
                style={{ height: 170, borderRadius: 16 }}
              />
            </RestaurantPanel>
          )
        ) : (
          <RestaurantPhotoEditor
            title="Restaurant photo"
            description="Optional storefront photo or logo."
            draft={photo}
            photoKey={application?.photoKey}
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
          Registration is a preview. A live restaurant requires administrator
          review and activation.
        </Notice>
      </View>
    </RestaurantPage>
  );
}
