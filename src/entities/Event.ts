import { AppDomain, AppName, CalendarSourceGoogle } from "@/common/consts";
import { calendar_v3 } from "googleapis";
import { ObjectId } from "mongodb";

export type EventMeta = GoogleCalendarMeta | AppleCalendarMeta | MicrosoftCalendarMeta

export type Event = {
  _id?: ObjectId,
  userId: ObjectId, // Reference to the user who created the event
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
  id?: string
  etag?: string
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
      time: reminder.minutes * 60000
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

export const mapAppEventToGoogleEvent = (event: Event): calendar_v3.Schema$Event => ({
  summary: event.title,
  description: event.description,
  start: {
    dateTime: event.startDate.toISOString(),
    timeZone: 'Asia/Singapore' // TODO: Set user's city timezone dynamically.
  },
  end: {
    dateTime: event.endDate.toISOString(),
    timeZone: 'Asia/Singapore'
  },
  attendees: event.attendees?.map(attendee => ({ email: attendee.email, responseStatus: 'accepted' })),
  reminders: {
    useDefault: false,
    overrides: event.reminders?.map(reminder => ({
      method: reminder.type,
      minutes: reminder.time / 60000
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