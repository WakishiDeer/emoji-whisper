import type { PromptConfig } from '../services/prompt';

export type AvailabilityState = 'available' | 'unavailable' | 'downloading' | 'downloadable';

export interface AvailabilityChecker {
  checkAvailability(config: PromptConfig): Promise<AvailabilityState>;
}
