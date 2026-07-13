import type { ReportType } from '../lib/reportTypeCodes';
import {
  CANONICAL_CAMPAIGN_TYPE_CODES,
  type CampaignTypeRegistryEntry,
  type CanonicalCampaignTypeCode,
} from './types';

const rt = <T extends ReportType[]>(x: T): T => x;

const SEARCH_ENTRY: CampaignTypeRegistryEntry = {
  code: 'SEARCH',
  label: 'Search',
  description:
    'Keyword and query-driven campaigns on the Search Network. Optimization centers on intent, match types, negatives, and query-to-keyword alignment.',
  importantReportTypes: rt(['SEARCH_TERMS', 'KEYWORDS', 'DEVICE', 'CAMPAIGN']),
  recommendedReportTypes: rt([
    'SEARCH_TERMS',
    'KEYWORDS',
    'DEVICE',
    'CAMPAIGN',
    'AD_SCHEDULE',
    'GEOGRAPHIC',
  ]),
  defaultObjectives: ['Leads / CPA', 'Revenue / ROAS', 'Traffic with guardrails'],
  optimizationPriorities: [
    'Negatives / exclusions (query intent hygiene)',
    'Keyword cleanup and match-type tightening',
    'Query-to-keyword alignment',
    'Device efficiency tuning',
  ],
  specialWarnings: [
    'Search campaigns benefit most from query/keyword-level reports. Without them, recommendations should be conservative.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'search-launch-1',
        phase: 'launch',
        label: 'Define campaign objective (CPA, ROAS, or traffic)',
        detail:
          'What: Pick the primary success metric before structuring keywords. Where: Campaign settings → Goals, or note in your media plan. Do: Align budget and bidding to that objective.',
      },
      {
        id: 'search-launch-2',
        phase: 'launch',
        label: 'Structure brand vs non-brand campaigns',
        detail:
          'What: Separate brand intent from generic queries. Where: Campaigns & ad groups (often separate campaigns). Do: Keep brand in its own campaign for budget and reporting control.',
      },
      {
        id: 'search-launch-3',
        phase: 'launch',
        label: 'Set bidding strategy',
        detail:
          'What: Automated or manual bidding aligned to your goal. Where: Campaign settings → Bidding. Do: Choose e.g. Maximize conversions, Target CPA, or Target ROAS and set sensible targets.',
      },
      {
        id: 'search-launch-4',
        phase: 'launch',
        label: 'Ensure conversion tracking is working',
        detail:
          'What: Conversions fire for the actions you optimize to. Where: Tools → Conversions + your site/GTM. Do: Test key URLs and fix broken tags before scaling spend.',
      },
    ],
    optimization: [
      {
        id: 'search-opt-1',
        phase: 'optimization',
        label: 'Upload search terms report',
        detail:
          'What: See actual queries that triggered ads. Where: Reports → Search terms (or export). Do: Schedule regular exports into this product for mining and negatives.',
      },
      {
        id: 'search-opt-2',
        phase: 'optimization',
        label: 'Add negative keywords from search terms',
        detail:
          'What: Block irrelevant queries. Where: Ad group or campaign → Negative keywords. Do: Add phrase/exact negatives for waste themes; document match type.',
      },
      {
        id: 'search-opt-3',
        phase: 'optimization',
        label: 'Review keyword performance and match types',
        detail:
          'What: Pause, tighten, or split terms with weak CPA/ROAS. Where: Keywords tab + search terms. Do: Move high performers to exact; reduce bleed from broad match where needed.',
      },
      {
        id: 'search-opt-4',
        phase: 'optimization',
        label: 'Adjust bids by device and location',
        detail:
          'What: Shift spend toward efficient devices and regions. Where: Campaign → Locations, Devices (or bid adjustments in legacy flows). Do: Use report data to set % bid modifiers.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'SEARCH_TERMS and KEYWORDS are highest leverage; DEVICE and CAMPAIGN provide efficiency and aggregate context.',
    missingReportSeverity: {
      strongWarnings: [
        'Without SEARCH_TERMS, query intent and negative recommendations are severely limited.',
        'Without KEYWORDS, match-type and keyword cleanup guidance is limited.',
      ],
      moderateWarnings: [
        'Without DEVICE, device bid tuning is weaker.',
        'Without CAMPAIGN, aggregate pacing and efficiency framing is thinner.',
      ],
    },
    aiPlaybookGuidance: [
      'Prioritize negatives and query intent mismatches using SEARCH_TERMS.',
      'Recommend keyword cleanup (match types, pausing, splitting) using KEYWORDS.',
      'Call out device inefficiency when DEVICE data supports it.',
      'Be specific; avoid generic “improve ads” advice.',
    ],
  },
  minimumRecommendedCoverage: { directional: 2, strong: 3 },
  missingReportGuidance: {
    SEARCH_TERMS:
      'Upload a Search terms report (Reports → Search terms) to mine negatives and match queries to keywords.',
    KEYWORDS:
      'Upload a Keywords report to review match types, pause/split terms, and align bids with performance.',
    DEVICE:
      'Upload a Device report to set device bid adjustments under Campaign → Devices.',
    CAMPAIGN:
      'Upload a Campaign report for aggregate spend, CPA/ROAS, and budget pacing vs goal.',
  },
  aiInstructions: [
    'Use SEARCH_TERMS to recommend negative keywords and query-to-keyword fixes with concrete terms.',
    'Use KEYWORDS to recommend pausing, match-type changes, or splitting ad groups when data supports it.',
    'Use DEVICE and GEOGRAPHIC reports to suggest bid modifiers with segment-level evidence.',
    'Avoid generic copy advice; tie actions to Google Ads screens (Keywords, Negatives, Bidding, Devices).',
  ],
};

