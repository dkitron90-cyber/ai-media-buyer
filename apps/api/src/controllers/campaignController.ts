import type { NextFunction, Request, Response } from 'express';
import {
  createCampaign,
  getCampaignById,
  listCampaigns,
  listCampaignsByClientId,
} from '../services/campaignService';
import { getClientById } from '../services/clientService';

export const createCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      clientId,
      name,
      type,
      status,
      monthlyBudget,
      targetCpa,
      product,
      productUrl,
    } = req.body as {
      clientId?: unknown;
      name?: unknown;
      type?: unknown;
      status?: unknown;
      monthlyBudget?: unknown;
      targetCpa?: unknown;
      product?: unknown;
      productUrl?: unknown;
    };

    const parsedClientId = Number(clientId);
    if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
      return res.status(400).json({
        error:
          'Invalid payload: "clientId" is required and must be a positive integer.',
      });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "name" is required and must be a non-empty string.',
      });
    }

    if (typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "type" is required and must be a non-empty string.',
      });
    }

    if (status !== undefined && typeof status !== 'string') {
      return res.status(400).json({
        error: 'Invalid payload: "status" must be a string when provided.',
      });
    }

    const numericMonthlyBudget =
      monthlyBudget === undefined || monthlyBudget === null
        ? undefined
        : Number(monthlyBudget);
    if (
      numericMonthlyBudget !== undefined &&
      (Number.isNaN(numericMonthlyBudget) || numericMonthlyBudget < 0)
    ) {
      return res.status(400).json({
        error:
          'Invalid payload: "monthlyBudget" must be a non-negative number when provided.',
      });
    }

    const numericTargetCpa =
      targetCpa === undefined || targetCpa === null
        ? undefined
        : Number(targetCpa);
    if (
      numericTargetCpa !== undefined &&
      (Number.isNaN(numericTargetCpa) || numericTargetCpa < 0)
    ) {
      return res.status(400).json({
        error:
          'Invalid payload: "targetCpa" must be a non-negative number when provided.',
      });
    }

    if (product !== undefined && typeof product !== 'string') {
      return res.status(400).json({
        error: 'Invalid payload: "product" must be a string when provided.',
      });
    }

    if (productUrl !== undefined && typeof productUrl !== 'string') {
      return res.status(400).json({
        error: 'Invalid payload: "productUrl" must be a string when provided.',
      });
    }

    const client = await getClientById(parsedClientId);
    if (!client) {
      return res.status(404).json({
        error: 'Client not found for provided "clientId".',
      });
    }

    const campaign = await createCampaign({
      clientId: parsedClientId,
      name,
      type,
      status,
      monthlyBudget: numericMonthlyBudget,
      targetCpa: numericTargetCpa,
      product,
      productUrl,
    });

    return res.status(201).json(campaign);
  } catch (err) {
    return next(err);
  }
};

export const listCampaignsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaigns = await listCampaigns();
    return res.status(200).json(campaigns);
  } catch (err) {
    return next(err);
  }
};

export const getCampaignByIdHandler = async (
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

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.status(200).json(campaign);
  } catch (err) {
    return next(err);
  }
};

export const listCampaignsByClientHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = Number(req.params.id);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const campaigns = await listCampaignsByClientId(clientId);
    return res.status(200).json(campaigns);
  } catch (err) {
    return next(err);
  }
};

import { updateCampaignById, deleteCampaignWithRelations } from '../services/campaignService';

export const patchCampaignByIdHandler = async (
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

    const {
      name,
      type,
      status,
      monthlyBudget,
      targetCpa,
      product,
      productUrl,
    } = req.body as {
      name?: unknown;
      type?: unknown;
      status?: unknown;
      monthlyBudget?: unknown;
      targetCpa?: unknown;
      product?: unknown;
      productUrl?: unknown;
    };

    const update: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          error: 'Invalid payload: "name" must be a non-empty string when provided.',
        });
      }
      update.name = name;
    }

    if (type !== undefined) {
      if (typeof type !== 'string' || !type.trim()) {
        return res.status(400).json({
          error: 'Invalid payload: "type" must be a non-empty string when provided.',
        });
      }
      update.type = type;
    }

    if (status !== undefined) {
      if (typeof status !== 'string' || !status.trim()) {
        return res.status(400).json({
          error: 'Invalid payload: "status" must be a non-empty string when provided.',
        });
      }
      update.status = status;
    }

    const parseOptionalNumber = (value: unknown, field: string) => {
      if (value === undefined || value === null || value === '') return null;
      const n = Number(value);
      if (Number.isNaN(n) || n < 0) {
        throw new Error(
          `Invalid payload: "${field}" must be a non-negative number when provided.`
        );
      }
      return n;
    };

    try {
      if (monthlyBudget !== undefined) {
        update.monthlyBudget = parseOptionalNumber(monthlyBudget, 'monthlyBudget');
      }
      if (targetCpa !== undefined) {
        update.targetCpa = parseOptionalNumber(targetCpa, 'targetCpa');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid numeric payload.';
      return res.status(400).json({ error: message });
    }

    if (product !== undefined && product !== null && typeof product !== 'string') {
      return res.status(400).json({
        error: 'Invalid payload: "product" must be a string or null when provided.',
      });
    }
    if (product !== undefined) {
      update.product = product as string | null;
    }

    if (productUrl !== undefined && productUrl !== null && typeof productUrl !== 'string') {
      return res.status(400).json({
        error: 'Invalid payload: "productUrl" must be a string or null when provided.',
      });
    }
    if (productUrl !== undefined) {
      update.productUrl = productUrl as string | null;
    }

    const updated = await updateCampaignById(id, update);
    if (!updated) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

export const deleteCampaignByIdHandler = async (
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

    const deleted = await deleteCampaignWithRelations(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

