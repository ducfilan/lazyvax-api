import { query } from 'express-validator';

export const validateApiGetDaySuggestions = [
  query('date').isISO8601().withMessage('Date must be a valid ISO 8601 date.')
    .customSanitizer(date => new Date(date)),
];