const DISPLAY_ENTRY: CampaignTypeRegistryEntry = {
  code: 'DISPLAY',
  label: 'Display',
  description:
    'Visual campaigns across Display inventory. Placement quality, audiences, and creative readiness drive outcomes.',
  importantReportTypes: rt([
    'PLACEMENT',
    'DEVICE',
    'AUDIENCE',
    'DEMOGRAPHICS',
    'GEOGRAPHIC',
    'CAMPAIGN',
  ]),
  recommendedReportTypes: rt([
    'PLACEMENT',
    'AUDIENCE',
    'DEVICE',
    'DEMOGRAPHICS',
    'GEOGRAPHIC',
    'CAMPAIGN',
    'AD_SCHEDULE',
  ]),
  defaultObjectives: ['Awareness + conversions', 'Remarketing efficiency', 'Prospecting with guardrails'],
  optimizationPriorities: [
    'Placement exclusions and managed placements (blacklist / allowlist)',
    'Audience segment performance (targeting vs observation + exclusions)',
    'Demographic and geographic bid adjustments',
    'Creative coverage and frequency management',
  ],
  specialWarnings: [
    'Display optimization depends on placement and audience reports. Without PLACEMENT, URL-level exclusions and waste calls are limited.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'disp-launch-1',
        phase: 'launch',
        label: 'Select audience mode (Targeting vs Observation)',
        detail:
          'What: Decide whether each audience restricts who sees ads (Targeting) or only informs bidding (Observation). Where: Audiences section on the campaign or ad group. Do: Set mode per list; use Targeting to narrow, Observation to monitor and adjust bids.',
      },
      {
        id: 'disp-launch-2',
        phase: 'launch',
        label: 'Add at least one audience source (data segments, in-market, or custom segments)',
        detail:
          'What: First-party lists, in-market, affinity, or custom segments. Where: Tools → Audience Manager + campaign Audiences. Do: Attach relevant segments; avoid empty audience targeting.',
      },
      {
        id: 'disp-launch-3',
        phase: 'launch',
        label: 'Review demographic targeting and exclusions',
        detail:
          'What: Age, gender, household income where available. Where: Demographics → each segment can be targeted, excluded, or bid-adjusted. Do: Exclude or down-bid segments that clearly don’t fit your offer.',
      },
      {
        id: 'disp-launch-4',
        phase: 'launch',
        label: 'Define placement exclusion policy',
        detail:
          'What: Rules for excluding apps, sites, or categories. Where: Content exclusions, placements, or account-level placement exclusions. Do: Document what to block (e.g. mobile apps, sensitive categories) and when to add URL exclusions.',
      },
      {
        id: 'disp-launch-5',
        phase: 'launch',
        label: 'Ensure conversion tracking is working',
        detail:
          'What: Conversions for primary goals fire correctly. Where: Tools → Conversions + your tag setup. Do: Verify web/app events before relying on CPA/ROAS bidding.',
      },
    ],
    optimization: [
      {
        id: 'disp-opt-1',
        phase: 'optimization',
        label: 'Upload and review placement report',
        detail:
          'What: See where ads showed (sites, apps, YouTube). Where: Reports → Placements (or export). Do: Import here so waste and winners can be surfaced.',
      },
      {
        id: 'disp-opt-2',
        phase: 'optimization',
        label: 'Create/update placement blacklist based on performance',
        detail:
          'What: Exclude URLs or apps that waste spend. Where: Placements → Exclude placement, or account-level lists. Do: Add repeat offenders; consider managed placements for scale.',
      },
      {
        id: 'disp-opt-3',
        phase: 'optimization',
        label: 'Exclude low-performing audience segments',
        detail:
          'What: Remove or exclude segments with poor CPA/ROAS. Where: Audiences → edit segment membership or exclusions. Do: Down-bid or exclude before adding new reach.',
      },
      {
        id: 'disp-opt-4',
        phase: 'optimization',
        label: 'Adjust bids for strong/weak demographics or geos',
        detail:
          'What: Shift spend toward efficient age/gender/geo slices. Where: Demographics → Bid adjustment; Locations → Bid adjustment. Do: Apply % modifiers from report data.',
      },
      {
        id: 'disp-opt-5',
        phase: 'optimization',
        label: 'Review frequency and refresh creatives if needed',
        detail:
          'What: Avoid fatigue and high cost per result. Where: Campaign settings (frequency cap where available), and Ads & assets. Do: Rotate creatives when CTR/CVR drops.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'PLACEMENT and AUDIENCE are core; DEMOGRAPHICS and GEOGRAPHIC refine targeting; CAMPAIGN anchors efficiency.',
    missingReportSeverity: {
      strongWarnings: [
        'Missing PLACEMENT: placement waste and whitelist opportunities are hard to defend.',
      ],
      moderateWarnings: [
        'Missing AUDIENCE: audience tightening recommendations are limited.',
        'Missing DEMOGRAPHICS or GEOGRAPHIC: segment-level tuning is weaker.',
      ],
    },
    aiPlaybookGuidance: [
      'Prioritize placement exclusions and waste reduction using PLACEMENT.',
      'Identify strong placements for whitelisting when applicable.',
      'Recommend audience tightening and weak demographic segments when data supports it.',
    ],
  },
  minimumRecommendedCoverage: { directional: 2, strong: 4 },
  missingReportGuidance: {
    PLACEMENT:
      'Upload a Placement report (where ads showed) to add URL/app exclusions and managed placements.',
    AUDIENCE:
      'Upload an Audience report to exclude or down-bid low-performing segments in Audience settings.',
    DEMOGRAPHICS:
      'Upload a Demographics report to set bid adjustments or exclusions under Demographics.',
    GEOGRAPHIC:
      'Upload a Geographic report to adjust location bid modifiers or exclude regions.',
    DEVICE: 'Upload a Device report to set mobile/desktop/tablet bid adjustments.',
    CAMPAIGN:
      'Upload a Campaign report for aggregate spend, CPA/ROAS, and budget vs goal.',
  },
  aiInstructions: [
    'Use PLACEMENT to recommend specific URL/app exclusions and managed placements users can add in Google Ads.',
    'Use AUDIENCE/DEMOGRAPHICS/GEOGRAPHIC to recommend exclusions or bid adjustments with named segments.',
    'Reference Observation vs Targeting and placement exclusion lists when explaining audience actions.',
    'Avoid vague “strategy” language; tie each action to a Google Ads surface (Audiences, Placements, Demographics).',
  ],
};

