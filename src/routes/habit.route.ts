import { Router } from 'express';
import HabitsController from '@controllers/habits.controller';
import auth from '@middlewares/global/auth.mw';

const securedHabitsRouter = Router();

securedHabitsRouter.route('/')
  .get(auth, HabitsController.getHabits)
  .post(auth, HabitsController.createHabit);

securedHabitsRouter.route('/:id')
  .patch(auth, HabitsController.updateHabit)
  .delete(auth, HabitsController.deleteHabit);

export default securedHabitsRouter;
