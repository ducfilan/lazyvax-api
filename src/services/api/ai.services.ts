import { User } from "@/entities/User";
import { ObjectId } from "mongodb";
import { getConversationById } from "./conversations.services";
import { ChatAiService, CompletionAiService } from "../support/ai_querier";
import logger from "@/common/logger";
import { getEvents } from "./events.services";
import { getLastWeekEnd, getLastWeekStart } from "@/common/utils/dateUtils";
import { eventsToWeeklySchedule } from "@/entities/Event";

export async function queryActionCompletion(user: User, conversationId: ObjectId, milestoneId: ObjectId) {
  const prompt = await buildPrompt(conversationId, milestoneId)
  if (!prompt) {
    logger.info(`cannot generate prompt from conversationId: ${conversationId}, milestoneId: ${milestoneId}`)
    return ""
  }

  return CompletionAiService.query<string>(user, prompt)
}

export async function queryGenerateWeekPlan(user: User, conversationId: ObjectId) {
  const conversation = await getConversationById(conversationId)
  if (!conversation) {
    logger.info("not match conversation", conversationId)
    return null
  }

  const lastWeekEvents = await getEvents({ userId: user._id, from: getLastWeekStart(), to: getLastWeekEnd() })

  const prompt = `${eventsToWeeklySchedule(lastWeekEvents)}`

  const response = `
  [
    {
      "date": "Monday",
      "activity": "Breakfast",
      "start_time": "2024-10-14T07:30:00+08:00",
      "end_time": "2024-10-14T08:00:00+08:00",
      "reason": "Start the day with a good meal."
    },
    {
      "date": "Monday",
      "activity": "Commute to work",
      "start_time": "2024-10-14T08:00:00+08:00",
      "end_time": "2024-10-14T09:00:00+08:00",
      "reason": "Get to work on time and settle in."
    },
    {
      "date": "Monday",
      "activity": "9-5 job",
      "start_time": "2024-10-14T09:00:00+08:00",
      "end_time": "2024-10-14T17:00:00+08:00",
      "reason": "Focus on work tasks."
    },
    {
      "date": "Monday",
      "activity": "Lunch break",
      "start_time": "2024-10-14T12:00:00+08:00",
      "end_time": "2024-10-14T13:00:00+08:00",
      "reason": "Take a break and recharge."
    },
    {
      "date": "Monday",
      "activity": "Evening commute",
      "start_time": "2024-10-14T17:00:00+08:00",
      "end_time": "2024-10-14T18:00:00+08:00",
      "reason": "Head back home."
    },
    {
      "date": "Monday",
      "activity": "Family dinner",
      "start_time": "2024-10-14T18:30:00+08:00",
      "end_time": "2024-10-14T19:30:00+08:00",
      "reason": "Spend quality time with family."
    },
    {
      "date": "Monday",
      "activity": "Child playtime",
      "start_time": "2024-10-14T19:30:00+08:00",
      "end_time": "2024-10-14T20:00:00+08:00",
      "reason": "Enjoy time with your son."
    },
    {
      "date": "Monday",
      "activity": "Finish Self-Assessment form (progress: 10%)",
      "start_time": "2024-10-14T20:15:00+08:00",
      "end_time": "2024-10-14T21:15:00+08:00",
      "reason": "High priority task for work."
    },
    {
      "date": "Monday",
      "activity": "Quick workout",
      "start_time": "2024-10-14T21:30:00+08:00",
      "end_time": "2024-10-14T22:00:00+08:00",
      "reason": "Stay fit and active."
    },
    {
      "date": "Monday",
      "activity": "Shower",
      "start_time": "2024-10-14T22:00:00+08:00",
      "end_time": "2024-10-14T22:15:00+08:00",
      "reason": "Refresh and relax."
    },
    {
      "date": "Monday",
      "activity": "Couple time",
      "start_time": "2024-10-14T22:15:00+08:00",
      "end_time": "2024-10-14T22:45:00+08:00",
      "reason": "Connect with your partner."
    },
    {
      "date": "Monday",
      "activity": "Reading",
      "start_time": "2024-10-14T22:45:00+08:00",
      "end_time": "2024-10-14T23:15:00+08:00",
      "reason": "Relax before bedtime."
    },
    {
      "date": "Monday",
      "activity": "Sleep",
      "start_time": "2024-10-14T23:15:00+08:00",
      "end_time": "2024-10-15T07:00:00+08:00",
      "reason": "Rest and recharge for the next day."
    },
    {
      "date": "Tuesday",
      "activity": "Breakfast",
      "start_time": "2024-10-15T07:30:00+08:00",
      "end_time": "2024-10-15T08:00:00+08:00",
      "reason": "Start the day with a good meal."
    },
    {
      "date": "Tuesday",
      "activity": "Commute to work",
      "start_time": "2024-10-15T08:00:00+08:00",
      "end_time": "2024-10-15T09:00:00+08:00",
      "reason": "Get to work on time and settle in."
    },
    {
      "date": "Tuesday",
      "activity": "9-5 job",
      "start_time": "2024-10-15T09:00:00+08:00",
      "end_time": "2024-10-15T17:00:00+08:00",
      "reason": "Focus on work tasks."
    },
    {
      "date": "Tuesday",
      "activity": "Lunch break",
      "start_time": "2024-10-15T12:00:00+08:00",
      "end_time": "2024-10-15T13:00:00+08:00",
      "reason": "Take a break and recharge."
    },
    {
      "date": "Tuesday",
      "activity": "Evening commute",
      "start_time": "2024-10-15T17:00:00+08:00",
      "end_time": "2024-10-15T18:00:00+08:00",
      "reason": "Head back home."
    },
    {
      "date": "Tuesday",
      "activity": "Family dinner",
      "start_time": "2024-10-15T18:30:00+08:00",
      "end_time": "2024-10-15T19:30:00+08:00",
      "reason": "Spend quality time with family."
    },
    {
      "date": "Tuesday",
      "activity": "Child playtime",
      "start_time": "2024-10-15T19:30:00+08:00",
      "end_time": "2024-10-15T20:00:00+08:00",
      "reason": "Enjoy time with your son."
    },
    {
      "date": "Tuesday",
      "activity": "Work on air ticket & hotel booking",
      "start_time": "2024-10-15T20:15:00+08:00",
      "end_time": "2024-10-15T21:00:00+08:00",
      "reason": "Start planning for the Taiwan trip."
    },
    {
      "date": "Tuesday",
      "activity": "Podcast listening",
      "start_time": "2024-10-15T21:00:00+08:00",
      "end_time": "2024-10-15T21:30:00+08:00",
      "reason": "Wind down with some learning."
    },
    {
      "date": "Tuesday",
      "activity": "Language learning",
      "start_time": "2024-10-15T21:30:00+08:00",
      "end_time": "2024-10-15T22:00:00+08:00",
      "reason": "Practice Mandarin for your Taiwan trip."
    },
    {
      "date": "Tuesday",
      "activity": "Shower",
      "start_time": "2024-10-15T22:00:00+08:00",
      "end_time": "2024-10-15T22:15:00+08:00",
      "reason": "Refresh and prepare for bedtime."
    },
    {
      "date": "Tuesday",
      "activity": "Couple time",
      "start_time": "2024-10-15T22:15:00+08:00",
      "end_time": "2024-10-15T22:45:00+08:00",
      "reason": "Connect with your partner."
    },
    {
      "date": "Tuesday",
      "activity": "Reading",
      "start_time": "2024-10-15T22:45:00+08:00",
      "end_time": "2024-10-15T23:15:00+08:00",
      "reason": "Wind down with a good book."
    },
    {
      "date": "Tuesday",
      "activity": "Sleep",
      "start_time": "2024-10-15T23:15:00+08:00",
      "end_time": "2024-10-16T07:00:00+08:00",
      "reason": "Rest and recharge for the next day."
    },
    {
      "date": "Wednesday",
      "activity": "Breakfast",
      "start_time": "2024-10-16T07:30:00+08:00",
      "end_time": "2024-10-16T08:00:00+08:00",
      "reason": "Kickstart the day."
    },
    {
      "date": "Wednesday",
      "activity": "Commute",
      "start_time": "2024-10-16T08:30:00+08:00",
      "end_time": "2024-10-16T09:00:00+08:00",
      "reason": "Office time."
    },
    {
      "date": "Wednesday",
      "activity": "9-5 job",
      "start_time": "2024-10-16T09:00:00+08:00",
      "end_time": "2024-10-16T17:00:00+08:00",
      "reason": "Workday."
    },
    {
      "date": "Wednesday",
      "activity": "Lunch break",
      "start_time": "2024-10-16T12:30:00+08:00",
      "end_time": "2024-10-16T13:30:00+08:00",
      "reason": "Rest and eat."
    },
    {
      "date": "Wednesday",
      "activity": "Evening commute",
      "start_time": "2024-10-16T17:00:00+08:00",
      "end_time": "2024-10-16T17:30:00+08:00",
      "reason": "Back home."
    },
    {
      "date": "Wednesday",
      "activity": "Guitar practice",
      "start_time": "2024-10-16T18:00:00+08:00",
      "end_time": "2024-10-16T19:00:00+08:00",
      "reason": "Practice session."
    },
    {
      "date": "Wednesday",
      "activity": "Family dinner",
      "start_time": "2024-10-16T19:15:00+08:00",
      "end_time": "2024-10-16T20:00:00+08:00",
      "reason": "Dinner with the family."
    },
    {
      "date": "Wednesday",
      "activity": "Finish self-assessment form",
      "start_time": "2024-10-16T20:30:00+08:00",
      "end_time": "2024-10-16T21:30:00+08:00",
      "reason": "Progress on the work task."
    },
    {
      "date": "Wednesday",
      "activity": "Reading",
      "start_time": "2024-10-16T22:00:00+08:00",
      "end_time": "2024-10-16T22:30:00+08:00",
      "reason": "Relax before bed."
    },
    {
      "date": "Thursday",
      "activity": "Breakfast",
      "start_time": "2024-10-17T07:30:00+08:00",
      "end_time": "2024-10-17T08:00:00+08:00",
      "reason": "Morning routine."
    },
    {
      "date": "Thursday",
      "activity": "Commute",
      "start_time": "2024-10-17T08:30:00+08:00",
      "end_time": "2024-10-17T09:00:00+08:00",
      "reason": "Head to work."
    },
    {
      "date": "Thursday",
      "activity": "9-5 job",
      "start_time": "2024-10-17T09:00:00+08:00",
      "end_time": "2024-10-17T17:00:00+08:00",
      "reason": "Work on projects."
    },
    {
      "date": "Thursday",
      "activity": "Lunch break",
      "start_time": "2024-10-17T12:30:00+08:00",
      "end_time": "2024-10-17T13:30:00+08:00",
      "reason": "Time to recharge."
    },
    {
      "date": "Thursday",
      "activity": "Evening commute",
      "start_time": "2024-10-17T17:00:00+08:00",
      "end_time": "2024-10-17T17:30:00+08:00",
      "reason": "Return home."
    },
    {
      "date": "Thursday",
      "activity": "Child playtime",
      "start_time": "2024-10-17T18:00:00+08:00",
      "end_time": "2024-10-17T18:45:00+08:00",
      "reason": "Fun time with my son."
    },
    {
      "date": "Thursday",
      "activity": "Family dinner",
      "start_time": "2024-10-17T19:00:00+08:00",
      "end_time": "2024-10-17T19:45:00+08:00",
      "reason": "Dinner together."
    },
    {
      "date": "Thursday",
      "activity": "Language learning",
      "start_time": "2024-10-17T20:00:00+08:00",
      "end_time": "2024-10-17T21:00:00+08:00",
      "reason": "Improve my skills."
    },
    {
      "date": "Thursday",
      "activity": "Finish self-assessment form",
      "start_time": "2024-10-17T21:15:00+08:00",
      "end_time": "2024-10-17T22:15:00+08:00",
      "reason": "Make progress on the important task."
    },
    {
      "date": "Friday",
      "activity": "Breakfast",
      "start_time": "2024-10-18T07:30:00+08:00",
      "end_time": "2024-10-18T08:00:00+08:00",
      "reason": "Start the day right."
    },
    {
      "date": "Friday",
      "activity": "Commute",
      "start_time": "2024-10-18T08:30:00+08:00",
      "end_time": "2024-10-18T09:00:00+08:00",
      "reason": "Head to the office."
    },
    {
      "date": "Friday",
      "activity": "9-5 job",
      "start_time": "2024-10-18T09:00:00+08:00",
      "end_time": "2024-10-18T17:00:00+08:00",
      "reason": "Finish the workweek strong."
    },
    {
      "date": "Friday",
      "activity": "Lunch break",
      "start_time": "2024-10-18T12:30:00+08:00",
      "end_time": "2024-10-18T13:30:00+08:00",
      "reason": "Midday meal."
    },
    {
      "date": "Friday",
      "activity": "Evening commute",
      "start_time": "2024-10-18T17:00:00+08:00",
      "end_time": "2024-10-18T17:30:00+08:00",
      "reason": "Time to go home."
    },
    {
      "date": "Friday",
      "activity": "Local food tour",
      "start_time": "2024-10-18T18:00:00+08:00",
      "end_time": "2024-10-18T19:30:00+08:00",
      "reason": "Explore new flavors with the family."
    },
    {
      "date": "Friday",
      "activity": "Couple time",
      "start_time": "2024-10-18T21:00:00+08:00",
      "end_time": "2024-10-18T22:00:00+08:00",
      "reason": "Relax and unwind with my wife."
    },
    {
      "date": "Saturday",
      "activity": "Family picnic",
      "start_time": "2024-10-19T09:00:00+08:00",
      "end_time": "2024-10-19T12:00:00+08:00",
      "reason": "Weekend family time outdoors."
    },
    {
      "date": "Saturday",
      "activity": "Lunch at home",
      "start_time": "2024-10-19T12:30:00+08:00",
      "end_time": "2024-10-19T13:30:00+08:00",
      "reason": "A cozy family meal."
    },
    {
      "date": "Saturday",
      "activity": "Swimming",
      "start_time": "2024-10-19T15:00:00+08:00",
      "end_time": "2024-10-19T16:00:00+08:00",
      "reason": "Enjoy a swim to stay active."
    },
    {
      "date": "Saturday",
      "activity": "Family dinner",
      "start_time": "2024-10-19T19:00:00+08:00",
      "end_time": "2024-10-19T20:00:00+08:00",
      "reason": "Dinner together."
    },
    {
      "date": "Saturday",
      "activity": "Movie night",
      "start_time": "2024-10-19T21:00:00+08:00",
      "end_time": "2024-10-19T23:00:00+08:00",
      "reason": "Relax and enjoy a film."
    },
    {
      "date": "Sunday",
      "activity": "Finish self-assessment form",
      "start_time": "2024-10-20T09:00:00+08:00",
      "end_time": "2024-10-20T11:00:00+08:00",
      "reason": "Final push to complete before the deadline."
    },
    {
      "date": "Sunday",
      "activity": "Power nap",
      "start_time": "2024-10-20T13:00:00+08:00",
      "end_time": "2024-10-20T13:30:00+08:00",
      "reason": "Recharge for the rest of the day."
    },
    {
      "date": "Sunday",
      "activity": "Guitar practice",
      "start_time": "2024-10-20T15:00:00+08:00",
      "end_time": "2024-10-20T16:00:00+08:00",
      "reason": "Creative time with music."
    },
    {
      "date": "Sunday",
      "activity": "Family dinner",
      "start_time": "2024-10-20T19:00:00+08:00",
      "end_time": "2024-10-20T20:00:00+08:00",
      "reason": "End the week with family."
    },
    {
      "date": "Sunday",
      "activity": "Reading",
      "start_time": "2024-10-20T21:00:00+08:00",
      "end_time": "2024-10-20T22:00:00+08:00",
      "reason": "Wrap up the week with a good book."
    }
    ]`

  return ChatAiService.query<string>(user, prompt)
}

async function buildPrompt(conversationId: ObjectId, milestoneId: ObjectId): Promise<string> {
  const conversation = await getConversationById(conversationId)
  if (!conversation) {
    logger.info("not match conversation", conversationId)
    return null
  }

  return `
  The following is 1 of many milestones I have, with a list of current actions to support that milestone. Suggest me only 1 more action that is actionable, specific, executable, achievable.
  Milestone: 
  Actions:
  Answer concisely in 1 sentence, don't say anything else, don't mention action number.`
}

export async function getFutureSelfSuggestions(user: User) {
  const prompt = `
    What are the possible adjectives in many diverse aspects of life (example aspects are "Relationships", "Health", "Financial", "Personal Growth"), provide total 6 aspects personalized for me that can describe the best version of me to be happy, fulfilled, more good habits and avoid bad habits to pursuit? Add an icon before each adj, sample: "adj": "🏃 Active". Adjectives in each aspect should be related to the person and diverse.
    Answer in json structure, nothing else:
    [
      {
        "aspect": "",
        "suggestions": [
          {
            "adj": "",
            "explain": ""
          }
        ]
      }
    ]`

  return CompletionAiService.query<string>(user, prompt)
}
