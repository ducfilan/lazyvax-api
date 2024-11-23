import { WeeklyPlanningWorkflow } from "./weekly_plan_workflow";
import { NormalMessageWorkflow } from "./normal_message_workflow";

export let weeklyPlanningWorkflow: WeeklyPlanningWorkflow = null;
export let normalMessageWorkflow: NormalMessageWorkflow = null;

export const initWorkflows = () => {
  weeklyPlanningWorkflow = new WeeklyPlanningWorkflow()
  normalMessageWorkflow = new NormalMessageWorkflow()
}
