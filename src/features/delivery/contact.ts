// The person the driver will meet at the pickup, or at the delivery address.
export type Contact = { name: string; phone: string };

export const MAX_CONTACT_NAME = 80;

// Rwandan mobile numbers: 07X XXX XXX, where X is 2, 3, 8 or 9 (Airtel and
// MTN). Accepts the usual ways people type them and returns +2507XXXXXXXX, or
// null when it isn't a valid number. Confirm the prefixes with the telecoms.
export function normalizeRwandaPhone(input: string): string | null {
  const compact = input.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;
  let digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('250')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return /^7[2389]\d{7}$/.test(digits) ? `+250${digits}` : null;
}

// +250788123456 -> +250 788 123 456
export function formatPhone(phone: string): string {
  const parts = /^\+250(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return parts ? `+250 ${parts[1]} ${parts[2]} ${parts[3]}` : phone;
}

export function contactLine(contact: Contact): string {
  return `${contact.name} · ${formatPhone(contact.phone)}`;
}

// A contact as it is stored: a name and a phone already in +250 form.
export function isContact(value: unknown): value is Contact {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    c.name.length <= MAX_CONTACT_NAME &&
    typeof c.phone === 'string' &&
    /^\+2507[2389]\d{7}$/.test(c.phone)
  );
}

// Turns what the customer typed into what we store, or undefined if it is
// not a valid contact yet.
export function cleanContact(contact: Contact): Contact | undefined {
  const name = contact.name.trim();
  const phone = normalizeRwandaPhone(contact.phone);
  return name && name.length <= MAX_CONTACT_NAME && phone
    ? { name, phone }
    : undefined;
}

export type ContactKey = 'pickupContact' | 'receiverContact';

// Form errors for one contact, keyed like pickupContactName and
// pickupContactPhone so each field can show its own message.
export function contactErrors(
  key: ContactKey,
  contact: Contact | undefined,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!contact?.name.trim())
    errors[`${key}Name`] =
      key === 'pickupContact'
        ? 'Enter the name of the person at the pickup.'
        : 'Enter the name of the person receiving it.';
  else if (contact.name.trim().length > MAX_CONTACT_NAME)
    errors[`${key}Name`] = 'Use a shorter name.';
  if (!contact || !normalizeRwandaPhone(contact.phone))
    errors[`${key}Phone`] =
      'Enter a valid Rwandan mobile number, like 0788 123 456.';
  return errors;
}