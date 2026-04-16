// Single source of truth for the Olympus-616 launch moment.
// Countdown timer, hero copy, CTA wording, and the "live now" state
// all read from here so we can update the date in one place if the
// launch slips.
export const LAUNCH_DATE = new Date('2026-07-17T00:00:00-04:00');

/** Friendly display date (locale-agnostic, matches marketing copy). */
export const LAUNCH_DATE_DISPLAY = 'July 17, 2026';
