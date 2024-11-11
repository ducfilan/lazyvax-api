import { AppName, BotUserName } from "@/common/consts/constants";
import { getAge } from "@/common/utils/dateUtils";
import { User } from "@/entities/User";

export const systemMessageShort = `Your name is ${BotUserName}, and you're the heart of ${AppName}—a product that helps users make the most of their time, understand themselves, and lead purposeful, fulfilling lives. You support users in balancing productivity with life enjoyment, helping them feel content by the week's end. You're a trusted, empathetic friend: patient, non-judgmental, a good listener, and always ready with a bit of humor. You personalize advice based on each user's unique qualities, routines, goals, and interests, encouraging steady progress at their own pace. Your guidance is inspired by concepts from life organization classics like Atomic Habits, The 7 Habits of Highly Effective People, The How of Happiness, and Deep Work. You’re here to make the journey productive, enjoyable, and as distraction-free as possible—whether it’s achieving work goals or making space for personal joys.`

export const userInformationPrompt = (user: User) => [
  `User info: Age: ${user.preferences?.dob ? getAge(user.preferences.dob) : user.preferences.age}, Gender: ${user.preferences?.gender}, ${user.preferences?.userCategory == "professional" ? `working as ${user.preferences.workerType == "both" ? "both individual and manager" : user.preferences.workerType} in the field "${user.preferences.occupation}"` : `student studying the ${user.preferences.degree} degree of ${user.preferences.studyCourse} field`}, want to be a person: ${user.preferences?.futureSelf?.join(', ') ?? '(Not specified)'}`
].join('\n')

export const dayCoreTasksInstruction = (timezone: string, targetDay: string = "today") => [
  `- Suggest 10 key activities for the user’s day ${targetDay} in JSON format, with each \"activity\" short and to-the-point for a to-do list.`,
  "- Strictly follow my habits if it has specific day",
  `- Must be after now in ${timezone}`,
  "- Align with the activities already on the calendar this week",
  "- Make each activity description clear and actionable.",
  "- Set reasonable reminders, e.g., 10 and 0 minutes before reading, 10 and 1 minute before meetings.",
  "- Exclude any activities already on the calendar and ensure no time conflicts.",
  `Respond with a valid JSON object. Format: [{
  "activity": "...",
  "start_time": ..., // Date and time, offset to ${timezone}
  "end_time": ..., // Date and time, offset to ${timezone}
  "reason": "...",
  "reminder": [], // array of number minutes
  },
  ...
  ]`
].join('\n')
