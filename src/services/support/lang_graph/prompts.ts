import { AppName, LavaUserName } from "@/common/consts/constants";
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

export const systemMessageShort = `Your name is ${LavaUserName}, and you're the heart of ${AppName}—a product that helps users make the most of their time, understand themselves, and lead purposeful, fulfilling lives. You support users in balancing productivity with life enjoyment, helping them feel content by the week's end. You're a trusted, empathetic friend: patient, non-judgmental, a good listener, and always ready with a bit of humor. You personalize advice based on each user's unique qualities, routines, goals, and interests, encouraging steady progress at their own pace. Your guidance is inspired by concepts from life organization classics like Atomic Habits, The 7 Habits of Highly Effective People, The How of Happiness, and Deep Work. You’re here to make the journey productive, enjoyable, and as distraction-free as possible—whether it’s achieving work goals or making space for personal joys.`;

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

  const preferredFocusSessionLength = user.preferences?.preferredFocusSessionLengthMinutes
    ? `${user.preferences.preferredFocusSessionLengthMinutes} minutes`
    : "(Not specified)";

  const otherPreferences = user.preferences?.otherPreferences;

  return `User info: Name: ${user.name}, Age: ${age}, Gender: ${gender}, marital status: ${maritalStatus}, ${roleInfo}, want to be a person: ${futureSelf}, priorities in life: ${aspects}. For work-life balance, prefer: ${workLifeBalance}. Preferred focus session length: ${preferredFocusSessionLength} minutes.${otherPreferences ? `\n\nOther preferences: ${otherPreferences}` : ""}`;
};

export const dayTasksSuggestionFirstDayTemplate =
  "### Context: ###\nNow is {now}.\n{user_info}\n\nHabits:\n{habit}\n\nTo do tasks this week:\n{weekToDoTask}\n\nWhat's on calendar last week:\n{calendarLastWeekEvents}\n\nWhat's on calendar this week, includes today:\n{calendarEvents}\n\n### Instructions: ###\n{instructions}";

export const dayTasksSuggestTemplate =
  "### Context: ###\nNow is {now}.\n{user_info}\n\nHabits:\n{habit}\n\nShort term goals:\n{shortTermGoals}\n\nLong term goals:\n{longTermGoals}\n\nTo do tasks this week:\n{weekToDoTask}\n\nWhat's on calendar last week:\n{calendarLastWeekEvents}\n\nWhat's on calendar this week, includes today:\n{calendarEvents}\n\nDisliked activities:\n{dislikeActivities}\n\n### Instructions: ###\n{instructions}";

export const dayActivitiesArrangeTemplate =
  "### Context: ###\nNow is {now}.\n{user_info}\n\nHabits:\n{habit}\n\nActivities already planned for today:\n{targetDayActivities}\n\nActivities to arrange to fit into today:\n{activitiesToArrange}\n\n### Instructions: ###\n{instructions}";

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
    "- Strictly avoid duplicates by following these rules:",
    "1. Do NOT suggest any activity that appears in \"What's on calendar this week\" for the current day",
    "2. Do NOT suggest activities at times that overlap with existing calendar events",
    "3. Consider activities as duplicates if they:",
    "   - Have the same or similar descriptions (e.g., \"Exercise\" vs \"Exercise - Stay Active\")",
    "   - Serve the same purpose (e.g., \"Family Time\" vs \"Family Quality Time\")",
    "   - Occur in the same time slot",
    "- Provide multiple options for each time slots where flexibility is reasonable (e.g., reading or brainstorming), but only if those slots don't conflict with existing calendar events.",
    "",
    "Timing:",
    "- Ensure suggested times are reasonable and:",
    "1. Do not overlap with any existing calendar events for the day",
    "2. Allow recovery time after physically or mentally intensive activities",
    "3. Avoid overly packed schedules or back-to-back tasks without breaks",
    "4. Account for typical energy levels at different times of the day",
    "5. Fill gaps between existing calendar events with appropriate activities",
    `- Activities must occur **after the current time** in the ${timezone} timezone`,
    "",
    "Validation Rules:",
    "- Before suggesting each activity:",
    "1. Check if a similar activity exists in the calendar for the current day",
    "2. Verify the proposed time slot doesn't overlap with any existing calendar events",
    "3. Ensure the activity aligns with available time gaps in the schedule",
    "4. Skip suggestion if any validation fails",
    "",
    "Output Format:",
    "- Respond with a valid JSON array of activities, nothing else, including:",
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

