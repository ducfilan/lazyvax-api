import { Router } from 'express';
import EventsController from '@controllers/events.controller';
import auth from '@middlewares/global/auth.mw';
import { validateEventCreation, validateEventUpdate, validateEventFilters } from '@validators/events.validator';

const securedEventRouter = Router()

securedEventRouter.route('/')
  .post(auth, validateEventCreation, EventsController.createEvent)
  .get(auth, validateEventFilters, EventsController.getEvents);

securedEventRouter.route('/:eventId')
  .patch(auth, validateEventUpdate, EventsController.updateEvent)
  .delete(auth, EventsController.deleteEvent);

export {
  securedEventRouter
}
