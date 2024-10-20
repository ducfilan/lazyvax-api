import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

/**
 * Get the start date of last week.
 * @returns {Date} Start date of last week.
 */
export const getLastWeekStart = (): Date => {
  return startOfWeek(subWeeks(new Date(), 1));
};

/**
 * Get the end date of last week.
 * @returns {Date} End date of last week.
 */
export const getLastWeekEnd = (): Date => {
  return endOfWeek(subWeeks(new Date(), 1));
};
