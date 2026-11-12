/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  cleanContact,
  contactErrors,
  contactLine,
  formatPhone,
  isContact,
  normalizeRwandaPhone,
} from '../src/features/delivery/contact';
import {
  isDeliveryRequest,
  validateRequest,
  type DeliveryRequest,
} from '../src/features/delivery/model';
import { contactsVisible } from '../src/features/driver-workspace/jobs';
import { tripKey } from '../src/features/pricing/forRequest';

const base: DeliveryRequest = {
  id: 'r1',
  service: 'parcel',
  pickup: 'Kimironko Market',
  destination: 'Kicukiro Centre',
  description: 'Documents',
  method: 'pickup',
  size: 'Small',
  notes: '',
  quantities: {},
  createdAt: '2026-11-11T10:00:00.000Z',
  previewConfirmed: false,
};
const pickupContact = { name: 'Eric Test', phone: '+250788123456' };
const receiverContact = { name: 'Aline Test', phone: '+250728123456' };
const withContacts = { ...base, pickupContact, receiverContact };

test('Rwandan numbers are accepted however they are typed', () => {
  for (const typed of [
    '0788123456',
    '078 812 3456',
    '0788-123-456',
    '(0788) 123 456',
    '788123456',
    '250788123456',
    '+250788123456',
    '+250 788 123 456',
    '00250788123456',
  ])
    assert.equal(normalizeRwandaPhone(typed), '+250788123456', typed);
  assert.equal(normalizeRwandaPhone('0728123456'), '+250728123456');
  assert.equal(normalizeRwandaPhone('0738123456'), '+250738123456');
  assert.equal(normalizeRwandaPhone('0798123456'), '+250798123456');
});

test('anything that is not a Rwandan mobile number is rejected', () => {
  for (const typed of [
    '',
    '   ',
    'abc',
    '12345',
    '078812345', // too short
    '07881234567', // too long
    '0688123456', // not a mobile prefix
    '0708123456',
    '0718123456',
    '+14155552671', // another country
    '+250 788 123 45x',
    '07 88 +123 456',
  ])
    assert.equal(normalizeRwandaPhone(typed), null, typed);
});

test('phone numbers are shown in groups', () => {
  assert.equal(formatPhone('+250788123456'), '+250 788 123 456');
  assert.equal(formatPhone('not a number'), 'not a number');
  assert.equal(
    contactLine({ name: 'Eric', phone: '+250788123456' }),
    'Eric · +250 788 123 456',
  );
});

test('a stored contact needs a name and a phone in +250 form', () => {
  assert.ok(isContact(pickupContact));
  for (const bad of [
    null,
    {},
    { name: '', phone: '+250788123456' },
    { name: '   ', phone: '+250788123456' },
    { name: 'Eric', phone: '0788123456' }, // not normalised yet
    { name: 'Eric', phone: '+250688123456' },
    { name: 'Eric' },
    { name: 'x'.repeat(81), phone: '+250788123456' },
    { name: 5, phone: '+250788123456' },
  ])
    assert.equal(isContact(bad), false, JSON.stringify(bad));
});

test('what the customer typed is cleaned before it is saved', () => {
  assert.deepEqual(
    cleanContact({ name: '  Eric N.  ', phone: '078 812 3456' }),
    {
      name: 'Eric N.',
      phone: '+250788123456',
    },
  );
  assert.equal(cleanContact({ name: '', phone: '0788123456' }), undefined);
  assert.equal(cleanContact({ name: 'Eric', phone: '123' }), undefined);
});

test('each missing detail gets its own message', () => {
  assert.deepEqual(contactErrors('pickupContact', undefined), {
    pickupContactName: 'Enter the name of the person at the pickup.',
    pickupContactPhone:
      'Enter a valid Rwandan mobile number, like 0788 123 456.',
  });
  assert.deepEqual(
    contactErrors('receiverContact', { name: '', phone: '0788123456' }),
    { receiverContactName: 'Enter the name of the person receiving it.' },
  );
  assert.deepEqual(
    contactErrors('receiverContact', { name: 'Aline', phone: '99' }),
    {
      receiverContactPhone:
        'Enter a valid Rwandan mobile number, like 0788 123 456.',
    },
  );
  assert.deepEqual(contactErrors('pickupContact', pickupContact), {});
});

test('parcel and cargo requests need contacts at both ends', () => {
  for (const service of ['parcel', 'cargo'] as const) {
    const errors = validateRequest({ ...base, service });
    assert.ok(errors.pickupContactName && errors.pickupContactPhone, service);
    assert.ok(
      errors.receiverContactName && errors.receiverContactPhone,
      service,
    );
    assert.deepEqual(validateRequest({ ...withContacts, service }), {});
  }
});

test('contacts are checked as typed, so 0788 123 456 is fine', () => {
  const typed = {
    ...base,
    pickupContact: { name: 'Eric', phone: '0788 123 456' },
    receiverContact: { name: 'Aline', phone: '+250 728 123 456' },
  };
  assert.deepEqual(validateRequest(typed), {});
  assert.ok(
    validateRequest({
      ...typed,
      receiverContact: { name: 'Aline', phone: '0688123456' },
    }).receiverContactPhone,
  );
});

test('restaurant and shop orders do not ask for contacts', () => {
  const errors = validateRequest({
    ...base,
    service: 'restaurant',
    description: '',
    quantities: { chicken: 1 },
  });
  assert.equal(errors.pickupContactName, undefined);
  assert.equal(errors.receiverContactPhone, undefined);
});

test('saved requests keep their contacts and still load without them', () => {
  assert.ok(isDeliveryRequest(base));
  const saved = JSON.parse(JSON.stringify(withContacts));
  assert.ok(isDeliveryRequest(saved));
  assert.deepEqual(saved.pickupContact, pickupContact);
  assert.equal(
    isDeliveryRequest({
      ...withContacts,
      pickupContact: { name: 'Eric', phone: '123' },
    }),
    false,
  );
  assert.equal(
    isDeliveryRequest({ ...withContacts, receiverContact: 'Aline' }),
    false,
  );
});

test('contact details do not change the trip, so nobody has to renegotiate', () => {
  assert.equal(tripKey(withContacts), tripKey(base));
});

test('a driver who passed no longer sees the contacts', () => {
  assert.equal(contactsVisible('your-turn'), true);
  assert.equal(contactsVisible('waiting'), true);
  assert.equal(contactsVisible('agreed'), true);
  assert.equal(contactsVisible('passed'), false);
});