const PERFORMANCE_MAX_ENTRY: CampaignTypeRegistryEntry = {
  code: 'PERFORMANCE_MAX',
  label: 'Performance Max',
  description:
    'Goal-based automation across Google inventory. Signals, assets, and feeds matter more than granular manual levers.',
  importantReportTypes: rt(['CAMPAIGN', 'DEVICE', 'AUDIENCE', 'GEOGRAPHIC']),
  recommendedReportTypes: rt([
    'CAMPAIGN',
    'DEVICE',
    'AUDIENCE',
    'GEOGRAPHIC',
    'SEARCH_TERMS',
    'PLACEMENT',
  ]),
  defaultObjectives: ['Maximize conversion value', 'Target CPA', 'Lead volume with efficiency'],
  optimizationPriorities: [
    'Campaign goal and budget vs asset group performance',
    'Audience signals and listing group / feed coverage',
    'Device and geographic bid adjustments from reports',
    'Creative and asset coverage in asset groups',
  ],
  specialWarnings: [
    'Performance Max has fewer manual levers than Search/Display. Prefer asset groups, signals, feeds, and bid targets over granular manual controls.',
    'Use SEARCH_TERMS only when that report exists; do not claim query-level insights without data.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'pmax-launch-1',
        phase: 'launch',
        label: 'Define campaign goal (leads, sales, ROAS)',
        detail:
          'What: Pick the business outcome (leads, purchases, revenue). Where: Campaign settings + Bidding (Target CPA, Target ROAS, etc.). Do: Match conversion actions to that goal.',
      },
      {
        id: 'pmax-launch-2',
        phase: 'launch',
        label: 'Ensure asset groups are created',
        detail:
          'What: At least one asset group with themed assets. Where: Campaign → Asset groups. Do: Split themes (products, services, regions) so reporting and signals stay clear.',
      },
      {
        id: 'pmax-launch-3',
        phase: 'launch',
        label: 'Attach product feed (if ecommerce)',
        detail:
          'What: Merchant Center feed for Shopping surfaces in PMax. Where: Tools → Linked accounts → Merchant Center. Do: Fix feed errors and disapprovals before scaling.',
      },
      {
        id: 'pmax-launch-4',
        phase: 'launch',
        label: 'Add audience signals',
        detail:
          'What: Customer lists, custom segments, search themes to guide machine learning. Where: Campaign → Asset group → Signals. Do: Add high-intent signals; avoid empty signal sets.',
      },
      {
        id: 'pmax-launch-5',
        phase: 'launch',
        label: 'Ensure conversion tracking is working',
        detail:
          'What: Primary conversions for bidding. Where: Tools → Conversions + your tags. Do: Validate key events and values for ROAS/CPA targets.',
      },
    ],
    optimization: [
      {
        id: 'pmax-opt-1',
        phase: 'optimization',
        label: 'Review campaign-level performance trends',
        detail:
          'What: Spend, CPA/ROAS, conv. value over time. Where: Campaign overview + Reports. Do: Compare to targets and adjust budget or targets before micro-managing assets.',
      },
      {
        id: 'pmax-opt-2',
        phase: 'optimization',
        label: 'Check asset group coverage',
        detail:
          'What: Weak asset groups or missing assets. Where: Asset groups → View asset strength. Do: Add headlines, images, logos, and URLs to reach “Good” coverage where possible.',
      },
      {
        id: 'pmax-opt-3',
        phase: 'optimization',
        label: 'Adjust audience signals if weak',
        detail:
          'What: Replace or add signals when learning is slow or CPA/ROAS is poor. Where: Asset group → Signals. Do: Add customer lists, search themes, or custom intent segments.',
      },
      {
        id: 'pmax-opt-4',
        phase: 'optimization',
        label: 'Use additional reports (device, geo) if available',
        detail:
          'What: Slice performance by device or location. Where: Reports → Predefined reports (Device, Geographic). Do: Apply account-level or campaign-level exclusions if supported by your setup.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'CAMPAIGN and DEVICE/GEOGRAPHIC/AUDIENCE provide signal-level patterns; optional SEARCH_TERMS only when present.',
    missingReportSeverity: {
      strongWarnings: [
        'Missing CAMPAIGN: cannot anchor efficiency, pacing, or goal alignment.',
      ],
      moderateWarnings: [
        'Missing AUDIENCE: weaker guidance on signals and exclusions.',
        'Missing GEOGRAPHIC or DEVICE: location/device patterns under-explained.',
      ],
    },
    aiPlaybookGuidance: [
      'Be cautious with direct-control recommendations; prefer structural, asset, and signal guidance.',
      'Only reference SEARCH_TERMS if present; otherwise avoid query-level claims.',
      'Emphasize goal alignment (CPA/ROAS), budget pacing, and audience/device/geographic patterns.',
    ],
  },
  minimumRecommendedCoverage: { directional: 2, strong: 3 },
  missingReportGuidance: {
    CAMPAIGN:
      'Upload a Campaign report for spend, conversions, CPA/ROAS, and budget vs goal.',
    AUDIENCE:
      'Audience signals and audience reporting help—add signals in asset groups and upload Audience reports when available.',
    DEVICE:
      'Upload a Device report to see mobile/desktop/tablet performance and adjust exclusions or budgets if needed.',
    GEOGRAPHIC:
      'Upload a Geographic report to adjust location targeting or exclusions.',
    SEARCH_TERMS:
      'SEARCH_TERMS may be missing in PMax—when absent, avoid query-level recommendations; use campaign/asset group and device/geo reports.',
  },
  aiInstructions: [
    'Recommend asset group edits, signal changes, and feed fixes—not vague “strategy.” Point to Merchant Center for feed errors and asset groups for creative gaps.',
    'Only reference SEARCH_TERMS when present; otherwise focus on campaign trends, device/geo, and asset coverage.',
    'Tie actions to Google Ads UI: asset groups, Signals, Bidding, Conversions, and linked Merchant Center.',
  ],
};

