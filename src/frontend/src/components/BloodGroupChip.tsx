interface BloodGroupChipProps {
  group: string;
  className?: string;
}

export function BloodGroupChip({ group, className = "" }: BloodGroupChipProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive text-destructive-foreground ${className}`}
    >
      {group}
    </span>
  );
}
