import type { Request, Response, NextFunction } from 'express';
import {
  listAdvisorChatMessages,
  runAdvisorChat,
  type ChatTurn,
} from '../services/advisorChatService';

export const getAdvisorChatMessagesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }
    const messages = await listAdvisorChatMessages(campaignId);
    return res.status(200).json({ campaignId, messages });
  } catch (err) {
    return next(err);
  }
};

export const postAdvisorChatHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ error: 'Invalid campaign id.' });
    }

    const body = req.body as {
      message?: unknown;
      history?: unknown;
    };

    if (typeof body.message !== 'string' || !body.message.trim()) {
      return res.status(400).json({
        error: 'Invalid payload: "message" is required (non-empty string).',
      });
    }

    let sessionHistory: ChatTurn[] | undefined;
    if (Array.isArray(body.history)) {
      sessionHistory = body.history
        .filter(
          (t): t is ChatTurn =>
            t != null &&
            typeof t === 'object' &&
            (t as ChatTurn).role !== undefined &&
            (t as ChatTurn).content !== undefined &&
            ((t as ChatTurn).role === 'user' ||
              (t as ChatTurn).role === 'assistant') &&
            typeof (t as ChatTurn).content === 'string'
        )
        .map((t) => ({
          role: t.role,
          content: String(t.content).slice(0, 12000),
        }));
    }

    const result = await runAdvisorChat({
      campaignId,
      userMessage: body.message.trim(),
      sessionHistory,
    });

    return res.status(200).json({
      campaignId,
      reply: result.reply,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Advisor chat failed.';
    return res.status(400).json({ error: message });
  }
};
