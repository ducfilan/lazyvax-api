export const WorkLifeWorkFocused = 1;
export const WorkLifeBalanced = 2;
export const WorkLifeLifeFocused = 3;

export const workLifeBalanceTypes = [
  WorkLifeWorkFocused,
  WorkLifeBalanced,
  WorkLifeLifeFocused,
];

export const MaritalStatusSingle = 1;
export const MaritalStatusDivorced = 2;
export const MaritalStatusWidowed = 3;
export const MaritalStatusSeparated = 4;
export const MaritalStatusMarriedNoChildren = 5;
export const MaritalStatusMarriedOneChild = 6;
export const MaritalStatusMarriedTwoChildren = 7;
export const MaritalStatusMarriedThreeOrMoreChildren = 8;

export const MaritalStatusMax = 8;

export const JobStatusFullTime = 1;
export const JobStatusPartTime = 2;
export const JobStatusFlexible = 3;
export const JobStatusUnemployed = 4;
export const JobStatusRetired = 5;
export const JobStatusOther = 6;

export const JobStatusMax = 6;

export const checkLastWeekPlanStep = 'checkLastWeekPlan'
export const checkRoutineAndHabitsStep = 'checkRoutineAndHabits'
export const checkThisWeekCalendarEventsStep = 'checkThisWeekCalendarEvents'
export const checkWeekToDoTasksStep = 'checkWeekToDoTasks'
export const getUserTimezoneStep = 'getUserTimezone'
export const generateDayTasksStep = 'generateDayTasks'
export const arrangeDayStep = 'arrangeDay'

export const DayPlanSteps = {
  [checkLastWeekPlanStep]: 0,
  [checkRoutineAndHabitsStep]: 1,
  [checkThisWeekCalendarEventsStep]: 2,
  [checkWeekToDoTasksStep]: 3,
  [getUserTimezoneStep]: 4,
  [generateDayTasksStep]: 5,
  [arrangeDayStep]: 6,
}

export const ConversationTypeWeek = 'week'
export const ConversationTypeDay = 'day'
export const ConversationTypeMonth = 'month'
export const ConversationTypeObjective = 'objective'
export const ConversationTypeAll = 'all'
export const ConversationTypes = [
  ConversationTypeWeek, ConversationTypeDay, ConversationTypeMonth, ConversationTypeObjective, ConversationTypeAll
]

export const WeekPlanStageBegin = 1
export const WeekPlanStageDonePlanning = 2
export const WeekPlanStages = [WeekPlanStageBegin, WeekPlanStageDonePlanning]
