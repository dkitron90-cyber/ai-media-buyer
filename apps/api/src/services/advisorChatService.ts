import { prisma } from '../db/prisma';
import { buildCampaignAiContext } from './aiContextService';
import { getCampaignDecisionSummary } from './decisionSummaryService';
import { listAnalyses } from './campaignAnalysisHistoryService';
import type { CampaignDiagnosis } from '../ai/openaiProvider';

const MAX_PRIOR_MESSAGES = 24;
const MAX_CONTEXT_JSON_CHARS = 120_000;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

function getOpenAIApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === '') return null;
  return key.trim();
}

function trimLatestAnalysis(
  diagnosis: CampaignDiagnosis | null | undefined
): Record<string, unknown> | null {
  if (!diagnosis) return null;
  return {
    evidenceStrength: diagnosis.evidenceStrength,
    executiveSummary: diagnosis.executiveSummary,
    primaryIssue: diagnosis.primaryIssue,
    focusArea: diagnosis.focusArea,
    prioritizedActions: (diagnosis.prioritizedActions ?? []).slice(0, 5).map((a) => ({
      type: a.type,
      title: a.title,
      rationale: a.rationale?.slice(0, 400),
      priority: a.priority,
    })),
    risks: (diagnosis.risks ?? []).slice(0, 5),
    missingData: (diagnosis.missingData ?? []).slice(0, 8),
  };
}

export async function listAdvisorChatMessages(
  campaignId: number,
  take = MAX_PRIOR_MESSAGES
): Promise<Array<{ id: number; role: string; content: string; createdAt: string }>> {
  const rows = await prisma.campaignAdvisorChatMessage.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows
    .reverse()
    .map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));
}

async function appendMessage(
  campaignId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await prisma.campaignAdvisorChatMessage.create({
    data: {
      campaignId,
      role,
      content,
    },
  });
}

/**
 * Build a single JSON payload for the model: full AI context + decision summary + latest diagnosis excerpt.
 */
export async function buildAdvisorChatContextPackage(campaignId: number): Promise<{
  campaignContext: NonNullable<Awaited<ReturnType<typeof buildCampaignAiContext>>>;
  decisionSummary: Awaited<ReturnType<typeof getCampaignDecisionSummary>>;
  latestAnalysis: ReturnType<typeof trimLatestAnalysis>;
} | null> {
  const base = await buildCampaignAiContext(campaignId);
  if (!base) return null;

  const [decisionSummary, analyses] = await Promise.all([
    getCampaignDecisionSummary(campaignId),
    listAnalyses(campaignId),
  ]);

  const latest = analyses[0]?.outputJson;
  const latestAnalysis = trimLatestAnalysis(latest ?? null);

  return {
    campaignContext: base,
    decisionSummary: decisionSummary ?? {
      campaignId,
      primaryIssue: '—',
      focusArea: '—',
      estimatedWastedSpend: null,
      estimatedUpside: null,
      confidence: 'low',
      topReason: '—',
      nextBestActionTitle: '—',
      evidenceStrength: 'weak',
    },
    latestAnalysis,
  };
}

function safeStringify(obj: unknown): string {
  try {
    const s = JSON.stringify(obj);
    if (s.length <= MAX_CONTEXT_JSON_CHARS) return s;
    return (
      s.slice(0, MAX_CONTEXT_JSON_CHARS) +
      '\n…[context truncated for token limits]'
    );
  } catch {
    return '{}';
  }
}

const SYSTEM_PROMPT = [
  'You are a senior Google Ads / PPC advisor. Answer ONLY using the campaign context JSON provided in the first user message.',
  'Be direct, specific, and actionable. No fluff, no generic marketing speak.',
  'If the context does not contain enough data to answer a question, say exactly what is missing (e.g. which reports to upload or which settings to fill).',
  'Never invent dollar amounts, metrics, or placement names not present in the context.',
  'Prefer concrete next steps: what to exclude, what to scale, what to upload, what to change this week.',
  'Keep answers concise unless the user asks for detail.',
].join('\n');

export async function runAdvisorChat(params: {
  campaignId: number;
  userMessage: string;
  /** When DB is empty, use these prior turns (session-only). */
  sessionHistory?: ChatTurn[];
}): Promise<{ reply: string }> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return {
      reply:
        'Set OPENAI_API_KEY on the API server to enable advisor chat. Context is still available via analysis and reports.',
    };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
    select: { id: true },
  });
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  const pkg = await buildAdvisorChatContextPackage(params.campaignId);
  if (!pkg) {
    throw new Error('Could not build campaign context.');
  }

  const contextBlob = safeStringify({
    campaignContext: pkg.campaignContext,
    decisionSummary: pkg.decisionSummary,
    latestAnalysis: pkg.latestAnalysis,
  });

  let stored = await listAdvisorChatMessages(params.campaignId, MAX_PRIOR_MESSAGES);
  let priorFromDb: ChatTurn[] = stored
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  if (
    priorFromDb.length === 0 &&
    params.sessionHistory &&
    params.sessionHistory.length > 0
  ) {
    for (const t of params.sessionHistory) {
      if (t.role !== 'user' && t.role !== 'assistant') continue;
      await appendMessage(params.campaignId, t.role, t.content);
    }
    stored = await listAdvisorChatMessages(params.campaignId, MAX_PRIOR_MESSAGES);
    priorFromDb = stored
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  const prior: ChatTurn[] = priorFromDb;

  const cappedPrior = prior.slice(-20);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Campaign context (JSON). Use only this data plus follow-up messages:\n${contextBlob}`,
    },
    {
      role: 'assistant',
      content:
        'I have the campaign context. I will answer only from this data and prior messages in this thread.',
    },
  ];

  for (const turn of cappedPrior) {
    messages.push({ role: turn.role, content: turn.content });
  }

  messages.push({ role: 'user', content: params.userMessage.trim() });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages,
      temperature: 0.35,
      max_tokens: 900,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errText.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply =
    data.choices?.[0]?.message?.content?.trim() ||
    'No response from the model. Try again.';

  await appendMessage(params.campaignId, 'user', params.userMessage.trim());
  await appendMessage(params.campaignId, 'assistant', reply);

  return { reply };
}
