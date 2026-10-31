import { request } from './client';

export type TaskStatus = 'done' | 'todo' | 'waiting';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'upload' | 'esign' | 'company';
  optional: boolean;
  docType?: string;
  ownerLabel?: string;
  minutes?: number;
  dueAt: string;
  status: TaskStatus;
  completedAt?: string;
  note?: string;
}

export interface Onboarding {
  phases: { id: string; title: string; tasks: OnboardingTask[] }[];
  progress: { done: number; total: number };
  // True only in demo mode, when the demo "mark complete" buttons are allowed.
  demoActions: boolean;
}

export const getOnboarding = () => request<Onboarding>('GET', '/onboarding');

export const completeTask = (taskId: string, body: { name?: string } = {}) =>
  request<Onboarding>('POST', `/onboarding/tasks/${taskId}/complete`, body);

export const demoCompleteTask = (taskId: string) =>
  request<Onboarding>('POST', `/onboarding/tasks/${taskId}/demo-complete`);
