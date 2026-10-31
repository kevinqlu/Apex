import type { OnboardingTemplate } from './onboarding.js';

export const PROOF_OF_DELIVERY = 'proof_of_delivery';

const LABELS: Record<string, string> = {
  cdl: "Commercial driver's license",
  medical_card: 'Medical card',
  [PROOF_OF_DELIVERY]: 'Proof of delivery',
};

// A document type the company adds to the onboarding template still gets a readable name.
export function labelFor(type: string): string {
  const known = LABELS[type];
  if (known) return known;
  const words = type.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Required documents come from the onboarding template, so adding an upload task there
// adds it to the Documents screen too, with no code change.
export function requiredDocumentTypes(template: OnboardingTemplate): string[] {
  const types = template.tasks.flatMap((t) =>
    t.type === 'upload' && t.docType ? [t.docType] : [],
  );
  return [...new Set(types)];
}