const VIDEO_ENTRY: CampaignTypeRegistryEntry = {
  code: 'VIDEO',
  label: 'Video',
  description:
    'YouTube and video partners campaigns. Creative, placements, audiences, and schedules drive efficiency.',
  importantReportTypes: rt(['PLACEMENT', 'DEVICE', 'AUDIENCE', 'AD_SCHEDULE', 'CAMPAIGN']),
  recommendedReportTypes: rt([
    'PLACEMENT',
    'DEVICE',
    'AUDIENCE',
    'AD_SCHEDULE',
    'CAMPAIGN',
    'DEMOGRAPHICS',
    'GEOGRAPHIC',
  ]),
  defaultObjectives: ['Reach + consideration', 'Conversions from video', 'Efficient CPV/CPA'],
  optimizationPriorities: [
    'Placement/channel inefficiency (exclusions)',
    'Audience and device patterns',
    'Ad schedule performance patterns',
  ],
  specialWarnings: [
    'Video performance is often channel/placement-driven. Without PLACEMENT, channel waste identification is limited.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'vid-launch-1',
        phase: 'launch',
        label: 'Upload video assets that meet specs (length, resolution, safe zones)',
        detail:
          'What: Files pass policy and render well on TV, mobile, desktop. Where: Ads & assets → Videos. Do: Fix disapprovals; use strong first 5 seconds.',
      },
      {
        id: 'vid-launch-2',
        phase: 'launch',
        label: 'Choose audience segments (remarketing, in-market, custom intent)',
        detail:
          'What: Who should see the ads by funnel stage. Where: Audiences on the campaign. Do: Add lists or intent segments; set Targeting vs Observation as needed.',
      },
      {
        id: 'vid-launch-3',
        phase: 'launch',
        label: 'Select video formats (in-stream, in-feed, Shorts, bumper)',
        detail:
          'What: Formats match your creative and goal (reach vs action). Where: Campaign creation → Networks / video campaign types. Do: Align CTA and landing page to format.',
      },
      {
        id: 'vid-launch-4',
        phase: 'launch',
        label: 'Set ad schedule and frequency caps where available',
        detail:
          'What: Control when ads run and how often users see them. Where: Ad schedule; frequency caps in eligible campaign types. Do: Start conservative; expand after baseline CPA/CPV.',
      },
    ],
    optimization: [
      {
        id: 'vid-opt-1',
        phase: 'optimization',
        label: 'Exclude wasteful placements using the placement report',
        detail:
          'What: Channels, videos, or apps wasting spend. Where: Reports → Placements → Exclude. Do: Block repeat offenders; consider managed placements for proven winners.',
      },
      {
        id: 'vid-opt-2',
        phase: 'optimization',
        label: 'Exclude or down-bid weak audience segments',
        detail:
          'What: Segments with poor view rate, CPA, or CPV. Where: Audiences → adjust or exclude. Do: Narrow before increasing budget.',
      },
      {
        id: 'vid-opt-3',
        phase: 'optimization',
        label: 'Adjust dayparting from ad schedule report',
        detail:
          'What: Hours/days with weak performance. Where: Reports → Time / Ad schedule. Do: Reduce bids or pause poor windows.',
      },
      {
        id: 'vid-opt-4',
        phase: 'optimization',
        label: 'Refresh creatives when fatigue appears',
        detail:
          'What: CTR/VR drops over time. Where: Ads & assets. Do: Swap in new cuts or hooks; keep best performers as variants.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'PLACEMENT unlocks channel waste; AUDIENCE/DEVICE/AD_SCHEDULE refine who and when; CAMPAIGN anchors goals.',
    missingReportSeverity: {
      strongWarnings: [
        'Missing PLACEMENT: channel/placement exclusions and scale calls are limited.',
      ],
      moderateWarnings: [
        'Missing AD_SCHEDULE: schedule optimization is limited.',
        'Missing AUDIENCE or DEVICE: pattern insights are thinner.',
      ],
    },
    aiPlaybookGuidance: [
      'Prioritize channel/placement exclusions when PLACEMENT indicates waste.',
      'Highlight audience/device patterns and recommend tightening when evidence supports it.',
      'Use AD_SCHEDULE patterns to suggest scheduling adjustments when applicable.',
    ],
  },
  minimumRecommendedCoverage: { directional: 2, strong: 3 },
  missingReportGuidance: {
    PLACEMENT:
      'Upload a Placement report to exclude specific YouTube videos/channels or apps from Placements.',
    AUDIENCE:
      'Upload an Audience report to exclude or adjust segments under Audiences.',
    DEVICE:
      'Upload a Device report to change device bid adjustments or shift budget.',
    AD_SCHEDULE:
      'Upload an Ad schedule or time report to set hour/day bid adjustments.',
    CAMPAIGN:
      'Upload a Campaign report for aggregate CPA/CPV/ROAS and budget pacing.',
  },
  aiInstructions: [
    'Use PLACEMENT to name specific channels/URLs to exclude in Google Ads.',
    'Use AUDIENCE/DEVICE/AD_SCHEDULE to recommend exclusions or bid modifiers with evidence.',
    'Avoid vague creative advice; tie recommendations to placements, audiences, and schedules users can edit in the UI.',
  ],
};

