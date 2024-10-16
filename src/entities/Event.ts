import { CalendarSourceGoogle } from "@/common/consts";
import { calendar_v3 } from "googleapis";
import { ObjectId } from "mongodb";

export type EventMeta = GoogleCalendarMeta | AppleCalendarMeta | MicrosoftCalendarMeta

export type Event = {
  _id?: ObjectId,
  source: string, // GoogleCalendar, AppleCalendar, MicrosoftCalendar, Todoist, App, etc.
  title: string,
  description?: string,
  startDate: Date,
  endDate: Date,
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
};

export type GoogleCalendarMeta = {
  id: string
  etag: string
}

// TODO: Not defined yet.
export type AppleCalendarMeta = {
  eventId: string
};

// TODO: Not defined yet.
export type MicrosoftCalendarMeta = {
  eventId: string
};

export type Reminder = {
  type: string, // email, push, notification
  time: number, // time in milliseconds before event
};

export type Attendee = {
  email: string,
  name?: string,
  response?: AttendeeResponse,
};

export type AttendeeResponse = "accepted" | "declined" | "tentative";

export const mapGoogleEventToAppEvent = (event: calendar_v3.Schema$Event) => ({
  source: CalendarSourceGoogle,
  title: event.summary,
  description: event.description,
  startDate: new Date(event.start.dateTime),
  endDate: new Date(event.end.dateTime),
  allDayEvent: event.start.dateTime.split('T')[0] === event.end.dateTime.split('T')[0],
  location: event.location,
  reminders: event.reminders?.overrides?.map(reminder => ({
    type: reminder.method,
    time: reminder.minutes * 60000
  })),
  attendees: event.attendees?.map(attendee => ({
    email: attendee.email,
    name: attendee.displayName
  })),
  categories: [], // TODO: Extract categories from event details
  taskIds: [], // TODO: Fetch related tasks
  objectiveIds: [], // TODO: Fetch related objectives
  meta: {
    etag: event.etag
  }
} as Event)