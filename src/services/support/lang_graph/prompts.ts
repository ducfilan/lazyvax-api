import { AppName, BotUserName } from "@/common/consts/constants";
import {
  JobStatusFlexible,
  JobStatusFullTime,
  JobStatusOther,
  JobStatusPartTime,
  JobStatusRetired,
  JobStatusUnemployed,
  MaritalStatusDivorced,
  MaritalStatusMarriedNoChildren,
  MaritalStatusMarriedOneChild,
  MaritalStatusMarriedThreeOrMoreChildren,
  MaritalStatusSeparated,
  MaritalStatusSingle,
  MaritalStatusWidowed,
  WorkLifeBalanced,
  WorkLifeLifeFocused,
  WorkLifeWorkFocused,
} from "@/common/consts/shared";
import { getAge } from "@/common/utils/dateUtils";
import { User } from "@/entities/User";

export const systemMessageShort = `Your name is ${BotUserName}, and you're the heart of ${AppName}—a product that helps users make the most of their time, understand themselves, and lead purposeful, fulfilling lives. You support users in balancing productivity with life enjoyment, helping them feel content by the week's end. You're a trusted, empathetic friend: patient, non-judgmental, a good listener, and always ready with a bit of humor. You personalize advice based on each user's unique qualities, routines, goals, and interests, encouraging steady progress at their own pace. Your guidance is inspired by concepts from life organization classics like Atomic Habits, The 7 Habits of Highly Effective People, The How of Happiness, and Deep Work. You’re here to make the journey productive, enjoyable, and as distraction-free as possible—whether it’s achieving work goals or making space for personal joys.`;

export const summarizeConversationConditionPrompt = "with a focus on extracting specific user details, facts, and numbers to understand their unique qualities, routines, goals, and interests. Highlight key points that can guide relevant and personalized responses in future interactions. Avoid generic or overly broad descriptions. The context is a productivity app designed to help users balance productivity with life enjoyment, feel content by the end of the week, and lead fulfilling lives. Emphasize actionable insights, user preferences, and behavior patterns to enable empathetic and tailored guidance."

const WorkLifeBalanceOptions = {
  [WorkLifeWorkFocused]: "Work-focused (high work, low personal time)",
  [WorkLifeBalanced]: "Balanced (equal work and personal time)",
  [WorkLifeLifeFocused]: "Personal-focused (low work, high personal time)",
};

const JobStatusOptions = {
  [JobStatusFullTime]: "Full-time",
  [JobStatusPartTime]: "Part-time",
  [JobStatusFlexible]: "Flexible",
  [JobStatusUnemployed]: "Unemployed",
  [JobStatusRetired]: "Retired",
  [JobStatusOther]: "Other",
};

const MaritalStatusOptions = {
  [MaritalStatusSingle]: "Single",
  [MaritalStatusDivorced]: "Divorced",
  [MaritalStatusWidowed]: "Widowed",
  [MaritalStatusSeparated]: "Separated",
  [MaritalStatusMarriedNoChildren]: "Married (no children)",
  [MaritalStatusMarriedOneChild]: "Married (one child)",
  [MaritalStatusMarriedThreeOrMoreChildren]: "Married (three or more children)",
};

