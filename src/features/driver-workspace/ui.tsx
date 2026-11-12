import { Linking, View } from 'react-native';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/primitives';
import { formatPhone, type Contact } from '../delivery/contact';
import type { DeliveryRequest } from '../delivery/model';
import { suggestedVehicle, vehicleLabels } from '../negotiation/selection';
import type { JobStatus } from './jobs';

const tags: Record<JobStatus, { label: string; box: string; text: string }> = {
  'your-turn': {
    label: 'Your turn',
    box: 'bg-primary',
    text: 'text-primary-foreground',
  },
  waiting: {
    label: 'Waiting for customer',
    box: 'bg-secondary',
    text: 'text-muted-foreground',
  },
  agreed: {
    label: 'Fare agreed',
    box: 'bg-success-muted',
    text: 'text-foreground',
  },
  passed: {
    label: 'Passed',
    box: 'bg-secondary',
    text: 'text-muted-foreground',
  },
};

export function JobTag({ status }: { status: JobStatus }) {
  const tag = tags[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tag.box}`}>
      <Text className={`text-[10px] font-medium ${tag.text}`}>{tag.label}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="mb-1 text-xs text-muted-foreground">{label}</Text>
      <Text className="text-sm leading-5 text-foreground">{value}</Text>
    </View>
  );
}

// Who the driver meets at one end of the trip, and how to reach them.
function ContactBlock({
  label,
  address,
  contact,
  visible,
}: {
  label: string;
  address: string;
  contact: Contact | undefined;
  visible: boolean;
}) {
  return (
    <View className="gap-2 border-t border-border pt-4">
      <Text className="text-[10px] font-bold tracking-wider text-muted-foreground">
        {label}
      </Text>
      <Text className="text-sm leading-5 text-foreground">{address}</Text>
      {!visible ? (
        <Text className="text-xs leading-5 text-muted-foreground">
          Contact details are hidden because you passed on this job.
        </Text>
      ) : !contact ? (
        <Text className="text-xs leading-5 text-muted-foreground">
          No contact details were given for this request.
        </Text>
      ) : (
        <View className="gap-2">
          <Text className="text-sm font-medium text-foreground">
            {contact.name}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {formatPhone(contact.phone)}
          </Text>
          <Button
            label={`Call ${contact.name}`}
            icon={null}
            secondary
            onPress={() =>
              void Linking.openURL(`tel:${contact.phone}`).catch(() => {})
            }
          />
        </View>
      )}
    </View>
  );
}

// Everything the driver needs to do the job, with who to call at each end.
export function JobDetails({
  request,
  contactsVisible,
}: {
  request: DeliveryRequest;
  contactsVisible: boolean;
}) {
  return (
    <View className="mb-4 gap-4 rounded-[20px] bg-card p-5">
      <Text className="text-base font-bold text-foreground">
        Delivery details
      </Text>
      <Detail
        label="What’s being delivered"
        value={request.description || 'Not given'}
      />
      <Detail
        label="Size"
        value={`${request.size}, suggested vehicle: ${vehicleLabels[suggestedVehicle(request)]}`}
      />
      {request.packaging && (
        <Detail
          label="Packaging"
          value="The customer asked for the item to be packaged."
        />
      )}
      {!!request.notes && (
        <Detail label="Delivery notes" value={request.notes} />
      )}
      <ContactBlock
        label="PICKUP"
        address={request.pickup}
        contact={request.pickupContact}
        visible={contactsVisible}
      />
      <ContactBlock
        label="DELIVER TO"
        address={request.destination}
        contact={request.receiverContact}
        visible={contactsVisible}
      />
    </View>
  );
}