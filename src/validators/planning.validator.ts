import { query } from 'express-validator';
import { ObjectId } from 'mongodb';

export const validateApiGetDaySuggestions = [
  query('date').isISO8601().withMessage('Date must be a valid ISO 8601 date.')
    .customSanitizer(date => new Date(date)),
  query('conversationId').isMongoId().withMessage('Conversation ID must be a valid MongoDB ObjectId.')
    .customSanitizer((id: string) => new ObjectId(id)),
];
