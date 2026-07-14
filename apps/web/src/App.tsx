import { useEffect, useMemo, useRef, useState } from 'react';
import {
  apiClient,
  CAMPAIGN_SETTINGS_SCHEMA_VERSION,
  type Campaign,
  type Client,
  type HealthResponse,
  type CampaignTypeSummary,
} from './lib/apiClient';
import {
  CampaignTypeSettingsForm,
  buildSettingsPayloadForType,
  normalizeSettingsDraftFromApi,
} from './components/CampaignTypeSettingsForm';
import { ClientForm } from './components/ClientForm';
import { ClientList } from './components/ClientList';
import { CampaignForm } from './components/CampaignForm';
import { CampaignList } from './components/CampaignList';
import { CampaignDetail } from './components/CampaignDetail';
import { SmartReportUploadWizard } from './components/SmartReportUploadWizard';
import { CollapsibleSection } from './components/CollapsibleSection';
import { DemoBanner } from './components/DemoBanner';
import { PortfolioView } from './components/PortfolioView';
import { CampaignCompareView } from './components/CampaignCompareView';
import './styles.css';
import type { ExperienceMode } from './lib/experienceMode';

type HealthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: HealthResponse };

type SidebarNavId = 'dashboard' | 'clients' | 'campaigns' | 'portfolio' | 'compare';