const SHOPPING_ENTRY: CampaignTypeRegistryEntry = {
  code: 'SHOPPING',
  label: 'Shopping',
  description:
    'Product listing and feed-driven campaigns. Feed health, segmentation, and value/ROAS setup are critical.',
  importantReportTypes: rt(['CAMPAIGN', 'DEVICE', 'GEOGRAPHIC']),
  recommendedReportTypes: rt([
    'CAMPAIGN',
    'DEVICE',
    'GEOGRAPHIC',
    'SEARCH_TERMS',
    'AUDIENCE',
  ]),
  defaultObjectives: ['Target ROAS', 'Target CPA on purchases', 'Revenue scale'],
  optimizationPriorities: [
    'Aggregate efficiency and goal alignment',
    'Device and geographic trends',
    'Search term insights when present',
  ],
  specialWarnings: [
    'Shopping insights are strongest with product/feed-level data; if unavailable, focus on campaign/device/geographic trends and query-level signals when present.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'shop-launch-1',
        phase: 'launch',
        label: 'Link Merchant Center and resolve feed errors',
        detail:
          'What: Products are approved and eligible to serve. Where: Merchant Center → Diagnostics; linked in Google Ads. Do: Fix item-level errors and policy issues before scaling.',
      },
      {
        id: 'shop-launch-2',
        phase: 'launch',
        label: 'Set campaign priority and product scope (listing groups / filters)',
        detail:
          'What: Which SKUs this campaign promotes vs other Shopping/PMax. Where: Shopping campaign → Product groups / listing groups. Do: Split brand vs generic or margin tiers if needed.',
      },
      {
        id: 'shop-launch-3',
        phase: 'launch',
        label: 'Configure conversion value and bidding (Target ROAS / CPA)',
        detail:
          'What: Bidding matches revenue or order value. Where: Campaign → Bidding; Tools → Conversions. Do: Ensure transaction values are passed for Smart Bidding.',
      },
      {
        id: 'shop-launch-4',
        phase: 'launch',
        label: 'Use custom labels and custom parameters for segmentation',
        detail:
          'What: Feed columns for margin, season, bestseller. Where: Merchant Center feed + campaign product filters. Do: Drive listing groups or rules from these fields.',
      },
    ],
    optimization: [
      {
        id: 'shop-opt-1',
        phase: 'optimization',
        label: 'Review search terms report and add negative keywords',
        detail:
          'What: Queries that don’t match product intent. Where: Reports → Search terms (Shopping). Do: Add negatives at campaign or account level.',
      },
      {
        id: 'shop-opt-2',
        phase: 'optimization',
        label: 'Apply device and location bid adjustments',
        detail:
          'What: Shift spend to efficient devices and regions. Where: Devices, Locations, bid adjustments. Do: Use report data to set % modifiers.',
      },
      {
        id: 'shop-opt-3',
        phase: 'optimization',
        label: 'Monitor feed freshness and disapprovals',
        detail:
          'What: Broken items stop serving. Where: Merchant Center Diagnostics. Do: Fix price/stock/availability updates daily or weekly.',
      },
      {
        id: 'shop-opt-4',
        phase: 'optimization',
        label: 'Resolve overlap with Performance Max or Search Shopping',
        detail:
          'What: Same products in multiple campaigns inflate CPCs. Where: Campaign priorities, negative keyword lists, or PMax exclusions. Do: Document which campaign owns which segment.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'CAMPAIGN, DEVICE, and GEOGRAPHIC anchor efficiency; SEARCH_TERMS adds query demand when available.',
    missingReportSeverity: {
      strongWarnings: [
        'Missing CAMPAIGN: cannot anchor ROAS/CPA or budget pacing.',
      ],
      moderateWarnings: [
        'Missing SEARCH_TERMS: query-level demand and negatives are weaker.',
        'Missing DEVICE or GEOGRAPHIC: trend explanations are thinner.',
      ],
    },
    aiPlaybookGuidance: [
      'Focus on goal alignment (CPA/ROAS) and budget pacing at the campaign level.',
      'Surface device and geographic inefficiencies and improvement opportunities.',
      'Only use SEARCH_TERMS for demand insights if present.',
    ],
  },
  minimumRecommendedCoverage: { directional: 2, strong: 3 },
  missingReportGuidance: {
    CAMPAIGN:
      'Upload a Campaign report for Shopping performance vs ROAS/CPA targets.',
    DEVICE:
      'Upload a Device report to set device bid adjustments.',
    GEOGRAPHIC:
      'Upload a Geographic report to adjust location bid modifiers or exclusions.',
    SEARCH_TERMS:
      'Upload Search terms to add negatives for irrelevant queries.',
  },
  aiInstructions: [
    'Prioritize Merchant Center feed health, listing groups, and negatives from search terms.',
    'Recommend device/geo bid modifiers from reports; avoid vague “optimize Shopping” without a lever.',
    'Call out campaign overlap with PMax when users should change priority or exclusions.',
  ],
};

