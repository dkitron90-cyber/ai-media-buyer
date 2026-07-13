interface WizardStep {
  id: string;
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStepId: string;
}

export const WizardStepper = ({ steps, currentStepId }: WizardStepperProps) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <nav className="wizard-stepper" aria-label="Import progress">
      <ol className="wizard-stepper__list">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === currentStepId;
          return (
            <li
              key={step.id}
              className={
                isCurrent
                  ? 'wizard-stepper__item wizard-stepper__item--current'
                  : isComplete
                    ? 'wizard-stepper__item wizard-stepper__item--complete'
                    : 'wizard-stepper__item'
              }
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="wizard-stepper__index">{index + 1}</span>
              <span className="wizard-stepper__label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const IMPORT_WIZARD_STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'inspectPreview', label: 'Inspect' },
  { id: 'mapping', label: 'Map' },
  { id: 'review', label: 'Review' },
  { id: 'result', label: 'Done' },
] as const;
