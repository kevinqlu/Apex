const paths = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  loads: 'M2 6h12v9H2zM14 9h4l4 3v3h-8zM6 18.5a1.5 1.5 0 1 0 0 .01M17 18.5a1.5 1.5 0 1 0 0 .01',
  alerts: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4',
  onboarding: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9',
  documents: 'M6 2h8l5 5v15H6zM14 2v5h5M9 13h7M9 17h7',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17.5v.01',
  error: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v6M12 16.5v.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  warning: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  checkCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12l3 3 5-6',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  briefcase: 'M3 7h18v13H3zM9 7V4h6v3M3 13h18',
  power: 'M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0',
  megaphone:
    'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12',
  circle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  hourglass: 'M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4',
  chevron: 'M6 9l6 6 6-6',
  signOut: 'M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9',
} as const;

export type IconName = keyof typeof paths;

// Decorative: the text next to it carries the meaning.
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}