const NavIconDashboard = () => (
  <svg
    className="sidebar-nav-item__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const NavIconUsers = () => (
  <svg
    className="sidebar-nav-item__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NavIconMegaphone = () => (
  <svg
    className="sidebar-nav-item__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M3 11l18-5v12L3 13v-2z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

const NavIconUpload = () => (
  <svg
    className="sidebar-nav-item__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

const NavIconCompare = () => (
  <svg
    className="sidebar-nav-item__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M8 3L4 7l4 4M16 21l4-4-4-4" />
    <path d="M4 7h16M20 17H4" />
  </svg>
);

const NavIconChart = () => (
  <svg
    className="sidebar-nav-item__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M3 3v18h18" />
    <path d="M7 18V9M12 18V5M17 18v-7" />
  </svg>
);

const NavChevron = () => (
  <svg
    className="sidebar-nav-item__chevron"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const BrainLogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 4a6.5 6.5 0 0 0-6.5 6.5c0 1.2.3 2.3.9 3.3-.2.5-.4 1.1-.4 1.7 0 1.8 1.3 3.3 3 3.3 1.1 0 2-.6 2.5-1.4.5.8 1.4 1.4 2.5 1.4 1.7 0 3-1.5 3-3.3 0-.6-.2-1.2-.4-1.7.6-1 .9-2.1.9-3.3A6.5 6.5 0 0 0 12 4z"
      fill="currentColor"
      opacity="0.95"
    />
    <path
      d="M9.5 9.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"
      fill="#0b1120"
    />
  </svg>
);

const StatIconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const StatIconMegaphone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 11l18-5v12L3 13v-2z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

const StatIconPulse = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const StatIconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const StatIconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const StatIconDollar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const ActionIconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

const ActionIconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const App = () => {
  const [health, setHealth] = useState<HealthState>({ status: 'idle' });
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [campaignsByClientId, setCampaignsByClientId] = useState<
    Record<number, Campaign[]>
  >({});
  const [campaignsLoadingClientId, setCampaignsLoadingClientId] =
    useState<number | null>(null);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null
  );
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [campaignDetailError, setCampaignDetailError] = useState<string | null>(
    null
  );
  const [campaignDetailLoading, setCampaignDetailLoading] = useState(false);

  const [clientBeingEdited, setClientBeingEdited] = useState<Client | null>(null);
  const [clientEditName, setClientEditName] = useState('');
  const [campaignBeingEdited, setCampaignBeingEdited] = useState<Campaign | null>(
    null
  );
  const [campaignEditName, setCampaignEditName] = useState('');
  const [campaignEditStatus, setCampaignEditStatus] = useState('');
  const [campaignEditType, setCampaignEditType] = useState('');
  const [campaignEditDraftSettings, setCampaignEditDraftSettings] = useState<
    Record<string, unknown>
  >({});
  const [campaignTypes, setCampaignTypes] = useState<CampaignTypeSummary[]>([]);
  const [campaignEditError, setCampaignEditError] = useState<string | null>(
    null
  );

  type DeleteTarget =
    | { type: 'client'; client: Client }
    | { type: 'campaign'; campaign: Campaign }
    | null;

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showCreateCampaignForm, setShowCreateCampaignForm] = useState(false);
  const [smartUploadOpen, setSmartUploadOpen] = useState(false);
  const [importRefreshKey, setImportRefreshKey] = useState(0);

  const [portfolioTotalCount, setPortfolioTotalCount] = useState<number | null>(
    null
  );
  const [portfolioStatsLoading, setPortfolioStatsLoading] = useState(false);
  const [portfolioNeedsAttention, setPortfolioNeedsAttention] = useState<
    number | null
  >(null);
  const [portfolioPerformingWell, setPortfolioPerformingWell] = useState<
    number | null
  >(null);
  const [portfolioBlendedCpa, setPortfolioBlendedCpa] = useState<string | null>(
    null
  );

  /** Full portfolio list from GET /api/campaigns (imports + manual creates) */
  const [allCampaignsList, setAllCampaignsList] = useState<Campaign[]>([]);
  const [allCampaignsLoading, setAllCampaignsLoading] = useState(false);
  const [allCampaignsError, setAllCampaignsError] = useState<string | null>(
    null
  );

  const mainRef = useRef<HTMLElement>(null);
  const [activeNav, setActiveNav] = useState<SidebarNavId>('dashboard');
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>(() => {
    try {
      const v = localStorage.getItem('experienceMode');
      if (v === 'junior' || v === 'senior') return v;
    } catch {
      /* ignore */
    }
    return 'senior';
  });

  useEffect(() => {
    try {
      localStorage.setItem('experienceMode', experienceMode);
    } catch {
      /* ignore */
    }
  }, [experienceMode]);

  useEffect(() => {
    if (selectedCampaignId != null) setActiveNav('campaigns');
  }, [selectedCampaignId]);

  useEffect(() => {
    let isMounted = true;
    setHealth({ status: 'loading' });

    apiClient
      .getHealth()
      .then((data) => {
        if (!isMounted) return;
        setHealth({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setHealth({ status: 'error', error: message });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      setClientsError(null);
      const data = await apiClient.listClients();
      setClients(data);
      if (data.length && selectedClientId == null) {
        const firstId = data[0].id;
        setSelectedClientId(firstId);
        void loadCampaignsForClient(firstId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load clients.';
      setClientsError(message);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .listCampaignTypes()
      .then((res) => {
        if (!cancelled) setCampaignTypes(res.types);
      })
      .catch(() => {
        if (!cancelled) setCampaignTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCampaignsForClient = async (clientId: number) => {
    try {
      setCampaignsLoadingClientId(clientId);
      setCampaignsError(null);
      const data = await apiClient.listCampaignsForClient(clientId);
      setCampaignsByClientId((prev) => ({ ...prev, [clientId]: data }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load campaigns.';
      setCampaignsError(message);
    } finally {
      setCampaignsLoadingClientId(null);
    }
  };

  const loadAllCampaignsList = async () => {
    setAllCampaignsLoading(true);
    setAllCampaignsError(null);
    try {
      const list = await apiClient.listCampaigns();
      setAllCampaignsList(list);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load all campaigns.';
      setAllCampaignsError(message);
      setAllCampaignsList([]);
    } finally {
      setAllCampaignsLoading(false);
    }
  };

  useEffect(() => {
    if (activeNav !== 'campaigns') return;
    void loadAllCampaignsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav]);

  const handleSelectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setSelectedCampaignId(null);
    setSelectedCampaign(null);
    if (!campaignsByClientId[clientId]) {
      void loadCampaignsForClient(clientId);
    }
    setActiveNav((prev) => (prev === 'clients' ? 'clients' : 'campaigns'));
  };

  const handleCampaignCreated = async () => {
    if (selectedClientId != null) {
      await loadCampaignsForClient(selectedClientId);
    }
    void loadPortfolioSnapshot();
    void loadAllCampaignsList();
  };

  const handleClientCreated = async () => {
    await loadClients();
    void loadPortfolioSnapshot();
  };

  const handleSelectCampaign = async (campaignId: number) => {
    setSelectedCampaignId(campaignId);
    setSelectedCampaign(null);
    setCampaignDetailError(null);
    setCampaignDetailLoading(true);

    try {
      const campaign = await apiClient.getCampaignById(campaignId);
      setSelectedCampaign(campaign);
      setSelectedClientId(campaign.clientId);
      void loadCampaignsForClient(campaign.clientId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load campaign detail.';
      setCampaignDetailError(message);
    } finally {
      setCampaignDetailLoading(false);
    }
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const campaignsForSelectedClient: Campaign[] =
    (selectedClientId != null
      ? campaignsByClientId[selectedClientId]
      : undefined) ?? [];

  const getClientName = (clientId: number): string | undefined =>
    clients.find((c) => c.id === clientId)?.name;

  const totalCampaigns = useMemo(
    () =>
      Object.values(campaignsByClientId).reduce(
        (acc, list) => acc + list.length,
        0
      ),
    [campaignsByClientId]
  );

  const activeCampaignsCount = useMemo(
    () =>
      Object.values(campaignsByClientId)
        .flat()
        .filter((c) => /active|enabled|running|live/i.test(c.status ?? ''))
        .length,
    [campaignsByClientId]
  );

  const handleEditClientRequested = (client: Client) => {
    setClientBeingEdited(client);
    setClientEditName(client.name);
  };

  const handleEditCampaignRequested = (campaign: Campaign) => {
    setCampaignEditError(null);
    setCampaignBeingEdited(campaign);
    setCampaignEditName(campaign.name);
    setCampaignEditStatus(campaign.status);
    setCampaignEditType(campaign.type);
    setCampaignEditDraftSettings({});
  };

  useEffect(() => {
    if (!campaignBeingEdited) return;
    let cancelled = false;
    void (async () => {
      try {
        const s = await apiClient.getCampaignSettings(campaignBeingEdited.id);
        if (cancelled) return;
        setCampaignEditType(s.canonicalCampaignType);
        setCampaignEditDraftSettings(
          normalizeSettingsDraftFromApi(
            s.canonicalCampaignType,
            s.settings ?? {}
          )
        );
      } catch {
        if (!cancelled) {
          setCampaignEditDraftSettings({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignBeingEdited]);

  const handleDeleteClientRequested = (client: Client) => {
    setDeleteError(null);
    setDeleteTarget({ type: 'client', client });
  };

  const handleDeleteCampaignRequested = (campaign: Campaign) => {
    setDeleteError(null);
    setDeleteTarget({ type: 'campaign', campaign });
  };

  const handleSubmitClientEdit = async () => {
    if (!clientBeingEdited || !clientEditName.trim()) return;
    try {
      await apiClient.updateClient(clientBeingEdited.id, {
        name: clientEditName.trim(),
      });
      setClientBeingEdited(null);
      setClientEditName('');
      await loadClients();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update client.';
      // eslint-disable-next-line no-alert
      console.error(message);
    }
  };

  const handleSubmitCampaignEdit = async () => {
    if (!campaignBeingEdited || !campaignEditName.trim()) return;
    setCampaignEditError(null);
    try {
      const typeTrim = campaignEditType.trim() || campaignBeingEdited.type;
      const updated = await apiClient.updateCampaign(campaignBeingEdited.id, {
        name: campaignEditName.trim(),
        type: typeTrim,
        status: campaignEditStatus.trim() || campaignBeingEdited.status,
      });
      const settingsPayload = buildSettingsPayloadForType(
        typeTrim,
        campaignEditDraftSettings
      );
      await apiClient.patchCampaignSettings(updated.id, {
        settings: settingsPayload,
        settingsSchemaVersion: CAMPAIGN_SETTINGS_SCHEMA_VERSION,
      });
      setCampaignBeingEdited(null);
      setCampaignEditName('');
      setCampaignEditStatus('');
      setCampaignEditType('');
      setCampaignEditDraftSettings({});
      setSelectedCampaign(updated);
      if (updated.clientId != null) {
        await loadCampaignsForClient(updated.clientId);
      }
      if (selectedCampaignId === updated.id) {
        try {
          const fresh = await apiClient.getCampaignById(updated.id);
          setSelectedCampaign(fresh);
        } catch {
          /* keep updated */
        }
      }
    } catch (err) {
      let message =
        err instanceof Error ? err.message : 'Failed to update campaign.';
      if (err instanceof Error) {
        const jsonStart = err.message.indexOf('{');
        if (jsonStart >= 0) {
          try {
            const body = JSON.parse(err.message.slice(jsonStart)) as {
              details?: string[];
              error?: string;
            };
            if (body.details?.length) message = body.details.join(' ');
            else if (body.error) message = body.error;
          } catch {
            /* keep */
          }
        }
      }
      setCampaignEditError(message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      if (deleteTarget.type === 'client') {
        const clientId = deleteTarget.client.id;
        await apiClient.deleteClient(clientId);
        if (selectedClientId === clientId) {
          setSelectedClientId(null);
          setSelectedCampaignId(null);
          setSelectedCampaign(null);
        }
        await loadClients();
      } else {
        const campaign = deleteTarget.campaign;
        await apiClient.deleteCampaign(campaign.id);
        if (selectedCampaignId === campaign.id) {
          setSelectedCampaignId(null);
          setSelectedCampaign(null);
        }
        await loadCampaignsForClient(campaign.clientId);
        void loadAllCampaignsList();
      }
      setDeleteTarget(null);
      void loadPortfolioSnapshot();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete item.';
      setDeleteError(message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleQuickNewClient = () => {
    exitCampaignToDashboard();
    setActiveNav('clients');
    window.requestAnimationFrame(() => {
      document
        .getElementById('client-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleQuickNewCampaign = () => {
    if (!selectedClientId) return;
    setActiveNav('campaigns');
    setShowCreateCampaignForm(true);
    setTimeout(() => {
      document.getElementById('create-campaign-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  };

  const loadPortfolioSnapshot = async () => {
    setPortfolioStatsLoading(true);
    try {
      const all = await apiClient.listCampaigns();
      setPortfolioTotalCount(all.length);
      if (all.length === 0) {
        setPortfolioNeedsAttention(0);
        setPortfolioPerformingWell(0);
        setPortfolioBlendedCpa(null);
        return;
      }
      const chunkSize = 5;
      let needsAttention = 0;
      let performingWell = 0;
      let totalCost = 0;
      let totalConv = 0;
      for (let i = 0; i < all.length; i += chunkSize) {
        const chunk = all.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(async (campaign) => {
            const [gapsRes, readyRes] = await Promise.all([
              apiClient.getCampaignGaps(campaign.id).catch(() => ({
                gaps: [] as { severity: 'high' | 'medium' | 'low' }[],
              })),
              apiClient.getAnalysisReadiness(campaign.id).catch(() => null),
            ]);
            return { gapsRes, readyRes };
          })
        );
        for (const r of results) {
          const urgent = r.gapsRes.gaps.filter(
            (g) => g.severity === 'high' || g.severity === 'medium'
          ).length;
          if (urgent > 0) needsAttention++;
          if (
            urgent === 0 &&
            r.readyRes &&
            (r.readyRes.sufficiencyLabel === 'STRONG' ||
              r.readyRes.sufficiencyLabel === 'DIRECTIONAL')
          ) {
            performingWell++;
          }
          if (r.readyRes) {
            totalCost += r.readyRes.totals.cost;
            totalConv += r.readyRes.totals.conversions;
          }
        }
      }
      setPortfolioNeedsAttention(needsAttention);
      setPortfolioPerformingWell(performingWell);
      setPortfolioBlendedCpa(
        totalConv > 0 ? `$${(totalCost / totalConv).toFixed(2)}` : null
      );
    } catch {
      setPortfolioTotalCount(null);
      setPortfolioNeedsAttention(null);
      setPortfolioPerformingWell(null);
      setPortfolioBlendedCpa(null);
    } finally {
      setPortfolioStatsLoading(false);
    }
  };

  useEffect(() => {
    void loadPortfolioSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.length]);

  const handleRefresh = () => {
    void loadPortfolioSnapshot();
    void loadClients();
    void loadAllCampaignsList();
    if (selectedClientId != null) {
      void loadCampaignsForClient(selectedClientId);
    }
  };

  const exitCampaignToDashboard = () => {
    setSelectedCampaignId(null);
    setSelectedCampaign(null);
    setCampaignDetailError(null);
  };

  const goDashboard = () => {
    exitCampaignToDashboard();
    setActiveNav('dashboard');
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const goClients = () => {
    exitCampaignToDashboard();
    setActiveNav('clients');
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const goCampaigns = () => {
    setActiveNav('campaigns');
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const goImport = () => {
    setSmartUploadOpen(true);
  };

  const goCompare = () => {
    exitCampaignToDashboard();
    setActiveNav('compare');
    void loadAllCampaignsList();
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const goPortfolioOverview = () => {
    exitCampaignToDashboard();
    setActiveNav('portfolio');
    void loadAllCampaignsList();
    void loadPortfolioSnapshot();
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openCampaignWorkspace = (campaignId: number) => {
    void handleSelectCampaign(campaignId);
    setActiveNav('campaigns');
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const mainTitle = useMemo(() => {
    if (activeNav === 'clients') return 'Clients';
    if (activeNav === 'dashboard') return 'Dashboard';
    if (activeNav === 'portfolio') return 'Portfolio';
    if (activeNav === 'compare') return 'Compare';
    if (selectedCampaign) return selectedCampaign.name;
    return 'Campaigns';
  }, [activeNav, selectedCampaign]);

  const mainSubtitle = useMemo(() => {
    if (activeNav === 'clients') {
      return 'Create and manage advertiser accounts';
    }
    if (activeNav === 'dashboard') {
      return 'Operating book — attention, CPA, and campaign intelligence';
    }
    if (activeNav === 'portfolio') {
      return 'Health and performance across your full book';
    }
    if (activeNav === 'compare') {
      return 'Side-by-side campaign metrics';
    }
    if (selectedCampaign) {
      return `${selectedClient?.name ?? 'Client'} · Campaign intelligence`;
    }
    return 'Browse, import, and analyze campaigns across clients';
  }, [activeNav, selectedCampaign, selectedClient]);

  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon" aria-hidden>
              <BrainLogoIcon />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">Media Buyer</span>
              <span className="sidebar-brand-tagline">AI Brain</span>
            </div>
          </div>
          <div className="sidebar-health">
            {health.status === 'loading' && (
              <span className="pill pill-muted">Checking API…</span>
            )}
            {health.status === 'error' && (
              <span className="pill pill-error">API offline</span>
            )}
            {health.status === 'success' && (
              <span className="pill pill-ok">API {health.data.status}</span>
            )}
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Workspace">
          <div className="sidebar-nav-group">
            <div className="sidebar-nav-label">Workspace</div>
            <button
              type="button"
              className={
                activeNav === 'dashboard'
                  ? 'sidebar-nav-item sidebar-nav-item--active'
                  : 'sidebar-nav-item'
              }
              onClick={goDashboard}
            >
              <span className="sidebar-nav-item__left">
                <NavIconDashboard />
                Dashboard
              </span>
              <NavChevron />
            </button>
            <button
              type="button"
              className={
                activeNav === 'clients'
                  ? 'sidebar-nav-item sidebar-nav-item--active'
                  : 'sidebar-nav-item'
              }
              onClick={goClients}
            >
              <span className="sidebar-nav-item__left">
                <NavIconUsers />
                Clients
              </span>
              <NavChevron />
            </button>
            <button
              type="button"
              className={
                activeNav === 'campaigns'
                  ? 'sidebar-nav-item sidebar-nav-item--active'
                  : 'sidebar-nav-item'
              }
              onClick={goCampaigns}
            >
              <span className="sidebar-nav-item__left">
                <NavIconMegaphone />
                Campaigns
              </span>
              <NavChevron />
            </button>
            <button
              type="button"
              className={
                smartUploadOpen
                  ? 'sidebar-nav-item sidebar-nav-item--active'
                  : 'sidebar-nav-item'
              }
              onClick={goImport}
            >
              <span className="sidebar-nav-item__left">
                <NavIconUpload />
                Import Report
              </span>
              <NavChevron />
            </button>
          </div>
          <div className="sidebar-nav-group">
            <div className="sidebar-nav-label">Intelligence</div>
            <button
              type="button"
              className={
                activeNav === 'compare'
                  ? 'sidebar-nav-item sidebar-nav-item--active'
                  : 'sidebar-nav-item'
              }
              onClick={goCompare}
            >
              <span className="sidebar-nav-item__left">
                <NavIconCompare />
                Compare
              </span>
              <NavChevron />
            </button>
            <button
              type="button"
              className={
                activeNav === 'portfolio'
                  ? 'sidebar-nav-item sidebar-nav-item--active'
                  : 'sidebar-nav-item'
              }
              onClick={goPortfolioOverview}
            >
              <span className="sidebar-nav-item__left">
                <NavIconChart />
                Portfolio
              </span>
              <NavChevron />
            </button>
          </div>
        </nav>

        <div
          className="sidebar-section sidebar-section-scroll sidebar-section--clients"
          id="sidebar-clients"
        >
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Clients</span>
            <div className="sidebar-actions">
              <button
                type="button"
                className="button button-ghost button-xs"
                onClick={handleQuickNewClient}
              >
                + New
              </button>
            </div>
          </div>
          {clientsLoading && (
            <p className="status status-loading">Loading clients…</p>
          )}
          {clientsError && (
            <p className="status status-error">{clientsError}</p>
          )}
          {!clientsLoading && !clientsError && (
            <ClientList
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={handleSelectClient}
              onEditClient={handleEditClientRequested}
              onDeleteClient={handleDeleteClientRequested}
            />
          )}
        </div>

        <div className="sidebar-experience">
          <div className="sidebar-experience-label">Experience mode</div>
          <div className="sidebar-experience-toggle" role="group" aria-label="Experience mode">
            <button
              type="button"
              className={experienceMode === 'junior' ? 'is-on' : ''}
              onClick={() => setExperienceMode('junior')}
            >
              Junior
            </button>
            <button
              type="button"
              className={experienceMode === 'senior' ? 'is-on' : ''}
              onClick={() => setExperienceMode('senior')}
            >
              Senior
            </button>
          </div>
          <p className="sidebar-experience-hint">
            {experienceMode === 'junior'
              ? 'Guided explanations and extra context in the product.'
              : 'Direct analysis, no hand-holding.'}
          </p>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">Y</div>
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">You</span>
            <span className="sidebar-user-role">Media buyer</span>
          </div>
        </div>
      </aside>

      <main ref={mainRef} className="app-main" id="dashboard-main">
        <DemoBanner
          health={health.status === 'success' ? health.data : null}
          onOpenHeroCampaign={() => {
            const hero =
              allCampaignsList.find((c) => c.name === 'Brand Search US') ??
              allCampaignsList[0];
            if (hero) openCampaignWorkspace(hero.id);
            else goCampaigns();
          }}
          onOpenPortfolio={goPortfolioOverview}
        />

        <header className="main-header">
          <div>
            <h1 className="main-title">{mainTitle}</h1>
            <p className="main-subtitle">{mainSubtitle}</p>
          </div>
          <div className="main-header-right main-header-actions">
            <button
              type="button"
              className="button button-ghost button-xs"
              onClick={handleRefresh}
            >
              Refresh
            </button>
            {selectedCampaignId == null && (
              <button
                type="button"
                className="button button-secondary button-xs"
                onClick={goImport}
              >
                Import report
              </button>
            )}
            {(activeNav === 'dashboard' || activeNav === 'campaigns') && (
              <button
                type="button"
                className="button button-cta button-xs"
                onClick={handleQuickNewCampaign}
                disabled={!selectedClientId}
              >
                New Campaign
              </button>
            )}
            {activeNav === 'clients' && (
              <button
                type="button"
                className="button button-primary button-xs"
                onClick={handleQuickNewClient}
              >
                Add client
              </button>
            )}
          </div>
        </header>

        {activeNav === 'dashboard' && (
          <div className="dashboard-page">
            <section
              className="dashboard-section"
              aria-labelledby="dashboard-ops-heading"
            >
              <div className="dashboard-section__head">
                <h2 id="dashboard-ops-heading" className="dashboard-section__title">
                  Operating book
                </h2>
                <p className="dashboard-section__lede">
                  Demo Brand Co. — live readiness, attention flags, and campaign
                  workspaces with seeded AI diagnoses.
                </p>
              </div>
              <div
                className="dashboard-stats"
                aria-label="Portfolio overview"
                id="dashboard-stats"
              >
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-card__top">
                    <span className="dashboard-stat-card__icon" aria-hidden>
                      <StatIconUsers />
                    </span>
                    <span className="dashboard-stat-label">Clients</span>
                  </div>
                  <span className="dashboard-stat-value">{clients.length}</span>
                </div>
                <div className="dashboard-stat-card">
                  <div className="dashboard-stat-card__top">
                    <span className="dashboard-stat-card__icon" aria-hidden>
                      <StatIconMegaphone />
                    </span>
                    <span className="dashboard-stat-label">Campaigns</span>
                  </div>
                  <span className="dashboard-stat-value">
                    {portfolioTotalCount ?? allCampaignsList.length}
                  </span>
                </div>
                <div className="dashboard-stat-card dashboard-stat-card--attention">
                  <div className="dashboard-stat-card__top">
                    <span
                      className="dashboard-stat-card__icon dashboard-stat-card__icon--amber"
                      aria-hidden
                    >
                      <StatIconAlert />
                    </span>
                    <span className="dashboard-stat-label">Needs attention</span>
                  </div>
                  <span className="dashboard-stat-value">
                    {portfolioStatsLoading ? '…' : (portfolioNeedsAttention ?? '—')}
                  </span>
                  <span className="dashboard-stat-sub">Gaps across the book</span>
                </div>
                <div className="dashboard-stat-card dashboard-stat-card--success">
                  <div className="dashboard-stat-card__top">
                    <span
                      className="dashboard-stat-card__icon dashboard-stat-card__icon--green"
                      aria-hidden
                    >
                      <StatIconCheck />
                    </span>
                    <span className="dashboard-stat-label">Performing well</span>
                  </div>
                  <span className="dashboard-stat-value">
                    {portfolioStatsLoading ? '…' : (portfolioPerformingWell ?? '—')}
                  </span>
                  <span className="dashboard-stat-sub">No urgent gaps</span>
                </div>
                <div className="dashboard-stat-card dashboard-stat-card--metric">
                  <div className="dashboard-stat-card__top">
                    <span className="dashboard-stat-card__icon" aria-hidden>
                      <StatIconDollar />
                    </span>
                    <span className="dashboard-stat-label">Blended CPA</span>
                  </div>
                  <span className="dashboard-stat-value">
                    {portfolioStatsLoading ? '…' : (portfolioBlendedCpa ?? '—')}
                  </span>
                  <span className="dashboard-stat-sub">From parsed reports</span>
                </div>
              </div>
            </section>

            <section
              className="dashboard-section"
              aria-labelledby="dashboard-spotlight-heading"
            >
              <div className="dashboard-section__head">
                <h2 id="dashboard-spotlight-heading" className="dashboard-section__title">
                  Feature spotlight
                </h2>
                <p className="dashboard-section__lede">
                  Jump into each campaign type to see the intelligence layer in action.
                </p>
              </div>
              <div className="dashboard-spotlight-grid">
                {[
                  {
                    name: 'Brand Search US',
                    type: 'SEARCH',
                    blurb:
                      'AI diagnosis + negative keyword actions + before/after CPA impact.',
                  },
                  {
                    name: 'Display Remarketing',
                    type: 'DISPLAY',
                    blurb:
                      'Placement blacklist / whitelist memory sourced from AI and manual review.',
                  },
                  {
                    name: 'PMax - Shoes',
                    type: 'PERFORMANCE_MAX',
                    blurb:
                      'Readiness gaps, hold-budget guidance, and type-specific playbook.',
                  },
                ].map((spot) => {
                  const campaign = allCampaignsList.find((c) => c.name === spot.name);
                  return (
                    <button
                      key={spot.name}
                      type="button"
                      className="dashboard-spotlight-card"
                      disabled={!campaign}
                      onClick={() => {
                        if (campaign) openCampaignWorkspace(campaign.id);
                      }}
                    >
                      <span className="dashboard-spotlight-card__type">
                        {spot.type.replace(/_/g, ' ')}
                      </span>
                      <span className="dashboard-spotlight-card__title">{spot.name}</span>
                      <span className="dashboard-spotlight-card__blurb">{spot.blurb}</span>
                      <span className="dashboard-spotlight-card__cta">
                        {campaign ? 'Open workspace →' : 'Loading…'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section
              className="dashboard-section"
              aria-labelledby="dashboard-actions-heading"
            >
              <div className="dashboard-section__head">
                <h2 id="dashboard-actions-heading" className="dashboard-section__title">
                  Quick actions
                </h2>
                <p className="dashboard-section__lede">
                  Import reports, compare campaigns, or review the full portfolio roster.
                </p>
              </div>
              <div className="dashboard-quick-actions" aria-label="Quick actions">
                <button
                  type="button"
                  className="dashboard-action-card"
                  onClick={goImport}
                >
                  <span
                    className="dashboard-action-card__icon dashboard-action-card__icon--cta"
                    aria-hidden
                  >
                    <ActionIconUpload />
                  </span>
                  <span className="dashboard-action-card__title">Import report</span>
                  <span className="dashboard-action-card__desc">
                    CSV wizard with auto type detection
                  </span>
                </button>
                <button
                  type="button"
                  className="dashboard-action-card"
                  onClick={goPortfolioOverview}
                >
                  <span className="dashboard-action-card__icon" aria-hidden>
                    <StatIconPulse />
                  </span>
                  <span className="dashboard-action-card__title">Portfolio</span>
                  <span className="dashboard-action-card__desc">
                    Health table across all campaigns
                  </span>
                </button>
                <button
                  type="button"
                  className="dashboard-action-card"
                  onClick={goCompare}
                >
                  <span className="dashboard-action-card__icon" aria-hidden>
                    <NavIconCompare />
                  </span>
                  <span className="dashboard-action-card__title">Compare</span>
                  <span className="dashboard-action-card__desc">
                    Side-by-side campaign metrics
                  </span>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeNav === 'portfolio' && (
          <PortfolioView
            clientCount={clients.length}
            totalCampaigns={portfolioTotalCount ?? allCampaignsList.length}
            activeCampaigns={activeCampaignsCount}
            needsAttention={portfolioNeedsAttention}
            performingWell={portfolioPerformingWell}
            blendedCpa={portfolioBlendedCpa}
            statsLoading={portfolioStatsLoading}
            campaigns={allCampaignsList}
            campaignsLoading={allCampaignsLoading}
            getClientName={getClientName}
            onOpenCampaign={openCampaignWorkspace}
          />
        )}

        {activeNav === 'compare' && (
          <CampaignCompareView
            campaigns={allCampaignsList}
            campaignsLoading={allCampaignsLoading}
            getClientName={getClientName}
            onOpenCampaign={openCampaignWorkspace}
          />
        )}

        {activeNav === 'clients' && (
          <div className="page-layout">
            <section className="page-section card card-overview" id="page-clients">
              <div className="page-section__head card-header-row">
                <h2 id="page-clients-title" className="page-section__title">
                  All clients
                </h2>
                <span className="pill pill-muted">{clients.length}</span>
              </div>
              <p className="page-section__lede">
                Add advertiser accounts, then select one in the sidebar to manage
                campaigns and imports.
              </p>
              {clientsLoading && (
                <p className="status status-loading">Loading clients…</p>
              )}
              {clientsError && (
                <p className="status status-error">{clientsError}</p>
              )}
              {!clientsLoading && !clientsError && (
                <>
                  <ClientForm onCreated={handleClientCreated} />
                  <div className="main-page-clients-list">
                    <ClientList
                      clients={clients}
                      selectedClientId={selectedClientId}
                      onSelectClient={handleSelectClient}
                      onEditClient={handleEditClientRequested}
                      onDeleteClient={handleDeleteClientRequested}
                    />
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {activeNav === 'campaigns' && (
          <div className="page-layout">
            <section className="page-section card card-overview" id="section-campaigns">
              <div className="page-section__head card-header-row">
                <h2 className="page-section__title">All campaigns</h2>
                <span className="pill pill-muted">
                  {allCampaignsLoading ? '…' : allCampaignsList.length}
                </span>
              </div>
              <p className="page-section__lede main-page-campaigns-lead">
                Campaigns across your clients—including those created from{' '}
                <button
                  type="button"
                  className="button button-ghost button-xs"
                  onClick={goImport}
                >
                  report imports
                </button>
                . Select a card to open intelligence and analysis.
              </p>

              {selectedClientId != null && (
                <div id="create-campaign-section">
                  <CollapsibleSection
                    title="New campaign"
                    subtitle={`Add a campaign for ${selectedClient?.name ?? 'this client'}`}
                    defaultCollapsed={true}
                    collapsed={!showCreateCampaignForm}
                    onCollapsedChange={(c) => setShowCreateCampaignForm(!c)}
                  >
                    <CampaignForm
                      clientId={selectedClientId}
                      onCreated={handleCampaignCreated}
                    />
                  </CollapsibleSection>
                </div>
              )}

              {selectedClientId == null && (
                <p className="main-page-campaigns-account-hint">
                  <button
                    type="button"
                    className="button button-ghost button-xs"
                    onClick={goClients}
                  >
                    Choose a client in the sidebar
                  </button>{' '}
                  to enable &quot;New campaign&quot; for that account.
                </p>
              )}

              {campaignsError && selectedClientId != null && (
                <p className="status status-error">{campaignsError}</p>
              )}
              {allCampaignsError && (
                <p className="status status-error">{allCampaignsError}</p>
              )}
              {allCampaignsLoading && (
                <p className="status status-loading">Loading all campaigns…</p>
              )}
              {!allCampaignsLoading && !allCampaignsError && (
                <CampaignList
                  campaigns={allCampaignsList}
                  selectedCampaignId={selectedCampaignId}
                  onSelectCampaign={handleSelectCampaign}
                  getClientName={getClientName}
                  onEditCampaign={handleEditCampaignRequested}
                  onDeleteCampaign={handleDeleteCampaignRequested}
                  emptyHint="No campaigns yet. Import a Google Ads CSV or add a client and create a campaign."
                />
              )}
            </section>

            {campaignDetailError && (
              <section className="page-section card">
                <h2 className="page-section__title">Campaign detail</h2>
                <p className="status status-error">{campaignDetailError}</p>
              </section>
            )}
            <CampaignDetail
              campaign={selectedCampaign}
              clientName={
                selectedCampaign
                  ? getClientName(selectedCampaign.clientId) ??
                    selectedClient?.name ??
                    null
                  : selectedClient?.name ?? null
              }
              isLoading={campaignDetailLoading}
              onOpenClientImport={() => setSmartUploadOpen(true)}
              externalRefreshKey={importRefreshKey}
              experienceMode={experienceMode}
              onEditCampaign={handleEditCampaignRequested}
              onDeleteCampaign={handleDeleteCampaignRequested}
              onCampaignMetaUpdated={() => {
                if (selectedCampaignId == null) return;
                void (async () => {
                  try {
                    const fresh = await apiClient.getCampaignById(
                      selectedCampaignId
                    );
                    setSelectedCampaign(fresh);
                    await loadCampaignsForClient(fresh.clientId);
                    void loadAllCampaignsList();
                  } catch {
                    /* ignore */
                  }
                })();
              }}
            />
          </div>
        )}

        {clientBeingEdited && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3 className="modal-title">Edit client</h3>
              <div className="stack gap-sm">
                <label className="field">
                  <span className="field-label">Client name</span>
                  <input
                    type="text"
                    value={clientEditName}
                    onChange={(event) => setClientEditName(event.target.value)}
                  />
                </label>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button-ghost button-xs"
                    onClick={() => {
                      setClientBeingEdited(null);
                      setClientEditName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-primary button-xs"
                    onClick={() => void handleSubmitClientEdit()}
                    disabled={!clientEditName.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {campaignBeingEdited && (
          <div className="modal-backdrop">
            <div className="modal modal-wide">
              <h3 className="modal-title">Edit campaign</h3>
              <div className="stack gap-sm">
                <label className="field">
                  <span className="field-label">Name</span>
                  <input
                    type="text"
                    value={campaignEditName}
                    onChange={(event) => setCampaignEditName(event.target.value)}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span className="field-label">Campaign type</span>
                    {campaignTypes.length > 0 ? (
                      <select
                        value={campaignEditType}
                        onChange={(event) => {
                          setCampaignEditType(event.target.value);
                          setCampaignEditDraftSettings({});
                        }}
                      >
                        {campaignTypes.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.label} ({t.code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={campaignEditType}
                        onChange={(event) => {
                          setCampaignEditType(event.target.value);
                          setCampaignEditDraftSettings({});
                        }}
                        placeholder={campaignBeingEdited.type}
                      />
                    )}
                  </label>
                  <label className="field">
                    <span className="field-label">Status</span>
                    <input
                      type="text"
                      value={campaignEditStatus}
                      onChange={(event) =>
                        setCampaignEditStatus(event.target.value)
                      }
                      placeholder={campaignBeingEdited.status}
                    />
                  </label>
                </div>
                <div className="stack gap-sm">
                  <span className="field-label">Type-specific settings</span>
                  <p className="insight-secondary">
                    Validated against the selected campaign type when you save.
                  </p>
                  <CampaignTypeSettingsForm
                    campaignType={campaignEditType}
                    value={campaignEditDraftSettings}
                    onChange={setCampaignEditDraftSettings}
                    idPrefix={`edit-${campaignBeingEdited.id}`}
                  />
                </div>
                {campaignEditError && (
                  <p className="status status-error">{campaignEditError}</p>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button-ghost button-xs"
                    onClick={() => {
                      setCampaignBeingEdited(null);
                      setCampaignEditName('');
                      setCampaignEditStatus('');
                      setCampaignEditType('');
                      setCampaignEditDraftSettings({});
                      setCampaignEditError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-primary button-xs"
                    onClick={() => void handleSubmitCampaignEdit()}
                    disabled={!campaignEditName.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3 className="modal-title">Confirm delete</h3>
              <p className="modal-body">
                {deleteTarget.type === 'client'
                  ? `Delete client "${deleteTarget.client.name}" and all of its campaigns?`
                  : `Delete campaign "${deleteTarget.campaign.name}"? This will remove its history and AI context.`}
              </p>
              {deleteError && (
                <p className="status status-error">{deleteError}</p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-ghost button-xs"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-danger button-xs"
                  onClick={() => void handleConfirmDelete()}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        <SmartReportUploadWizard
          isOpen={smartUploadOpen}
          onClose={() => {
            setSmartUploadOpen(false);
            void loadAllCampaignsList();
            if (selectedClientId != null) {
              void loadCampaignsForClient(selectedClientId);
            }
            setImportRefreshKey((k) => k + 1);
            void loadPortfolioSnapshot();
          }}
          clientId={selectedClientId}
          clientName={selectedClient?.name ?? null}
          campaignsForClient={campaignsForSelectedClient.map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          experienceMode={experienceMode}
        />
      </main>
    </div>
  );
};

