import type { Request, Response, NextFunction } from 'express';
import {
  createClient,
  getClientById,
  listClients,
  updateClientById,
  deleteClientWithRelations,
} from '../services/clientService';

export const createClientHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name } = req.body as { name?: unknown };

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "name" is required and must be a non-empty string.',
      });
    }

    const client = await createClient({ name });
    return res.status(201).json(client);
  } catch (err) {
    return next(err);
  }
};

export const listClientsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clients = await listClients();
    return res.status(200).json(clients);
  } catch (err) {
    return next(err);
  }
};

export const getClientByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const client = await getClientById(id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    return res.status(200).json(client);
  } catch (err) {
    return next(err);
  }
};

export const patchClientByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const { name } = req.body as { name?: unknown };
    if (name === undefined) {
      return res.status(400).json({
        error: 'Invalid payload: "name" is required.',
      });
    }
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "name" must be a non-empty string.',
      });
    }

    const updated = await updateClientById(id, name);
    if (!updated) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

export const deleteClientByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const deleted = await deleteClientWithRelations(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

