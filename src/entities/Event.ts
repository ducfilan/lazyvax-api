import { AppDomain, AppName, CalendarSourceGoogle } from "@/common/consts/constants";
import { EventStatuses, EventStatusUndone } from "@/common/consts/shared";
import { EventStatusDefault, EventStatusDone } from "@/common/consts/shared";
import { calendar_v3 } from "googleapis";
import { ObjectId } from "mongodb";

export type EventMeta = GoogleCalendarMeta | AppleCalendarMeta | MicrosoftCalendarMeta

export const EventReminders = ['email', 'popup'] as const
export const EventStatusToTextEn = {
  [EventStatusDefault]: '',
  [EventStatusDone]: 'Done',
  [EventStatusUndone]: 'Not done',
}

export type Event = {
  _id?: ObjectId,
  userId: ObjectId, // Reference to the user who created the event
  source: string, // GoogleCalendar, AppleCalendar, MicrosoftCalendar, Todoist, App, etc.
  title: string,
  description?: string,
  startDate: Date,
  endDate: Date,
  status?: typeof EventStatuses[number],
  allDayEvent?: boolean,
  location?: string,
  reminders?: Reminder[],
  attendees?: Attendee[],
  categories?: string[], // Array of category names
  taskIds?: ObjectId[], // References to related tasks
  objectiveIds?: ObjectId[], // References to related objectives
  color?: string, // Hex code for event color
  calendarId?: ObjectId, // Reference to the associated calendar
  isPrivate?: boolean,
  isDeleted?: boolean,
  createdAt?: Date,
  updatedAt?: Date,
  meta?: EventMeta,
}

export type GoogleCalendarMeta = {
  id?: string
  etag?: string
}

// TODO: Not defined yet.
export type AppleCalendarMeta = {
  id: string
}

// TODO: Not defined yet.
export type MicrosoftCalendarMeta = {
  id: string
}

export type Reminder = {
  type: typeof EventReminders[number],
  minutes: number, // time in minutes before event
}

export type Attendee = {
  email: string,
  name?: string,
  response?: AttendeeResponse,
}

export type AttendeeResponse = "accepted" | "declined" | "tentative"

export const mapGoogleEventToAppEvent = (userId: ObjectId, event: calendar_v3.Schema$Event) => {
  const output = {
    userId,
    source: CalendarSourceGoogle,
    title: event.summary,
    description: event.description,
    startDate: new Date(event.start.dateTime || event.start.date), // TODO: Timezone.
    endDate: new Date(event.end.dateTime || event.end.date), // TODO: Timezone.
    allDayEvent: !!event.start.date,
    location: event.location,
    reminders: event.reminders?.overrides?.map(reminder => ({
      type: reminder.method,
      minutes: reminder.minutes
    })) || [],
    attendees: event.attendees?.map(({ email, displayName: name }) => name ? ({ email, name }) : ({ email })) || [],
    categories: [], // TODO: Extract categories from event details
    taskIds: [], // TODO: Fetch related tasks
    objectiveIds: [], // TODO: Fetch related objectives
    meta: {
      id: event.id,
      etag: event.etag,
    }
  } as Event

  if (!event.description) delete output.description
  if (!event.location) delete output.location
  if (!event.reminders?.overrides?.length) delete output.reminders

  return output
}

export const mapAppEventToGoogleEvent = (event: Event, timezone: string): calendar_v3.Schema$Event => ({
  summary: event.title,
  description: event.description,
  start: {
    dateTime: event.startDate.toISOString(),
    timeZone: timezone
  },
  end: {
    dateTime: event.endDate.toISOString(),
    timeZone: timezone
  },
  attendees: event.attendees?.map(attendee => ({ email: attendee.email, responseStatus: 'accepted' })),
  reminders: {
    useDefault: false,
    overrides: event.reminders?.map(reminder => ({
      method: reminder.type,
      minutes: reminder.minutes
    })) || []
  },
  source: {
    title: `${AppName}'s task`,
    url: AppDomain
  },
  extendedProperties: {
    private: {
      appEventId: event._id.toString(),
    },
  },
})

export function eventsToWeeklySchedule(events: Event[]): string {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const eventsByDay: { [key: string]: Event[] } = {};

  daysOfWeek.forEach(day => eventsByDay[day] = []);

  events.forEach(event => {
    const dayOfWeek = daysOfWeek[event.startDate.getDay() - 1];
    eventsByDay[dayOfWeek].push(event);
  });

  let output = '';

  daysOfWeek.forEach(day => {
    output += `${day}:\n`;

    if (eventsByDay[day].length === 0) {
      output += '- No data available.\n';
    } else {
      eventsByDay[day].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      eventsByDay[day].forEach(event => {
        const startTime = formatTime(event.startDate);
        const endTime = formatTime(event.endDate);
        output += `- From ${startTime} to ${endTime}: ${event.title}\n`;
      });
    }

    output += '\n';
  });

  return output.trim();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}