export const SUPPORT = {
  roadside: {
    label: 'Emergency roadside assistance',
    phone: '555-0100',
    hours: 'Answered 24 hours a day, every day',
  },
  terminal: {
    phone: '555-0110',
    hours: 'Answered from 6 in the morning to 10 at night',
  },
};

export const TICKET_CATEGORIES = [
  { id: 'load', label: 'A problem with a load' },
  { id: 'pay', label: 'Pay or settlement' },
  { id: 'equipment', label: 'My truck or trailer' },
  { id: 'documents', label: 'Documents or onboarding' },
  { id: 'app', label: 'Using this app' },
  { id: 'other', label: 'Something else' },
] as const;

export const TICKET_MESSAGE_MIN = 10;
export const TICKET_MESSAGE_MAX = 1000;