const APP_ENTRY: CampaignTypeRegistryEntry = {
  code: 'APP',
  label: 'App',
  description:
    'App promotion campaigns across Search, Display, YouTube, and partners. Install and in-app events require solid MMP/Firebase linkage.',
  importantReportTypes: rt(['CAMPAIGN', 'DEVICE', 'GEOGRAPHIC', 'AUDIENCE']),
  recommendedReportTypes: rt([
    'CAMPAIGN',
    'DEVICE',
    'GEOGRAPHIC',
    'AUDIENCE',
    'PLACEMENT',
    'AD_SCHEDULE',
  ]),
  defaultObjectives: ['Install volume', 'In-app actions (CPA)', 'ROAS on IAP / subscriptions'],
  optimizationPriorities: [
    'Event tracking completeness and goal alignment',
    'Geo and device efficiency',
    'Audience signal quality',
    'Creative / asset iteration',
  ],
  specialWarnings: [
    'App campaigns rely on accurate install and post-install events; weak event mapping produces misleading AI guidance.',
    'Placement detail may be limited depending on inventory — use CAMPAIGN and DEVICE/GEO as anchors.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'app-launch-1',
        phase: 'launch',
        label: 'Select app platform and link to correct store listing',
        detail:
          'What: iOS or Android app selected. Where: Campaign setup → App; App store links. Do: Match bundle ID / package name to avoid wrong installs.',
      },
      {
        id: 'app-launch-2',
        phase: 'launch',
        label: 'Install and in-app events firing in Firebase or your MMP',
        detail:
          'What: First open, purchase, registration, etc. Where: Firebase / AppsFlyer / Adjust → linked in Google Ads. Do: Map events to conversion actions in Google Ads.',
      },
      {
        id: 'app-launch-3',
        phase: 'launch',
        label: 'Choose bidding goal (installs vs in-app action)',
        detail:
          'What: CPI vs tCPA on events. Where: Campaign → Bidding. Do: Pick the conversion action that matches business value.',
      },
      {
        id: 'app-launch-4',
        phase: 'launch',
        label: 'Add audience signals (similar users, engaged users, customer lists)',
        detail:
          'What: Seeds for UAC/App discovery. Where: Campaign → Audiences / signals. Do: Upload first-party lists where allowed.',
      },
    ],
    optimization: [
      {
        id: 'app-opt-1',
        phase: 'optimization',
        label: 'Reconcile conversions after OS or SDK updates',
        detail:
          'What: Missing events break bidding. Where: MMP/Firebase + Google Ads Conversions. Do: Test key flows after each release.',
      },
      {
        id: 'app-opt-2',
        phase: 'optimization',
        label: 'Adjust geo and device bid modifiers vs CPI/CPA',
        detail:
          'What: Regions or devices wasting budget. Where: Locations, Devices. Do: Exclude or down-bid with report evidence.',
      },
      {
        id: 'app-opt-3',
        phase: 'optimization',
        label: 'Refresh creative based on fatigue (CTR, IPM)',
        detail:
          'What: Asset exhaustion. Where: Assets → performance. Do: Upload new videos/images; keep winners running.',
      },
      {
        id: 'app-opt-4',
        phase: 'optimization',
        label: 'Review iOS SKAdNetwork and modeled conversions',
        detail:
          'What: Partial data on iOS. Where: Google Ads reporting + MMP SKAN view. Do: Set expectations on CPA; avoid over-optimizing to noisy slices.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'CAMPAIGN plus DEVICE, GEOGRAPHIC, and AUDIENCE reports support efficiency and signal tuning.',
    missingReportSeverity: {
      strongWarnings: [
        'Missing CAMPAIGN: cannot judge install/action efficiency at accountable level.',
      ],
      moderateWarnings: [
        'Missing AUDIENCE: harder to reason about signal expansion vs waste.',
        'Missing DEVICE or GEOGRAPHIC: geo/device tuning is limited.',
      ],
    },
    aiPlaybookGuidance: [
      'Stress conversion event quality before aggressive scale recommendations.',
      'Prefer geo/device and audience guidance when granular placement data is thin.',
      'Call out tracking gaps explicitly in recommendations.',
    ],
  },
  minimumRecommendedCoverage: { directional: 2, strong: 3 },
  missingReportGuidance: {
    CAMPAIGN:
      'Upload a Campaign report for install/action CPA and budget pacing.',
    DEVICE:
      'Upload a Device report to set device bid adjustments or exclusions.',
    GEOGRAPHIC:
      'Upload a Geographic report to adjust countries/regions.',
    AUDIENCE:
      'Upload an Audience report to refine similar/engaged segments.',
  },
  aiInstructions: [
    'Tie recommendations to conversions in Google Ads and Firebase/MMP; flag broken tracking before scaling.',
    'Use DEVICE/GEO/AUDIENCE reports for concrete bid or exclusion steps.',
    'Only use PLACEMENT when data exists; otherwise stay at campaign/geo/device level.',
  ],
};

