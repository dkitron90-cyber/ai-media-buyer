import { Router } from 'express';
import {
  createClientHandler,
  getClientByIdHandler,
  listClientsHandler,
  patchClientByIdHandler,
  deleteClientByIdHandler,
} from '../controllers/clientController';
import { listCampaignsByClientHandler } from '../controllers/campaignController';
import {
  getAdvisoryProfileHandler,
  patchAdvisoryProfileHandler,
} from '../controllers/advisoryProfileController';

export const clientsRouter = Router();

clientsRouter.post('/', createClientHandler);
clientsRouter.get('/', listClientsHandler);
clientsRouter.get('/:id/advisory-profile', getAdvisoryProfileHandler);
clientsRouter.patch('/:id/advisory-profile', patchAdvisoryProfileHandler);
clientsRouter.get('/:id', getClientByIdHandler);
clientsRouter.patch('/:id', patchClientByIdHandler);
clientsRouter.delete('/:id', deleteClientByIdHandler);
clientsRouter.get('/:id/campaigns', listCampaignsByClientHandler);

