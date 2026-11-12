import { View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { Field } from '../../../components/ui/primitives';
import { MAX_CONTACT_NAME, type Contact } from '../contact';

// A name and a phone number for the person the driver will meet.
export function ContactFields({
  title,
  hint,
  contact,
  nameError,
  phoneError,
  onChange,
}: {
  title: string;
  hint: string;
  contact: Contact | undefined;
  nameError?: string;
  phoneError?: string;
  onChange: (field: keyof Contact, text: string) => void;
}) {
  return (
    <View className="gap-3">
      <View>
        <Text className="text-sm font-medium text-foreground">{title}</Text>
        <Text className="mt-1 text-xs leading-5 text-muted-foreground">
          {hint}
        </Text>
      </View>
      <Field
        label="Name"
        placeholder="Full name"
        value={contact?.name ?? ''}
        onChangeText={(text) => onChange('name', text)}
        error={nameError}
        autoComplete="name"
        maxLength={MAX_CONTACT_NAME}
      />
      <Field
        label="Phone number"
        placeholder="0788 123 456"
        value={contact?.phone ?? ''}
        onChangeText={(text) => onChange('phone', text)}
        error={phoneError}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={20}
      />
    </View>
  );
}