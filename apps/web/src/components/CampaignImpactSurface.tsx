import { useEffect, useMemo, useState } from 'react';
import {
  apiClient,
  type CampaignDecisionSummary,
  type DataWindow,
} from '../lib/apiClient';

export interface CampaignImpactSurfaceProps {
  campaignId: number;
  refreshTrigger?: number;
  /** Short status / reason / next only (for Advanced panel) */
  compact?: boolean;
}

type SurfaceState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; decision: CampaignDecisionSummary; dataWindow: DataWindow | null };

const BACKEND_FAILURE = /^Could not load the full decision summary/i;
const DEFAULT_NBA_TITLE = 'Review campaign status and uploaded reports';

const formatMoney = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
};

const labelConfidence = (c: CampaignDecisionSummary['confidence']) => {
  const u = c?.toLowerCase();
  if (u === 'high') return 'High';
  if (u === 'medium') return 'Medium';
  return 'Low';
};

const confidencePillClass = (c: CampaignDecisionSummary['confidence']) => {
  const u = c?.toLowerCase();
  if (u === 'high') return 'pill-ok';
  if (u === 'low') return 'pill-error';
  return 'pill-warning';
};

const evidenceLabel = (e: CampaignDecisionSummary['evidenceStrength']) => {
  const u = e?.toLowerCase();
  if (u === 'strong') return 'Strong data';
  if (u === 'directional') return 'Directional';
  return 'Thin data';
};

const evidenceTone = (e: CampaignDecisionSummary['evidenceStrength']) => {
  const u = e?.toLowerCase();
  if (u === 'strong') return 'impact-strip-pill--ok';
  if (u === 'directional') return 'impact-strip-pill--warn';
  return 'impact-strip-pill--bad';
};

function optimizationLabel(
  dw: DataWindow | null,
): { text: string; tone: 'ok' | 'warn' | 'bad' } {
  if (!dw) return { text: '—', tone: 'warn' };
  const { alignmentStatus: a, freshnessStatus: f } = dw;
  if (a === 'MISALIGNED' || f === 'STALE') return { text: 'At risk', tone: 'bad' };
  if (a === 'PARTIAL' || f === 'AGING') return { text: 'Review', tone: 'warn' };
  if (a === 'ALIGNED' && f === 'FRESH') return { text: 'Ready', tone: 'ok' };
  if (a === 'UNKNOWN' || f === 'UNKNOWN') return { text: 'Review', tone: 'warn' };
  return { text: 'Review', tone: 'warn' };
}

function optToneClass(tone: 'ok' | 'warn' | 'bad'): string {
  if (tone === 'ok') return 'impact-strip__opt--ok';
  if (tone === 'bad') return 'impact-strip__opt--bad';
  return 'impact-strip__opt--warn';
}

function shortWhy(text: string | undefined, max = 160): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

function shouldShowEmpty(decision: CampaignDecisionSummary): boolean {
  if (BACKEND_FAILURE.test(decision.primaryIssue ?? '')) return true;
  const pi = (decision.primaryIssue ?? '').trim();
  const noMoney =
    decision.estimatedWastedSpend == null && decision.estimatedUpside == null;
  const weak =
    decision.evidenceStrength === 'weak' && decision.confidence === 'low';
  if (
    weak &&
    noMoney &&
    (pi === DEFAULT_NBA_TITLE || pi === 'No meaningful next step available')
  ) {
    return true;
  }
  return false;
}