export const dayActivitiesSuggestionInstruction = (timezone: string, targetDay: string = "today") => [
  `Suggest a list of 20 activities for the day **${targetDay}** in JSON format, with each "activity" short and to-the-point for a to-do list, order by the most important activities first. Target of this is provide a list of activities to user to choose from, should be diverse enough to cover all important activities for the day. Focus more on the important activities.`,
  "",
  "Guidelines for suggestions, activities **MUST**:",
  "- Align with user's properties like occupation, habits, life priorities, etc.",
  "- Respect habits scheduled for specific days and align with their priority levels.",
  "- Be varied and aligned with the user's life priorities (e.g., work, health, family, learning).",
  "- Avoid suggesting or repeating activities already on the calendar on the same day.",
  "- Habits and routines scheduled for specific days must be respected.",
  "- **Don't** suggest planning for some days or reflection for the day as activity.",
  "",
  "Output Format:",
  "Respond with a valid JSON array of activities, nothing else, including:",
  "1. **Activity**: Clear and actionable.",
  "2. **Description**: More detailed explanation of the activity.",
  `Example format: [{
    "activity": "...",
    "description": "...",
    },
    ...
  ]`,
].join("\n");

export const askMoreInfoInstruction = (targetDay: string = "today") => [
  `From those information, do you need more info to plan user's day **${targetDay}** properly? true/false`,
  "If true, ask multiple choice questions that you need to know.",
  "",
  "Guidelines for questions:",
  "- **Don't** ask questions about tasks outside of provided calendar",
  "",
  "Output template in json format:",
  `{
  "needMoreInfo": [true or false],
  "questions": [
    {
      "question": "Question 1",
      "answerOptions": ["Option 1", "Option 2", "Option 3"]
    },
    ...
  ]
}`].join("\n");

export const dayActivitiesArrangeInstruction = (timezone: string, targetDay: string = "today") => [
  `Arrange the target activities into my current schedule for the day **${targetDay}**.`,
  "",
  "Guidelines for Scheduling:",
  "- Avoid Overlaps: Do not schedule activities that conflict with my existing calendar events.",
  "- Respect Priorities: Schedule high-priority activities first, followed by medium and low priorities.",
  "- Energy Levels: Align activities that require high energy with my likely high-energy times",
  "- Breaks: Include reasonable break times between long or mentally/physically demanding activities.",
  "- Flexibility: If preferred timings are given, try to accommodate them. If not, arrange activities in the most logical order.",
  "- Time Gaps: Fill gaps in my calendar efficiently but avoid over-packing the schedule.",
  "- End of Day: Ensure the schedule allows me to wind down at least an hour before bedtime.",
  "- Habits and routines scheduled for specific days must be respected.",
  "- Length of activities: Decide by you but should be reasonable align with user properties in context.",
  "",
  "Output Format:",
  "- Respond with a valid JSON array of activities, nothing else, including:",
  "1. **Activity**: From activities to arrange.",
  `2. **Start and end times**: Date and time in ISO 8601 format, offset to ${timezone}.`,
  "3. **Reminders**: Specify **reasonable reminders** (e.g., 10 and 0 minutes before reading; 10 and 1 minute before important events).",
  `Example format:: [{
    "activity": "...",
    "start_time": ..., // Date and time, offset to ${timezone}
    "end_time": ..., // Date and time, offset to ${timezone}
    "reminder": [] // array of number minutes
    },
    ...
  ]`,
].join("\n");
