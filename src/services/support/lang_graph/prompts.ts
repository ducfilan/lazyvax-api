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

    roleInfo = `working ${jobStatus ?? ""} as ${workerType} in the field "${
      user.preferences.occupation
    }"`;
    const yearsOfExperience = user.preferences?.yearsOfExperience;
    if (yearsOfExperience) {
      roleInfo += `, having ${yearsOfExperience} years of experience.`;
    }
  } else {
    roleInfo = `student studying the ${user.preferences.degree} degree of ${user.preferences.studyCourse} field.`;
  }

  const maritalStatus = MaritalStatusOptions[user.preferences?.maritalStatus];
  const futureSelf =
    user.preferences?.futureSelf?.join(", ") ?? "(Not specified)";
  const aspects = user.preferences?.aspects?.join(", ") ?? "(Not specified)";
  const workLifeBalance = user.preferences?.workLifeBalance
    ? WorkLifeBalanceOptions[user.preferences.workLifeBalance]
    : "(Not specified)";

  return `User info: Age: ${age}, Gender: ${gender}, marital status: ${maritalStatus}, ${roleInfo}, want to be a person: ${futureSelf}, priorities in life: ${aspects}. For work-life balance, prefer: ${workLifeBalance}`;
};

export const dayTasksSuggestTemplate =
  "### Context: ###\nNow is {now}.\n{user_info}\nHabits:\n{habit}\nTo do tasks this week:\n{weekToDoTask}\nWhat's on calendar last week:\n{calendarLastWeekEvents}\nWhat's on calendar this week:\n{calendarEvents}\nDisliked activities:\n{dislikeActivities}\n### Instructions: ###\n{instructions}";

export const dayTasksSuggestionFirstDayTemplate =
  "### Context: ###\nNow is {now}.\n{user_info}\nHabits:\n{habit}\nTo do tasks this week:\n{weekToDoTask}\nWhat's on calendar last week:\n{calendarLastWeekEvents}\nWhat's on calendar this week:\n{calendarEvents}\n### Instructions: ###\n{instructions}";

export const dayTasksSuggestInstruction = (
  timezone: string,
  targetDay: string = "today"
) =>
  [
    `- Suggest at least 10 activities through the day ${targetDay} in JSON format, with each \"activity\" short and to-the-point for a to-do list.`,
    "- Align with user properties and tailor suggestions based on that",
    "- For some time ranges outside of fulltime job working time, suggest multiple activities to choose from, not necessary 1 time slot 1 activity.",
    "- Don't suggest mediocre activities that is too small like brushing teeth, prepare for bed, etc.",
    "- Strictly follow my habits if it has specific day",
    `- Must be after now in ${timezone}`,
    "- Avoid suggesting activities that user disliked",
    "- Align with the activities already on the calendar this week, don't repeat them and avoid time conflicts",
    "- Make each activity description clear and actionable.",
    "- Set reasonable reminders, e.g., 10 and 0 minutes before reading, 10 and 1 minute before meetings.",
    `Respond with a valid JSON object. Format: [{
  "activity": "...",
  "start_time": ..., // Date and time, offset to ${timezone}
  "end_time": ..., // Date and time, offset to ${timezone}
  "reason": "...",
  "reminder": [], // array of number minutes
  },
  ...
  ]`,
  ].join("\n");
