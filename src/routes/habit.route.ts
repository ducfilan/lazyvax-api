import { Router } from 'express';
import HabitsController from '@controllers/habits.controller';
import auth from '@middlewares/global/auth.mw';

const habitsRouter = Router();

habitsRouter.route('/')
  .get(auth, HabitsController.getHabits)
  .post(auth, HabitsController.createHabit);

habitsRouter.route('/:id')
  .put(auth, HabitsController.updateHabit)
  .delete(auth, HabitsController.deleteHabit);

export default habitsRouter;
