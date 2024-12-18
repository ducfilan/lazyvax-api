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
export const checkGoalsStep = 'checkGoals'
export const checkRoutineAndHabitsStep = 'checkRoutineAndHabits'
export const checkThisWeekCalendarEventsStep = 'checkThisWeekCalendarEvents'
export const checkWeekToDoTasksStep = 'checkWeekToDoTasks'
export const getUserTimezoneStep = 'getUserTimezone'
export const askMoreInfoStep = 'askMoreInfo'
export const generateDayTasksStep = 'generateDayTasks'
export const arrangeDayStep = 'arrangeDay'

export const DayPlanSteps = {
  [checkLastWeekPlanStep]: 0,
  [checkGoalsStep]: 1,
  [checkRoutineAndHabitsStep]: 2,
  [checkThisWeekCalendarEventsStep]: 3,
  [checkWeekToDoTasksStep]: 4,
  [getUserTimezoneStep]: 5,
  [askMoreInfoStep]: 6,
  [generateDayTasksStep]: 7,
  [arrangeDayStep]: 8,
}

export const checkMessageIntentStep = 'checkMessageIntent'
export const handlePlanningMessageStep = 'handlePlanningMessage'
export const handleGeneralMessageStep = 'handleGeneralMessage'
export const summarizeConversationStep = 'summarizeConversation'

export const NormalMessageSteps = {
  [checkMessageIntentStep]: 0,
  [handlePlanningMessageStep]: 1,
  [handleGeneralMessageStep]: 1,
  [summarizeConversationStep]: 2,
}

export const ConversationTypeWeek = 'week'
export const ConversationTypeDay = 'day'
export const ConversationTypeMonth = 'month'
export const ConversationTypeGoal = 'goal'
export const ConversationTypeAll = 'all'
export const ConversationTypes = [
  ConversationTypeWeek, ConversationTypeDay, ConversationTypeMonth, ConversationTypeGoal, ConversationTypeAll
]

export const WeekPlanStageBegin = 1
export const WeekPlanStageDonePlanning = 2
export const WeekPlanStages = [WeekPlanStageBegin, WeekPlanStageDonePlanning]

export const PriorityHigh = 2;
export const PriorityMedium = 1;
export const PriorityLow = 0;

export const TaskPriorities = [PriorityHigh, PriorityMedium, PriorityLow]

export const GoalTypeLife = 'life'
export const GoalTypeLong = 'long'
export const GoalTypeShort = 'short'
export const GoalTypes = [GoalTypeLife, GoalTypeLong, GoalTypeShort]

export const EventStatusDefault = 0;
export const EventStatusDone = 1;
export const EventStatusUndone = 3;
export const EventStatuses = [
  EventStatusDefault,
  EventStatusDone,
  EventStatusUndone,
] as const;
