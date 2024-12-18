import { WeeklyPlanningWorkflow } from "./weekly_plan_workflow";
import { NormalMessageWorkflow } from "./normal_message_workflow";
import { DayPlanWorkflow } from "./day_plan_workflow";
import { GoalSettingCategoryQuestionsWorkflow } from "./goal_setting_workflows";

export let weeklyPlanningWorkflow: WeeklyPlanningWorkflow = null;
export let normalMessageWorkflow: NormalMessageWorkflow = null;
export let dayPlanWorkflow: DayPlanWorkflow = null;
export let goalSettingCategoryQuestionsWorkflow: GoalSettingCategoryQuestionsWorkflow = null;

export const initWorkflows = () => {
  weeklyPlanningWorkflow = new WeeklyPlanningWorkflow()
  normalMessageWorkflow = new NormalMessageWorkflow()
  dayPlanWorkflow = new DayPlanWorkflow()
  goalSettingCategoryQuestionsWorkflow = new GoalSettingCategoryQuestionsWorkflow()
}
