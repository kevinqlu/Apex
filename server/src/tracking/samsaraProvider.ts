import type { Position, TrackingProvider } from './provider.js';

// A stub that marks where the real Samsara integration plugs in. It makes no network calls.
// A real version would read SAMSARA_API_TOKEN, find the vehicle assigned to the load, and
// return its latest location. Never put the token in a message.
export class SamsaraProvider implements TrackingProvider {
  readonly simulated = false;

  getPosition(): Position | null {
    throw new Error('Samsara tracking is not configured.');
  }
}
