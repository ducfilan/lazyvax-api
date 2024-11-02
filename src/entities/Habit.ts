import { ObjectId } from 'mongodb';

export type Habit = {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  priority: string; // e.g., 'low', 'medium', 'high'
  repeat: {
    unit: string; // e.g., 'daily', 'weekly'
    frequency: number;
    daysOfWeek?: number[]; // e.g., [1, 3, 5] for Mon, Wed, Fri
  };
  detail?: string;
  category?: string; // e.g., 'health', 'productivity'
  color?: string; // Hex code for color representation
  emoji?: string; // Optional emoji associated with the habit
  idealDuration?: number; // Duration in minutes
  createdAt: Date;
  updatedAt: Date;
  completedDates?: Date[]; // Dates when the habit was marked as completed
};
