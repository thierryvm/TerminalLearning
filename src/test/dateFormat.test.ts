/**
 * `date +FORMAT` and `Get-Date -Format`. Every expected value was printed by the
 * real tools for the same local date (26 September 2026): GNU date with
 * LC_ALL=C, and .NET DateTime.ToString with the en-US culture in PowerShell 7.6.
 */
import { describe, it, expect } from 'vitest';
import { strftime, dotnetDateFormat, psDefaultDate } from '../app/data/commands/dateFormat';

const evening = new Date(2026, 8, 26, 21, 4, 5);
const morning = new Date(2026, 0, 5, 7, 8, 9);

describe('day of year across a daylight-saving change', () => {
  it('counts calendar days: 30 March 2026 at 00:30 is day 089', () => {
    // Belgium moved to summer time on 29 March 2026; a local-time division lost that hour.
    expect(strftime(new Date(2026, 2, 30, 0, 30), '%j')).toBe('089');
  });
});

describe('strftime (date +FORMAT)', () => {
  it('matches GNU date for the common conversions', () => {
    expect(strftime(evening, '%Y-%m-%d %H:%M:%S|%a %A %b %B|%e|%j|%y|%F %T')).toBe(
      '2026-09-26 21:04:05|Sat Saturday Sep September|26|269|26|2026-09-26 21:04:05',
    );
    expect(strftime(morning, '%e|%j|%a %b')).toBe(' 5|005|Mon Jan');
  });

  it('keeps %% and unknown conversions as written', () => {
    expect(strftime(evening, '100%% %Q')).toBe('100% %Q');
  });
});

describe('dotnetDateFormat (Get-Date -Format)', () => {
  it('matches .NET en-US for custom formats', () => {
    expect(dotnetDateFormat(evening, 'yyyy-MM-dd HH:mm')).toBe('2026-09-26 21:04');
    expect(dotnetDateFormat(evening, 'ddd MMM yy H:m:s')).toBe('Sat Sep 26 21:4:5');
    expect(dotnetDateFormat(evening, "yyyy'T'HH")).toBe('2026T21');
  });

  it('prints the en-US default of Get-Date', () => {
    expect(psDefaultDate(evening)).toBe('Saturday, September 26, 2026 9:04:05 PM');
    expect(psDefaultDate(morning)).toBe('Monday, January 5, 2026 7:08:09 AM');
  });
});
