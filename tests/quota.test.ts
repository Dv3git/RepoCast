import { describe, expect, it } from 'vitest';
import { startOfTodayMadrid } from '@/lib/quota';

describe('startOfTodayMadrid', () => {
  it('en invierno, medianoche de Madrid son las 23:00 UTC del día anterior', () => {
    expect(startOfTodayMadrid(new Date('2026-01-15T10:00:00Z'))).toBe('2026-01-14T23:00:00.000Z');
  });

  it('en verano, son las 22:00 UTC del día anterior', () => {
    expect(startOfTodayMadrid(new Date('2026-07-15T10:00:00Z'))).toBe('2026-07-14T22:00:00.000Z');
  });

  it('justo después de medianoche en Madrid ya cuenta como el día nuevo', () => {
    // 23:30 UTC del 15 de enero = 00:30 del 16 en Madrid
    expect(startOfTodayMadrid(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-15T23:00:00.000Z');
  });
});
