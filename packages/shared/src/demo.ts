import type { Role } from './workflow';

export const DEMO_PASSWORD = 'DemoPass!2026';

export const DEMO_ACCOUNTS: readonly { email: string; name: string; role: Role }[] = [
  { email: 'amina@hub.test', name: 'Amina Odhiambo', role: 'teacher' },
  { email: 'kevin@hub.test', name: 'Kevin Mutua', role: 'teacher' },
  { email: 'grace@hub.test', name: 'Grace Wambui', role: 'curriculum_lead' },
];
