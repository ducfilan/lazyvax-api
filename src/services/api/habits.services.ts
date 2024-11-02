import { ObjectId } from 'mongodb';
import HabitsDao from '@dao/habits.dao';
import { Habit } from '@/entities/Habit';

export async function getHabits(filter: {
  userId: ObjectId,
  category?: string,
  priority?: string,
  keyword?: string
}) {
  return await HabitsDao.getHabits(filter);
}

export async function createHabit(habitData: {
  userId: ObjectId,
  title: string,
  priority: string,
  repeat: {
    unit: string,
    frequency: number,
    daysOfWeek?: number[]
  },
  detail?: string,
  category?: string,
  color?: string,
  emoji?: string,
  idealDuration?: number
}) {
  const habit: Habit = {
    ...habitData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return await HabitsDao.createHabit(habit);
}

export async function updateHabit(habitId: ObjectId, updateData: Partial<Habit>) {
  return await HabitsDao.updateHabit(habitId, updateData);
}

export async function deleteHabit(habitId: ObjectId) {
  return await HabitsDao.deleteHabit(habitId);
}

export async function getHabitById(habitId: ObjectId) {
  return await HabitsDao.getHabitById(habitId);
}

export default {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitById,
};
