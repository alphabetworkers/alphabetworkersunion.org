// Dependency of both server and client sides.

const REQUIRED_METADATA = [
  'employment-type',
  'signature',
  'preferred-name',
  'personal-email',
  'personal-phone',
  'mailing-address-1',
  'mailing-city',
  'mailing-region',
  'mailing-postal-code',
  'mailing-country',
  'employer',
  'site-code',
  'org',
  'team',
  'job-title',
  'have-reports',
  'total-compensation',
  'sms-consent',
];

export const REQUIRED_FIELDS = REQUIRED_METADATA.concat([
  'preferred-name',
  'personal-email',
]);

const OPTIONAL_METADATA = [
  'pronouns',
  'preferred-language',
  'mailing-address-2',
  'building-code',
  'product-area',
  'work-email',
  'birthday',
];

export const METADATA = REQUIRED_METADATA.concat(OPTIONAL_METADATA);
