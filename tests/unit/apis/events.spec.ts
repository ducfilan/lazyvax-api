import { describe, expect, it } from '@jest/globals';
import { ObjectId } from 'mongodb';
import { Event, eventsToWeeklySchedule } from "../../../src/entities/Event";

describe('eventsToWeeklySchedule', () => {
  // Helper function to create a basic event
  const createEvent = (title: string, startDate: Date, endDate: Date): Event => ({
    userId: new ObjectId(),
    source: 'App',
    title,
    startDate,
    endDate,
  });

  it('should return correct format for a week with events', () => {
    const events: Event[] = [
      createEvent('Monday Event', new Date('2024-10-14T10:00:00'), new Date('2024-10-14T11:00:00')),
      createEvent('Wednesday Event', new Date('2024-10-16T14:00:00'), new Date('2024-10-16T15:30:00')),
      createEvent('Friday Event', new Date('2024-10-18T09:00:00'), new Date('2024-10-18T10:00:00')),
    ];

    const result = eventsToWeeklySchedule(events);

    expect(result).toBe(
      'Monday:\n' +
      '- From 10:00 to 11:00: Monday Event\n\n' +
      'Tuesday:\n' +
      '- No data available.\n\n' +
      'Wednesday:\n' +
      '- From 14:00 to 15:30: Wednesday Event\n\n' +
      'Thursday:\n' +
      '- No data available.\n\n' +
      'Friday:\n' +
      '- From 09:00 to 10:00: Friday Event\n\n' +
      'Saturday:\n' +
      '- No data available.\n\n' +
      'Sunday:\n' +
      '- No data available.'
    );
  });

  it('should handle multiple events on the same day', () => {
    const events: Event[] = [
      createEvent('Morning Event', new Date('2024-10-21T09:00:00'), new Date('2024-10-21T10:00:00')),
      createEvent('Afternoon Event', new Date('2024-10-21T14:00:00'), new Date('2024-10-21T15:00:00')),
    ];

    const result = eventsToWeeklySchedule(events);

    expect(result).toContain(
      'Monday:\n' +
      '- From 09:00 to 10:00: Morning Event\n' +
      '- From 14:00 to 15:00: Afternoon Event\n'
    );
  });

  it('should handle a week with no events', () => {
    const events: Event[] = [];

    const result = eventsToWeeklySchedule(events);

    expect(result).toBe(
      'Monday:\n' +
      '- No data available.\n\n' +
      'Tuesday:\n' +
      '- No data available.\n\n' +
      'Wednesday:\n' +
      '- No data available.\n\n' +
      'Thursday:\n' +
      '- No data available.\n\n' +
      'Friday:\n' +
      '- No data available.\n\n' +
      'Saturday:\n' +
      '- No data available.\n\n' +
      'Sunday:\n' +
      '- No data available.'
    );
  });

  it('should sort events by start time', () => {
    const events: Event[] = [
      createEvent('Later Event', new Date('2024-10-21T14:00:00'), new Date('2024-10-21T15:00:00')),
      createEvent('Earlier Event', new Date('2024-10-21T09:00:00'), new Date('2024-10-21T10:00:00')),
    ];

    const result = eventsToWeeklySchedule(events);

    expect(result).toContain(
      'Monday:\n' +
      '- From 09:00 to 10:00: Earlier Event\n' +
      '- From 14:00 to 15:00: Later Event\n'
    );
  });
});