const DEMAND_GEN_ENTRY: CampaignTypeRegistryEntry = {
  code: 'DEMAND_GEN',
  label: 'Demand Gen',
  description:
    'Discovery-style demand across Gmail, Discover, YouTube, and Display. Strong creative sets, audience segments, and conversion tracking drive results.',
  importantReportTypes: rt(['CAMPAIGN', 'PLACEMENT', 'AUDIENCE', 'DEVICE']),
  recommendedReportTypes: rt([
    'CAMPAIGN',
    'PLACEMENT',
    'AUDIENCE',
    'DEVICE',
    'GEOGRAPHIC',
    'DEMOGRAPHICS',
  ]),
  defaultObjectives: ['Leads', 'Website traffic with engagement', 'Sales with creative testing'],
  optimizationPriorities: [
    'Creative coverage (images, video, headlines) and testing',
    'Audience segments (custom intent, customer match, similar)',
    'Placement exclusions when placement reports exist',
    'Device and demographic bid adjustments',
  ],
  specialWarnings: [
    'Demand Gen needs multiple assets per ad group; thin creative sets limit optimization.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'dg-launch-1',
        phase: 'launch',
        label: 'Add multiple images, videos, and headlines per ad group',
        detail:
          'What: Enough assets for Google to mix and match. Where: Demand Gen ad group → Assets. Do: Follow aspect ratios; avoid single-image ad groups.',
      },
      {
        id: 'dg-launch-2',
        phase: 'launch',
        label: 'Attach audiences (customer lists, custom segments, similar audiences)',
        detail:
          'What: Who should see the ads. Where: Audiences → add lists or custom intent. Do: Seed with first-party data when possible.',
      },
      {
        id: 'dg-launch-3',
        phase: 'launch',
        label: 'Match landing page to offer (lead form vs product page)',
        detail:
          'What: Destination fits the CTA. Where: Final URL + lead form settings. Do: Align messaging and conversion action.',
      },
      {
        id: 'dg-launch-4',
        phase: 'launch',
        label: 'Verify conversion tracking for the primary KPI',
        detail:
          'What: Conversions fire for the goal you bid to. Where: Tools → Conversions. Do: Test key flows before scaling.',
      },
    ],
    optimization: [
      {
        id: 'dg-opt-1',
        phase: 'optimization',
        label: 'Replace fatigued creatives (CTR, CPA trends)',
        detail:
          'What: Performance drops on specific assets. Where: Assets tab. Do: pause losers; add new angles.',
      },
      {
        id: 'dg-opt-2',
        phase: 'optimization',
        label: 'Exclude or down-bid weak audience segments',
        detail:
          'What: Segments with poor CPA. Where: Audiences. Do: Narrow before expanding reach.',
      },
      {
        id: 'dg-opt-3',
        phase: 'optimization',
        label: 'Add placement exclusions from placement report',
        detail:
          'What: Sites/apps wasting spend. Where: Placements → Exclude placement. Do: Use when Google surfaces placement data.',
      },
      {
        id: 'dg-opt-4',
        phase: 'optimization',
        label: 'Set device and demographic bid adjustments',
        detail:
          'What: Shift budget to efficient slices. Where: Demographics, Devices. Do: Apply % modifiers from reports.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'CAMPAIGN and AUDIENCE anchor strategy; PLACEMENT and DEVICE refine waste and delivery; GEOGRAPHIC/DEMOGRAPHICS add segment detail.',
    missingReportSeverity: {
      strongWarnings: [
        'Missing CAMPAIGN: cannot frame efficiency or pacing for Demand Gen.',
      ],
      moderateWarnings: [
        'Missing AUDIENCE: segment-level exclusions and expansion are harder to reason about.',
        'Missing PLACEMENT: URL-level exclusions are limited when Google surfaces placement data.',
      ],
    },
    aiPlaybookGuidance: [
      'Lead with creative and audience guidance; support with device/geo/demo when present.',
      'When PLACEMENT is missing, avoid over-claiming placement-level exclusions.',
      'Tie recommendations to landing page angle and conversion clarity.',
    ],
  },
  minimumRecommendedCoverage: { directional: 2, strong: 3 },
  missingReportGuidance: {
    CAMPAIGN:
      'Upload a Campaign report for CPA/ROAS and spend pacing.',
    PLACEMENT:
      'Upload a Placement report to exclude specific sites or apps when placements are shown.',
    AUDIENCE:
      'Upload an Audience report to adjust segments or exclusions.',
    DEVICE:
      'Upload a Device report to set device bid adjustments.',
  },
  aiInstructions: [
    'Emphasize creative asset counts, audience lists, and landing-page fit.',
    'Use PLACEMENT for exclusions when present; otherwise stay conservative.',
    'Highlight DEVICE and demographic/geo inefficiencies when data supports.',
  ],
};

