type OnboardingProgressProps = {
  current: number;
  total: number;
  label: string;
};

export function OnboardingProgress({
  current,
  total,
  label,
}: OnboardingProgressProps) {
  const progress = (current / total) * 100;

  return (
    <div data-testid="onboarding-progress" className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono-ui text-[10px] text-primary">
          {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Étape ${current} sur ${total}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
