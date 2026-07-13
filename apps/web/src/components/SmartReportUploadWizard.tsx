import { useState } from 'react';
import type { ReportInspectionResult, SmartImportResultItem } from '../lib/apiClient';
import { apiClient } from '../lib/apiClient';
import { ReportUploadStep } from './reportImport/ReportUploadStep';
import { ReportInspectStep } from './reportImport/ReportInspectStep';
import { ReportCampaignMappingStep } from './reportImport/ReportCampaignMappingStep';
import { ReportImportReviewStep } from './reportImport/ReportImportReviewStep';
import { ReportImportResultStep } from './reportImport/ReportImportResultStep';
import { buildMappingsFromInspect, type SmartUploadMappingEntry } from './reportImport/types';

export interface SmartReportUploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number | null;
  clientName: string | null;
  campaignsForClient: { id: number; name: string }[];
  experienceMode?: import('../lib/experienceMode').ExperienceMode;
}

type Step = 'upload' | 'inspectPreview' | 'mapping' | 'review' | 'result';

export const SmartReportUploadWizard = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  campaignsForClient,
  experienceMode = 'senior',
}: SmartReportUploadWizardProps) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [inspectResult, setInspectResult] = useState<ReportInspectionResult | null>(
    null
  );
  const [mappings, setMappings] = useState<SmartUploadMappingEntry[]>([]);
  const [importResults, setImportResults] = useState<SmartImportResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('upload');
    setFile(null);
    setInspectResult(null);
    setMappings([]);
    setImportResults([]);
    setLoading(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const buildImportPayload = () => {
    if (!inspectResult || clientId == null) return null;
    return mappings.map((m) => {
      const base = { detectedCampaignName: m.fileCampaignName };
      if (m.mode === 'skip') return { ...base, skip: true };
      if (m.mode === 'existing' && m.existingCampaignId != null) {
        return { ...base, existingCampaignId: m.existingCampaignId };
      }
      if (m.mode === 'create') {
        return {
          ...base,
          createNewCampaign: true,
          campaignType: m.campaignType || m.inferredCampaignType,
        };
      }
      return { ...base, skip: true };
    });
  };

  const handleInspect = async () => {
    if (!file) return;
    if (clientId == null) {
      setError('Select a client before importing a report.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.inspectReportIntake(file, { clientId });
      setInspectResult(result);
      setMappings(buildMappingsFromInspect(result.campaignMatches));
      setStep('inspectPreview');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to inspect report.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!inspectResult || clientId == null) {
      setError('Select a client before importing.');
      return;
    }
    const payloadMappings = buildImportPayload();
    if (!payloadMappings) return;
    const actionable = payloadMappings.filter(
      (m) => !('skip' in m) || m.skip !== true
    );
    if (actionable.length === 0) {
      setError('Select at least one campaign to map or create before importing.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.importReportForClient(clientId, {
        stagingId: inspectResult.stagingId,
        fileName: inspectResult.fileName,
        reportType: inspectResult.reportType,
        mappings: payloadMappings,
      });
      setImportResults(response.results);
      setStep('result');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import report.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const goMappingFromInspect = () => {
    setError(null);
    if (!inspectResult?.campaignMatches?.length) {
      setError(
        'No campaign names were detected in this file. Upload a multi-campaign Google Ads export or choose a different report.'
      );
      return;
    }
    setStep('mapping');
  };

  const goReviewFromMapping = () => {
    const incomplete = mappings.filter(
      (m) => m.mode === 'existing' && m.existingCampaignId == null
    );
    if (incomplete.length > 0) {
      setError(
        'Choose an existing campaign for every row set to “Use existing”, or change the action.'
      );
      return;
    }
    setError(null);
    setStep('review');
  };

  return (
    <div className="modal-backdrop">
      {step === 'upload' && (
        <ReportUploadStep
          clientId={clientId}
          clientName={clientName}
          file={file}
          onFileSelected={setFile}
          onInspect={() => void handleInspect()}
          onCancel={handleClose}
          loading={loading}
          error={error}
        />
      )}

      {step === 'inspectPreview' && inspectResult && clientId != null && (
        <ReportInspectStep
          clientName={clientName}
          clientId={clientId}
          inspectResult={inspectResult}
          experienceMode={experienceMode}
          onBack={() => {
            setError(null);
            setStep('upload');
          }}
          onContinue={goMappingFromInspect}
        />
      )}

      {step === 'mapping' && inspectResult && clientId != null && (
        <ReportCampaignMappingStep
          clientName={clientName}
          clientId={clientId}
          inspectResult={inspectResult}
          mappings={mappings}
          campaignsForClient={campaignsForClient}
          onMappingsChange={setMappings}
          onBack={() => {
            setError(null);
            setStep('inspectPreview');
          }}
          onContinue={goReviewFromMapping}
          loading={loading}
          error={error}
        />
      )}

      {step === 'review' && clientId != null && (
        <ReportImportReviewStep
          clientName={clientName}
          clientId={clientId}
          mappings={mappings}
          onBack={() => {
            setError(null);
            setStep('mapping');
          }}
          onImport={() => void handleImport()}
          loading={loading}
          error={error}
        />
      )}

      {step === 'result' && clientId != null && (
        <ReportImportResultStep
          clientName={clientName}
          clientId={clientId}
          results={importResults}
          error={error}
          onDone={handleClose}
        />
      )}
    </div>
  );
};