/** Conservative default — matches legacy unknown-type analysis behavior. */
const OTHER_ENTRY: CampaignTypeRegistryEntry = {
  code: 'OTHER',
  label: 'Other / unknown',
  description:
    'Fallback when the campaign type is unknown or non-standard. Use conservative report coverage and cautious AI recommendations.',
  importantReportTypes: rt(['CAMPAIGN', 'DEVICE']),
  recommendedReportTypes: rt(['CAMPAIGN', 'DEVICE', 'GEOGRAPHIC', 'AUDIENCE']),
  defaultObjectives: ['Efficiency improvement', 'Risk reduction'],
  optimizationPriorities: ['Aggregate efficiency', 'Device patterns', 'Data coverage'],
  specialWarnings: [
    'Unknown or non-specific campaign type; use conservative defaults (CAMPAIGN + DEVICE) and avoid granular channel claims without data.',
  ],
  defaultChecklistTemplate: {
    launch: [
      {
        id: 'oth-launch-1',
        phase: 'launch',
        label: 'Set campaign objective and primary KPI in Google Ads',
        detail:
          'What: One main goal (leads, sales, traffic). Where: Campaign settings + bidding. Do: Align conversion actions to that KPI.',
      },
      {
        id: 'oth-launch-2',
        phase: 'launch',
        label: 'Verify conversion tracking in Tools → Conversions',
        detail:
          'What: Events fire for stated goals. Where: Google Ads + site/app tagging. Do: Fix broken tags before scaling.',
      },
      {
        id: 'oth-launch-3',
        phase: 'launch',
        label: 'Document channel mix if using multiple networks',
        detail:
          'What: Search vs Display vs Video, etc. Where: Your runbook or notes. Do: Update Campaign.type in this app when known.',
      },
    ],
    optimization: [
      {
        id: 'oth-opt-1',
        phase: 'optimization',
        label: 'Upload standard reports (Campaign, Device, Geo) for this campaign',
        detail:
          'What: Baseline performance slices. Where: Reports → Predefined reports. Do: Import CSVs here for analysis.',
      },
      {
        id: 'oth-opt-2',
        phase: 'optimization',
        label: 'Review device and location bid adjustments',
        detail:
          'What: Shift spend to efficient slices. Where: Devices, Locations. Do: Apply modifiers from evidence.',
      },
    ],
  },
  defaultPlaybookTemplate: {
    expectedReportsSummary:
      'Until the campaign type is clarified, CAMPAIGN and DEVICE reports provide the safest baseline.',
    missingReportSeverity: {
      strongWarnings: [
        'Missing CAMPAIGN: almost no accountable efficiency framing.',
        'Missing DEVICE: device-level tuning is unavailable.',
      ],
      moderateWarnings: [
        'Consider updating Campaign.type to a specific Google Ads type for richer templates.',
      ],
    },
    aiPlaybookGuidance: [
      'Prioritize aggregate efficiency and device patterns. Be cautious with granular claims.',
      'Suggest clarifying campaign type and uploading type-appropriate reports.',
    ],
  },
  minimumRecommendedCoverage: { directional: 1, strong: 2 },
  missingReportGuidance: {
    CAMPAIGN: 'Missing CAMPAIGN: aggregate efficiency and budget guidance will be limited.',
    DEVICE: 'Missing DEVICE: device pattern insights will be limited.',
  },
  aiInstructions: [
    'Prioritize aggregate efficiency and device patterns. Be cautious with granular claims.',
  ],
};

export const CAMPAIGN_TYPE_REGISTRY: Record<
  CanonicalCampaignTypeCode,
  CampaignTypeRegistryEntry
> = {
  SEARCH: SEARCH_ENTRY,
  DISPLAY: DISPLAY_ENTRY,
  PERFORMANCE_MAX: PERFORMANCE_MAX_ENTRY,
  VIDEO: VIDEO_ENTRY,
  SHOPPING: SHOPPING_ENTRY,
  APP: APP_ENTRY,
  DEMAND_GEN: DEMAND_GEN_ENTRY,
  OTHER: OTHER_ENTRY,
};

export const listCampaignTypeRegistryEntries = (): CampaignTypeRegistryEntry[] =>
  CANONICAL_CAMPAIGN_TYPE_CODES.map((code) => CAMPAIGN_TYPE_REGISTRY[code]);

export const getCampaignTypeRegistryEntry = (
  code: CanonicalCampaignTypeCode
): CampaignTypeRegistryEntry => CAMPAIGN_TYPE_REGISTRY[code];
