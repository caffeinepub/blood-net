import type { DistrictManagerStatus, DonorStatus } from "../backend";

type StatusType =
  | DonorStatus
  | DistrictManagerStatus
  | "available"
  | "appointed"
  | "tempRejected"
  | "permRejected"
  | "pending"
  | "approved"
  | "rejected"
  | "forwarded"
  | "completed"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  approved: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Approved",
  },
  rejected: { bg: "bg-red-100", text: "text-red-600", label: "Rejected" },
  available: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Available",
  },
  appointed: { bg: "bg-blue-100", text: "text-blue-700", label: "Appointed" },
  tempRejected: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Temp. Rejected",
  },
  permRejected: {
    bg: "bg-red-100",
    text: "text-red-600",
    label: "Perm. Rejected",
  },
  forwarded: { bg: "bg-blue-100", text: "text-blue-700", label: "Forwarded" },
  completed: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Completed",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
