import { ObjectId } from "mongodb";

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
  meta?: any,
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
