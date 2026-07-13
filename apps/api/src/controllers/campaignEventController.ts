import type { NextFunction, Request, Response } from 'express';
import { getCampaignById } from '../services/campaignService';
import {
  createCampaignEvent,
  listCampaignEvents,
} from '../services/campaignEventService';

export const createCampaignEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const {
      type,
      title,
      description,
      metadataJson,
      occurredAt,
    } = req.body as {
      type?: unknown;
      title?: unknown;
      description?: unknown;
      metadataJson?: unknown;
      occurredAt?: unknown;
    };

    if (typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "type" is required and must be a non-empty string.',
      });
    }

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        error:
          'Invalid payload: "title" is required and must be a non-empty string.',
      });
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({
        error:
          'Invalid payload: "description" must be a string when provided.',
      });
    }

    if (metadataJson !== undefined && typeof metadataJson !== 'string') {
      return res.status(400).json({
        error:
          'Invalid payload: "metadataJson" must be a string when provided (serialized JSON).',
      });
    }

    let parsedOccurredAt: Date | undefined;
    if (occurredAt !== undefined && occurredAt !== null && occurredAt !== '') {
      if (typeof occurredAt !== 'string') {
        return res.status(400).json({
          error:
            'Invalid payload: "occurredAt" must be an ISO date string when provided.',
        });
      }
      const date = new Date(occurredAt);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          error:
            'Invalid payload: "occurredAt" must be a valid ISO date string when provided.',
        });
      }
      parsedOccurredAt = date;
    }

    const event = await createCampaignEvent({
      campaignId,
      type,
      title,
      description:
        typeof description === 'string' && description.trim()
          ? description
          : undefined,
      metadataJson:
        typeof metadataJson === 'string' && metadataJson.trim()
          ? metadataJson
          : undefined,
      occurredAt: parsedOccurredAt ?? undefined,
    });

    return res.status(201).json(event);
  } catch (err) {
    return next(err);
  }
};

export const listCampaignEventsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid "id" parameter. It must be a positive integer.',
      });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const events = await listCampaignEvents(campaignId);
    // Events are returned in ascending order by occurredAt to represent a timeline.
    return res.status(200).json(events);
  } catch (err) {
    return next(err);
  }
};

