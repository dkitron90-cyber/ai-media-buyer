import type { NextFunction, Request, Response } from 'express';
import { getCampaignById } from '../services/campaignService';
import {
  createCampaignNote,
  listCampaignNotes,
  getCampaignNoteById,
  updateCampaignNoteById,
  deleteCampaignNoteById,
} from '../services/campaignNoteService';

export const createCampaignNoteHandler = async (
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

    const { content, author, pinned } = req.body as {
      content?: unknown;
      author?: unknown;
      pinned?: unknown;
    };

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        error:
          'Invalid payload: "content" is required and must be a non-empty string.',
      });
    }

    if (author !== undefined && typeof author !== 'string') {
      return res.status(400).json({
        error: 'Invalid payload: "author" must be a string when provided.',
      });
    }

    if (pinned !== undefined && typeof pinned !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid payload: "pinned" must be a boolean when provided.',
      });
    }

    const note = await createCampaignNote({
      campaignId,
      content,
      author: typeof author === 'string' ? author : undefined,
      pinned: typeof pinned === 'boolean' ? pinned : undefined,
    });

    return res.status(201).json(note);
  } catch (err) {
    return next(err);
  }
};

export const listCampaignNotesHandler = async (
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

    const notes = await listCampaignNotes(campaignId);
    return res.status(200).json(notes);
  } catch (err) {
    return next(err);
  }
};

export const patchCampaignNoteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    const noteId = Number(req.params.noteId);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"id\" parameter. It must be a positive integer.',
      });
    }
    if (!Number.isInteger(noteId) || noteId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"noteId\" parameter. It must be a positive integer.',
      });
    }

    const existing = await getCampaignNoteById(campaignId, noteId);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const { content, author, pinned } = req.body as {
      content?: unknown;
      author?: unknown;
      pinned?: unknown;
    };

    const data: Record<string, unknown> = {};

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({
          error:
            'Invalid payload: \"content\" must be a non-empty string when provided.',
        });
      }
      data.content = content;
    }

    if (author !== undefined) {
      if (author !== null && typeof author !== 'string') {
        return res.status(400).json({
          error: 'Invalid payload: \"author\" must be a string or null when provided.',
        });
      }
      data.author = author as string | null;
    }

    if (pinned !== undefined) {
      if (typeof pinned !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid payload: \"pinned\" must be a boolean when provided.',
        });
      }
      data.pinned = pinned;
    }

    const updated = await updateCampaignNoteById(campaignId, noteId, data);
    if (!updated) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

export const deleteCampaignNoteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    const noteId = Number(req.params.noteId);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"id\" parameter. It must be a positive integer.',
      });
    }
    if (!Number.isInteger(noteId) || noteId <= 0) {
      return res.status(400).json({
        error: 'Invalid \"noteId\" parameter. It must be a positive integer.',
      });
    }

    const deleted = await deleteCampaignNoteById(campaignId, noteId);
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