const scrollToExecution = () => {
  document.getElementById('section-execution')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

export const CampaignImpactSurface = ({
  campaignId,
  refreshTrigger = 0,
  compact = false,
}: CampaignImpactSurfaceProps) => {
  const [state, setState] = useState<SurfaceState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    Promise.all([
      apiClient.getDecisionSummary(campaignId),
      apiClient.getCampaignDataWindow(campaignId).catch(() => null),
    ])
      .then(([decision, dataWindow]) => {
        if (cancelled) return;
        setState({
          status: 'success',
          decision,
          dataWindow,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load impact.';
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, refreshTrigger]);

  const emptySuccess = useMemo(() => {
    if (state.status !== 'success') return false;
    return shouldShowEmpty(state.decision);
  }, [state]);

  if (state.status === 'loading') {
    return (
      <div className="impact-surface" aria-busy="true" aria-label="Impact">
        <div className="impact-strip impact-strip--loading">
          <div className="impact-strip__cell">
            <span className="impact-strip__skeleton impact-strip__skeleton--label" />
            <span className="impact-strip__skeleton impact-strip__skeleton--value" />
          </div>
          <div className="impact-strip__cell">
            <span className="impact-strip__skeleton impact-strip__skeleton--label" />
            <span className="impact-strip__skeleton impact-strip__skeleton--value" />
          </div>
          <div className="impact-strip__cell">
            <span className="impact-strip__skeleton impact-strip__skeleton--label" />
            <span className="impact-strip__skeleton impact-strip__skeleton--value" />
          </div>
        </div>
        <div className="impact-decision impact-decision--loading">
          <span className="impact-strip__skeleton impact-strip__skeleton--line" />
          <span className="impact-strip__skeleton impact-strip__skeleton--line impact-strip__skeleton--short" />
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    if (compact) {
      return (
        <div
          className="impact-surface impact-surface--compact impact-surface--empty"
          id="section-ai-decision"
        >
          <p className="impact-simple__empty">{state.message}</p>
        </div>
      );
    }
    return (
      <div className="impact-surface impact-surface--empty" id="section-ai-decision">
        <p className="impact-surface__empty">Impact unavailable.</p>
        <p className="impact-surface__err">{state.message}</p>
      </div>
    );
  }

  if (emptySuccess) {
    if (compact) {
      return (
        <div
          className="impact-surface impact-surface--compact impact-surface--empty"
          id="section-ai-decision"
        >
          <p className="impact-simple__empty">
            Upload reports and run analysis to see a short summary here.
          </p>
        </div>
      );
    }
    return (
      <div className="impact-surface impact-surface--empty" id="section-ai-decision">
        <p className="impact-surface__empty">Run analysis after uploading reports to see money impact.</p>
      </div>
    );
  }

  const { decision: d, dataWindow } = state;
  const waste = formatMoney(d.estimatedWastedSpend);
  const upside = formatMoney(d.estimatedUpside);
  const opt = optimizationLabel(dataWindow);
  const why = shortWhy(d.topReason);

  if (compact) {
    const statusOk =
      d.evidenceStrength === 'strong' || d.confidence === 'high';
    return (
      <div
        className="impact-surface impact-surface--compact"
        id="section-ai-decision"
      >
        <div className="impact-simple" aria-label="AI summary">
          <div className="impact-simple__row">
            <span className="impact-simple__k">Status</span>
            <span
              className={`impact-simple__v${statusOk ? ' impact-simple__v--ok' : ''}`}
            >
              {statusOk ? 'Ready' : 'Not ready'}
            </span>
          </div>
          <div className="impact-simple__row">
            <span className="impact-simple__k">Reason</span>
            <span className="impact-simple__v">
              {shortWhy(d.topReason || d.primaryIssue, 200)}
            </span>
          </div>
          <div className="impact-simple__row">
            <span className="impact-simple__k">Next step</span>
            <span className="impact-simple__v">{d.nextBestActionTitle}</span>
          </div>
        </div>
        <button
          type="button"
          className="button button-primary button-xs impact-simple__btn"
          onClick={scrollToExecution}
        >
          Go to actions
        </button>
      </div>
    );
  }

  return (
    <div className="impact-surface" id="section-ai-decision">
      <div className="impact-strip" role="region" aria-label="Money impact">
        <div className="impact-strip__cell">
          <span className="impact-strip__label">Wasted spend (est.)</span>
          <span className="impact-strip__value impact-strip__value--money">
            {waste !== '—' ? <><span className="impact-strip__approx">≈</span>{waste}</> : '—'}
          </span>
        </div>
        <div className="impact-strip__cell">
          <span className="impact-strip__label">Upside (est.)</span>
          <span className="impact-strip__value impact-strip__value--money impact-strip__value--upside">
            {upside !== '—' ? <><span className="impact-strip__approx">≈</span>{upside}</> : '—'}
          </span>
        </div>
        <div className="impact-strip__cell">
          <span className="impact-strip__label">Optimization</span>
          <span className={`impact-strip__value impact-strip__opt ${optToneClass(opt.tone)}`}>
            {opt.text}
          </span>
        </div>
      </div>

      <section className="impact-decision" aria-label="AI decision">
        <h2 className="impact-decision__eyebrow">Decision</h2>
        <p className="impact-decision__primary">{d.primaryIssue}</p>
        {why ? (
          <div className="impact-decision__why">
            <span className="impact-decision__why-label">Why</span>
            <p className="impact-decision__why-text">{why}</p>
          </div>
        ) : null}
        <div className="impact-decision__signals">
          <span className="impact-decision__signal-label">Confidence</span>
          <span className={`pill ${confidencePillClass(d.confidence)}`}>
            {labelConfidence(d.confidence)}
          </span>
          <span className="impact-decision__signal-label">Data</span>
          <span className={`impact-strip-pill ${evidenceTone(d.evidenceStrength)}`}>
            {evidenceLabel(d.evidenceStrength)}
          </span>
        </div>
        <div className="impact-decision__cta">
          <div className="impact-decision__next">
            <span className="impact-decision__next-label">Next</span>
            <span className="impact-decision__next-title">{d.nextBestActionTitle}</span>
          </div>
          <button
            type="button"
            className="button button-primary button-xs impact-decision__btn"
            onClick={scrollToExecution}
          >
            Execute
          </button>
        </div>
      </section>
    </div>
  );
};
