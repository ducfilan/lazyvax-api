import { WeeklyPlanningWorkflow } from "./weekly_plan_workflow";

export let weeklyPlanningWorkflow: WeeklyPlanningWorkflow = null;

export const initWorkflows = () => {
  weeklyPlanningWorkflow = new WeeklyPlanningWorkflow()
}
