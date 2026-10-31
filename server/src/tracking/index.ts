import { config } from '../config/env.js';
import { MockProvider } from './mockProvider.js';
import { SamsaraProvider } from './samsaraProvider.js';
import type { TrackingProvider } from './provider.js';

export function createTrackingProvider(name = config.trackingProvider): TrackingProvider {
  return name === 'samsara' ? new SamsaraProvider() : new MockProvider(config.trackingSpeedup);
}