export const userInformationPrompt = (user: User) => {
  const age = user.preferences?.dob
    ? getAge(user.preferences.dob)
    : user.preferences.age;
  const gender = user.preferences?.gender;

  let roleInfo: string;
  if (user.preferences?.userCategory === "professional") {
    const workerType =
      user.preferences.workerType === "both"
        ? "both individual and manager"
        : user.preferences?.workerType;
    const jobStatus = JobStatusOptions[user.preferences?.jobStatus];

    roleInfo = `working ${jobStatus ?? ""} as ${workerType} in the field "${user.preferences.occupation}"`;
    const yearsOfExperience = user.preferences?.yearsOfExperience;
    if (yearsOfExperience) {
      roleInfo += `, having ${yearsOfExperience} years of experience`;
    }
  } else {
    roleInfo = `student studying the ${user.preferences.degree} degree of ${user.preferences.studyCourse} field`;
  }

  const maritalStatus = MaritalStatusOptions[user.preferences?.maritalStatus];
  const futureSelf =
    user.preferences?.futureSelf?.join(", ") ?? "(Not specified)";
  const aspects = user.preferences?.aspects?.join(", ") ?? "(Not specified)";
  const workLifeBalance = user.preferences?.workLifeBalance
    ? WorkLifeBalanceOptions[user.preferences.workLifeBalance]
    : "(Not specified)";

  return `User info: Name: ${user.name}, Age: ${age}, Gender: ${gender}, marital status: ${maritalStatus}, ${roleInfo}, want to be a person: ${futureSelf}, priorities in life: ${aspects}. For work-life balance, prefer: ${workLifeBalance}`;
};

export const dayTasksSuggestionFirstDayTemplate =
  "### Context: ###\nNow is {now}.\n{user_info}\n\nHabits:\n{habit}\n\nTo do tasks this week:\n{weekToDoTask}\n\nWhat's on calendar last week:\n{calendarLastWeekEvents}\n\nWhat's on calendar this week:\n{calendarEvents}\n\n### Instructions: ###\n{instructions}";

export const dayTasksSuggestTemplate =
  "### Context: ###\nNow is {now}.\n{user_info}\n\nHabits:\n{habit}\n\nTo do tasks this week:\n{weekToDoTask}\n\nWhat's on calendar last week:\n{calendarLastWeekEvents}\n\nWhat's on calendar this week:\n{calendarEvents}\n\nDisliked activities:\n{dislikeActivities}\n\n### Instructions: ###\n{instructions}";

export const dayTasksSuggestInstruction = (
  timezone: string,
  targetDay: string = "today"
) =>
  [
    `Suggest activities for the day **${targetDay}** in JSON format, with each \"activity\" short and to-the-point for a to-do list.`,
    "- The number of activities should **reasonably fill the day**, ensuring:",
    "1. No unnecessary gaps between activities unless breaks are required (e.g., after exercise or long work periods).",
    "2. Each activity has sufficient time to be completed comfortably.",
    "3. Break times are included where necessary, especially after high-intensity or mentally demanding tasks.",
    "",
    "Guidelines for suggestions, activities **MUST**:",
    "- Respect habits scheduled for specific days and align with their priority levels.",
    "- Be **varied** and aligned with the user's life priorities (e.g., work, health, family, learning).",
    "- **Avoid** suggesting or repeating **activities already on the calendar on the same day*** at the same or overlapping time range.",
    "- Habits and routines scheduled for specific days must be respected",
    "- Provide multiple options for each time slots where flexibility is reasonable (e.g., reading or brainstorming).",
    "",
    "Timing:",
    "- Ensure suggested times are **reasonable**:",
    "1. Allow recovery time after physically or mentally intensive activities.",
    "2. Avoid overly packed schedules or back-to-back tasks without breaks.",
    "3. Account for typical energy levels at different times of the day.",
    `- Activities must occur **after the current time** in the ${timezone} timezone.`,
    "",
    "Output Format:",
    "- Respond with a valid JSON array of activities, including:",
    "1. **Activity description**: Clear and actionable.",
    `2. **Start and end times**: Date and time in ISO 8601 format, offset to ${timezone}.`,
    "3. **Reason**: Why the activity was suggested, aligned with user context, habits, or goals.",
    "4. **Reminders**: Specify **reasonable reminders** (e.g., 10 and 0 minutes before reading; 10 and 1 minute before important events).",
    `Example format:: [{
  "activity": "...",
  "start_time": ..., // Date and time, offset to ${timezone}
  "end_time": ..., // Date and time, offset to ${timezone}
  "reason": "...",
  "reminder": [] // array of number minutes
  },
  ...
  ]`,
  ].join("\n");
