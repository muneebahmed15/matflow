type StepStatus = 'upcoming' | 'current' | 'complete';

export type MigrationStep = {
  id: string;
  label: string;
  status: StepStatus;
};

export default function MigrationStepper({ steps }: { steps: MigrationStep[] }) {
  return (
    <ol className="flex gap-2 mb-6 text-xs">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={`flex-1 rounded-lg px-2 py-2 text-center border transition ${
            step.status === 'complete'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : step.status === 'current'
                ? 'border-blue-500/40 bg-blue-500/10 text-white'
                : 'border-white/10 text-white/30'
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wide opacity-60 mb-0.5">
            Step {index + 1}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
