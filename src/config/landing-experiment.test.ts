import { describe, it, expect } from 'vitest';
import { getAppConfig } from './app.config';

describe('Love presentation experiment', () => {
  it('keeps the Love data mode and two-pick limit under the new display name', () => {
    const config = getAppConfig('love');
    expect(config.appType).toBe('love');
    expect(config.maxPicks).toBe(2);
  });
});