import {
  BarChart2,
  CheckCircle,
  Heart,
  Inbox,
  Loader2,
  Phone,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BloodRequestStatus, DonorStatus } from "../backend";
import type {
  BloodRequestDto,
  DistrictDto,
  DistrictManagerDto,
  DonorDto,
} from "../backend";
import { BloodGroupChip } from "../components/BloodGroupChip";
import { BloodRequestForm } from "../components/BloodRequestForm";
import { DonorForm } from "../components/DonorForm";
import { StatusBadge } from "../components/StatusBadge";
import {
  getStoredCreds,
  saveStoredCred,
  useAuth,
} from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

type Tab =
  | "overview"
  | "donors"
  | "add-donor"
  | "requests"
  | "received-requests"
  | "profile";
type DonorSubTab = "available" | "appointed" | "tempRejected" | "permRejected";

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

function AppointModal({
  donor,
  onSubmit,
  onClose,
}: {
  donor: DonorDto;
  onSubmit: (appointDate: string, patientName: string) => void;
  onClose: () => void;
}) {
  const [appointDate, setAppointDate] = useState("");
  const [patientName, setPatientName] = useState("");
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="appoint.dialog"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm">Appoint Donor: {donor.name}</h3>
          <button
            type="button"
            onClick={onClose}
            data-ocid="appoint.close_button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label
              htmlFor="apt-patient"
              className="block text-sm font-medium mb-1"
            >
              Patient Name *
            </label>
            <input
              id="apt-patient"
              className="form-input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              data-ocid="appoint.input"
            />
          </div>
          <div>
            <label
              htmlFor="apt-date"
              className="block text-sm font-medium mb-1"
            >
              Appointment Date *
            </label>
            <input
              id="apt-date"
              type="date"
              className="form-input"
              value={appointDate}
              onChange={(e) => setAppointDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => onSubmit(appointDate, patientName)}
            disabled={!appointDate || !patientName}
            data-ocid="appoint.confirm_button"
          >
            Confirm Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

function TempRejectModal({
  donor,
  onSubmit,
  onClose,
}: {
  donor: DonorDto;
  onSubmit: (availableAfter: string, reason: string) => void;
  onClose: () => void;
}) {
  const [availableAfter, setAvailableAfter] = useState("");
  const [reason, setReason] = useState("");

  // Minimum date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm">Temporary Reject: {donor.name}</h3>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label
              htmlFor="tr-available"
              className="block text-sm font-medium mb-1"
            >
              Available After Date *
            </label>
            <input
              id="tr-available"
              type="date"
              className="form-input"
              min={minDate}
              value={availableAfter}
              onChange={(e) => setAvailableAfter(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Donor will be automatically released on this date.
            </p>
          </div>
          <div>
            <label
              htmlFor="tr-reason"
              className="block text-sm font-medium mb-1"
            >
              Reason for Rejection *
            </label>
            <textarea
              id="tr-reason"
              className="form-input min-h-[80px] resize-none"
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="w-full py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
            onClick={() => onSubmit(availableAfter, reason)}
            disabled={!availableAfter || !reason.trim()}
          >
            Confirm Temporary Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AMDashboard() {
  const { session, login } = useAuth();
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [donorSubTab, setDonorSubTab] = useState<DonorSubTab>("available");
  const [donors, setDonors] = useState<DonorDto[]>([]);
  const [dms, setDms] = useState<DistrictManagerDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<BloodRequestDto[]>(
    [],
  );
  const [loadingReceivedRequests, setLoadingReceivedRequests] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appointingDonor, setAppointingDonor] = useState<DonorDto | null>(null);
  const [tempRejectingDonor, setTempRejectingDonor] = useState<DonorDto | null>(
    null,
  );
  const [editProfile, setEditProfile] = useState({
    username: session?.username ?? "",
    contact: session?.contact ?? "",
    password: "",
    confirmPassword: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [calledDonor, setCalledDonor] = useState<DonorDto | null>(null);
  const [dmForRequest, setDmForRequest] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  const areaId = session?.areaId;
  const districtId = session?.districtId;
  const amId = session?.id;

  const loadData = useCallback(async () => {
    if (!actor || areaId === undefined) return;
    setLoading(true);
    try {
      const [donorList, dmList, districtList] = await Promise.all([
        actor.getDonorsByArea(areaId),
        districtId
          ? actor.getApprovedDistrictManagers()
          : Promise.resolve([] as DistrictManagerDto[]),
        actor.getDistricts(),
      ]);

      // Auto-restore temp-rejected donors past their available-after date
      const now = Date.now();
      const toRestore = donorList.filter(
        (d) =>
          d.status === DonorStatus.tempRejected &&
          d.tempRejectedUntil !== undefined &&
          now >= Number(d.tempRejectedUntil),
      );
      if (toRestore.length > 0) {
        await Promise.all(toRestore.map((d) => actor.restoreDonor(d.id)));
        const refreshed = await actor.getDonorsByArea(areaId);
        setDonors(refreshed);
      } else {
        setDonors(donorList);
      }
      setDms(dmList);
      setDistricts(districtList);
    } catch (err) {
      toast.error(`Failed to load data: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [actor, areaId, districtId]);

  const loadReceivedRequests = useCallback(async () => {
    if (!actor || amId === undefined) return;
    setLoadingReceivedRequests(true);
    try {
      const requests = await actor.getBloodRequestsForRecipient("am", amId);
      setReceivedRequests(requests);
    } catch (err) {
      toast.error(`Failed to load received requests: ${err}`);
    } finally {
      setLoadingReceivedRequests(false);
    }
  }, [actor, amId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "received-requests") {
      loadReceivedRequests();
    }
  }, [activeTab, loadReceivedRequests]);

  useEffect(() => {
    const handler = (e: Event) =>
      setActiveTab((e as CustomEvent).detail as Tab);
    window.addEventListener("bloodnet-tab-change", handler);
    return () => window.removeEventListener("bloodnet-tab-change", handler);
  }, []);

  const available = donors.filter((d) => d.status === DonorStatus.available);
  const appointed = donors.filter((d) => d.status === DonorStatus.appointed);
  const tempRejected = donors.filter(
    (d) => d.status === DonorStatus.tempRejected,
  );
  const permRejected = donors.filter(
    (d) => d.status === DonorStatus.permRejected,
  );

  const handleAppoint = async (appointDate: string, patientName: string) => {
    if (!actor || !appointingDonor) return;
    try {
      await actor.updateDonorStatus(
        appointingDonor.id,
        DonorStatus.appointed,
        null,
        BigInt(new Date(appointDate).getTime()),
        patientName,
        null,
        null,
      );
      toast.success("Donor appointed!");
      setAppointingDonor(null);
      setCalledDonor(null);
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleTempReject = async (
    donor: DonorDto,
    availableAfter: string,
    reason: string,
  ) => {
    if (!actor) return;
    try {
      const untilTs = BigInt(new Date(availableAfter).getTime());
      await actor.updateDonorStatus(
        donor.id,
        DonorStatus.tempRejected,
        BigInt(Date.now()),
        null,
        null,
        untilTs,
        reason,
      );
      toast.success("Marked as temporarily rejected");
      setTempRejectingDonor(null);
      setCalledDonor(null);
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handlePermReject = async (donor: DonorDto) => {
    if (!actor) return;
    try {
      await actor.updateDonorStatus(
        donor.id,
        DonorStatus.permRejected,
        BigInt(Date.now()),
        null,
        null,
        null,
        null,
      );
      toast.success("Marked as permanently rejected");
      setCalledDonor(null);
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  // Not Attend: donor stays in appointed section, no status change
  const handleNotAttend = () => {
    setCalledDonor(null);
    toast("No change recorded — donor remains in Appoint section.");
  };

  const handleDonated = async (donor: DonorDto) => {
    if (!actor) return;
    try {
      // After donating, lock for 3 months using tempRejectedUntil
      const untilTs = BigInt(Date.now() + THREE_MONTHS_MS);
      await actor.updateDonorStatus(
        donor.id,
        DonorStatus.tempRejected,
        BigInt(Date.now()),
        null,
        null,
        untilTs,
        "Donated — eligible again after 3 months",
      );
      toast.success("Marked as donated — locked for 3 months");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleNotDonated = async (donor: DonorDto) => {
    if (!actor) return;
    try {
      await actor.restoreDonor(donor.id);
      toast.success("Donor returned to available");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleRestore = async (donor: DonorDto) => {
    if (!actor) return;
    try {
      await actor.restoreDonor(donor.id);
      toast.success("Donor restored to available");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleDelete = async (donorId: bigint) => {
    if (!actor) return;
    try {
      await actor.deleteDonor(donorId);
      toast.success("Donor deleted");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const getDistrictName = (dId: bigint) =>
    districts.find((d) => d.id === dId)?.name ?? "Unknown District";

  const getDmUsername = (fromId: bigint) =>
    dms.find((dm) => dm.id === fromId)?.username ?? null;

  const getStatusColor = (status: BloodRequestStatus) => {
    switch (status) {
      case BloodRequestStatus.pending:
        return "bg-amber-100 text-amber-700 border-amber-200";
      case BloodRequestStatus.forwarded:
        return "bg-blue-100 text-blue-700 border-blue-200";
      case BloodRequestStatus.completed:
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleSaveProfile = () => {
    if (editProfile.password !== editProfile.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!session) return;
    setIsSavingProfile(true);
    const creds = getStoredCreds();
    const existing = creds[session.contact];
    if (existing)
      saveStoredCred(session.contact, {
        ...existing,
        username: editProfile.username,
        password: editProfile.password || existing.password,
      });
    login({
      ...session,
      username: editProfile.username,
      contact: editProfile.contact,
    });
    toast.success("Profile updated!");
    setIsSavingProfile(false);
  };

  const DonorCard = ({ donor, index }: { donor: DonorDto; index: number }) => (
    <div
      className="bg-white rounded-xl border border-border p-4 shadow-xs"
      data-ocid={`am.donor.item.${index + 1}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-sm">{donor.name}</p>
          <p className="text-xs text-muted-foreground">
            Age: {donor.age.toString()} &bull; {donor.contact}
          </p>
          {/* Show rejection reason for temp-rejected donors */}
          {donor.status === DonorStatus.tempRejected &&
            donor.tempRejectedReason && (
              <p className="text-xs text-amber-700 mt-0.5 font-medium">
                Reason: {donor.tempRejectedReason}
              </p>
            )}
        </div>
        <BloodGroupChip group={donor.bloodGroup} />
      </div>

      {donor.status === DonorStatus.available && (
        <div className="flex gap-2">
          <a
            href={`tel:${donor.contact}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
            onClick={() => setCalledDonor(donor)}
            data-ocid={`am.donor.button.${index + 1}`}
          >
            <Phone size={12} /> Call
          </a>
        </div>
      )}

      {calledDonor?.id === donor.id &&
        donor.status === DonorStatus.available && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Post-call action:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAppointingDonor(donor)}
                className="text-xs py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                data-ocid={`am.donor.edit_button.${index + 1}`}
              >
                Appoint
              </button>
              <button
                type="button"
                onClick={() => setTempRejectingDonor(donor)}
                className="text-xs py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
              >
                Temp Reject
              </button>
              <button
                type="button"
                onClick={() => handlePermReject(donor)}
                className="text-xs py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                data-ocid={`am.donor.delete_button.${index + 1}`}
              >
                Perm Reject
              </button>
              <button
                type="button"
                onClick={handleNotAttend}
                className="text-xs py-2 rounded-xl bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors"
              >
                Not Attend
              </button>
            </div>
          </div>
        )}

      {donor.status === DonorStatus.appointed && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Patient: {donor.patientName ?? "—"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDonated(donor)}
              className="flex-1 text-xs py-2 rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
              data-ocid={`am.donor.confirm_button.${index + 1}`}
            >
              Donated
            </button>
            <button
              type="button"
              onClick={() => handleNotDonated(donor)}
              className="flex-1 text-xs py-2 rounded-full bg-secondary border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              Not Donated
            </button>
          </div>
        </div>
      )}

      {donor.status === DonorStatus.tempRejected && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {donor.tempRejectedUntil
              ? `Available after: ${new Date(Number(donor.tempRejectedUntil)).toLocaleDateString()}`
              : donor.rejectedAt
                ? `Eligible again after ${new Date(Number(donor.rejectedAt) + THREE_MONTHS_MS).toLocaleDateString()}`
                : "Temporarily rejected"}
          </div>
          <button
            type="button"
            onClick={() => handleRestore(donor)}
            className="w-full text-xs py-2 rounded-full bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
          >
            <RotateCcw size={11} /> Release Now
          </button>
        </div>
      )}

      {donor.status === DonorStatus.permRejected && (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => handleRestore(donor)}
            className="flex-1 text-xs py-2 rounded-full bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors"
            data-ocid={`am.donor.save_button.${index + 1}`}
          >
            <span className="flex items-center justify-center gap-1">
              <RotateCcw size={12} /> Restore
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(donor.id)}
            className="flex-1 text-xs py-2 rounded-full bg-red-100 text-red-600 font-semibold hover:bg-red-200 transition-colors"
            data-ocid={`am.donor.delete_button.${index + 1}`}
          >
            <span className="flex items-center justify-center gap-1">
              <Trash2 size={12} /> Delete
            </span>
          </button>
        </div>
      )}
    </div>
  );

  const currentDonors =
    donorSubTab === "available"
      ? available
      : donorSubTab === "appointed"
        ? appointed
        : donorSubTab === "tempRejected"
          ? tempRejected
          : permRejected;

  const TAB_LABELS: Record<Tab, string> = {
    overview: "Overview",
    donors: "Donors",
    "add-donor": "Add Donor",
    requests: "Send Request",
    "received-requests": "Received Requests",
    profile: "Profile",
  };

  return (
    <div className="animate-slide-in-up">
      <div className="hidden md:flex gap-2 mb-6 flex-wrap">
        {(
          [
            "overview",
            "donors",
            "add-donor",
            "requests",
            "received-requests",
            "profile",
          ] as Tab[]
        ).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === t
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border text-muted-foreground hover:bg-secondary"
            }`}
            data-ocid={`am.${t}.tab`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-5" data-ocid="am.overview.section">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
              <p className="text-xs text-muted-foreground mb-1">Available</p>
              <p className="text-2xl font-bold text-emerald-600">
                {available.length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
              <p className="text-xs text-muted-foreground mb-1">Appointed</p>
              <p className="text-2xl font-bold text-blue-600">
                {appointed.length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
              <p className="text-xs text-muted-foreground mb-1">
                Temp. Rejected
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {tempRejected.length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
              <p className="text-xs text-muted-foreground mb-1">
                Perm. Rejected
              </p>
              <p className="text-2xl font-bold text-red-600">
                {permRejected.length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
            <p className="text-xs text-muted-foreground mb-1">Total Donors</p>
            <p className="text-3xl font-bold text-foreground">
              {donors.length}
            </p>
          </div>
        </div>
      )}

      {/* Donors Tab */}
      {activeTab === "donors" && (
        <div className="space-y-4" data-ocid="am.donors.section">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(
              [
                "available",
                "appointed",
                "tempRejected",
                "permRejected",
              ] as DonorSubTab[]
            ).map((st) => {
              const count =
                st === "available"
                  ? available.length
                  : st === "appointed"
                    ? appointed.length
                    : st === "tempRejected"
                      ? tempRejected.length
                      : permRejected.length;
              return (
                <button
                  type="button"
                  key={st}
                  onClick={() => setDonorSubTab(st)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    donorSubTab === st
                      ? "bg-primary text-primary-foreground"
                      : "bg-white border border-border text-muted-foreground"
                  }`}
                  data-ocid={`am.${st}.tab`}
                >
                  {st === "tempRejected"
                    ? "Temp Rejected"
                    : st === "permRejected"
                      ? "Perm Rejected"
                      : st.charAt(0).toUpperCase() + st.slice(1)}{" "}
                  ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div
              className="flex justify-center py-10"
              data-ocid="am.donors.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentDonors.length === 0 ? (
            <div
              className="bg-white rounded-xl border border-border p-8 text-center"
              data-ocid="am.donors.empty_state"
            >
              <Heart size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">
                No {donorSubTab} donors
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDonors.map((d, i) => (
                <DonorCard key={d.id.toString()} donor={d} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Donor Tab */}
      {activeTab === "add-donor" && (
        <div
          className="bg-white rounded-xl border border-border p-5 shadow-xs"
          data-ocid="am.add_donor.section"
        >
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-destructive" /> Add Donor
          </h2>
          <DonorForm
            areaManagerId={amId}
            prefillDistrictId={districtId}
            prefillAreaId={areaId}
            onSuccess={async () => {
              await loadData();
              setActiveTab("donors");
            }}
          />
        </div>
      )}

      {/* Send Request Tab */}
      {activeTab === "requests" && (
        <div
          className="bg-white rounded-xl border border-border p-5 shadow-xs"
          data-ocid="am.requests.section"
        >
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Send size={18} className="text-destructive" /> Send Blood Request
          </h2>
          {!showRequestForm ? (
            <>
              <div className="mb-3">
                <label
                  htmlFor="am-dm-sel"
                  className="block text-sm font-medium mb-1"
                >
                  Select District Manager
                </label>
                <select
                  id="am-dm-sel"
                  className="form-input"
                  value={dmForRequest}
                  onChange={(e) => setDmForRequest(e.target.value)}
                  data-ocid="am.request.select"
                >
                  <option value="">Select DM</option>
                  {dms.map((dm) => (
                    <option key={dm.id.toString()} value={dm.id.toString()}>
                      {getDistrictName(dm.districtId)} - {dm.username}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-danger w-full"
                onClick={() => setShowRequestForm(true)}
                disabled={!dmForRequest}
                data-ocid="am.request.primary_button"
              >
                <span className="flex items-center justify-center gap-2">
                  <Send size={16} /> Continue
                </span>
              </button>
            </>
          ) : (
            <BloodRequestForm
              fromRole="am"
              fromId={amId ?? 0n}
              toRole="dm"
              toId={BigInt(dmForRequest || "0")}
              onSuccess={() => {
                setShowRequestForm(false);
                setDmForRequest("");
              }}
              onCancel={() => setShowRequestForm(false)}
            />
          )}
        </div>
      )}

      {/* Received Requests Tab */}
      {activeTab === "received-requests" && (
        <div className="space-y-4" data-ocid="am.received_requests.section">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Inbox size={18} className="text-destructive" /> Blood Requests
              Received
            </h2>
            <button
              type="button"
              onClick={loadReceivedRequests}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              data-ocid="am.received_requests.button"
            >
              <RotateCcw size={12} /> Refresh
            </button>
          </div>

          {loadingReceivedRequests ? (
            <div
              className="flex justify-center py-12"
              data-ocid="am.received_requests.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : receivedRequests.length === 0 ? (
            <div
              className="bg-white rounded-xl border border-border p-10 text-center"
              data-ocid="am.received_requests.empty_state"
            >
              <Inbox size={36} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-sm text-foreground mb-1">
                No blood requests received yet
              </p>
              <p className="text-xs text-muted-foreground">
                Requests forwarded by District Managers will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedRequests.map((req, i) => {
                const dmUsername = getDmUsername(req.fromId);
                return (
                  <div
                    key={req.id.toString()}
                    className="bg-white rounded-xl border border-border p-4 shadow-xs"
                    data-ocid={`am.received_requests.item.${i + 1}`}
                  >
                    {/* Header: patient name + blood group + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">
                            {req.patientName}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(
                              req.status,
                            )}`}
                          >
                            {req.status.toString().toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Age: {req.age.toString()}
                        </p>
                      </div>
                      <BloodGroupChip group={req.bloodGroup} />
                    </div>

                    {/* Hospital info */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">
                          Hospital:
                        </span>
                        <span className="text-xs text-foreground">
                          {req.hospitalName}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">
                          Address:
                        </span>
                        <span className="text-xs text-foreground">
                          {req.hospitalAddress}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">
                          Operation:
                        </span>
                        <span className="text-xs text-foreground">
                          {req.operationDate}
                        </span>
                      </div>
                    </div>

                    {/* Attender info */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">
                          Attender:
                        </span>
                        <span className="text-xs text-foreground">
                          {req.attenderName}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">
                          Contact:
                        </span>
                        <span className="text-xs text-foreground">
                          {req.contact}
                        </span>
                      </div>
                      {req.altContact && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">
                            Alt Contact:
                          </span>
                          <span className="text-xs text-foreground">
                            {req.altContact}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer: DM source + created at */}
                    <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">
                        {dmUsername
                          ? `District Manager: ${dmUsername}`
                          : `From DM ID: ${req.fromId.toString()}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          Number(req.createdAt) / 1_000_000,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <User size={18} className="text-destructive" /> Edit Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="am-prof-un"
                className="block text-sm font-medium mb-1"
              >
                Username
              </label>
              <input
                id="am-prof-un"
                className="form-input"
                value={editProfile.username}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, username: e.target.value }))
                }
                data-ocid="am.profile.input"
              />
            </div>
            <div>
              <label
                htmlFor="am-prof-ct"
                className="block text-sm font-medium mb-1"
              >
                Contact
              </label>
              <input
                id="am-prof-ct"
                className="form-input"
                value={editProfile.contact}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, contact: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="am-prof-pw"
                className="block text-sm font-medium mb-1"
              >
                New Password
              </label>
              <input
                id="am-prof-pw"
                type="password"
                className="form-input"
                value={editProfile.password}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="am-prof-cp"
                className="block text-sm font-medium mb-1"
              >
                Confirm Password
              </label>
              <input
                id="am-prof-cp"
                type="password"
                className="form-input"
                value={editProfile.confirmPassword}
                onChange={(e) =>
                  setEditProfile((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              data-ocid="am.profile.save_button"
            >
              {isSavingProfile ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </div>
      )}

      {appointingDonor && (
        <AppointModal
          donor={appointingDonor}
          onSubmit={handleAppoint}
          onClose={() => setAppointingDonor(null)}
        />
      )}

      {tempRejectingDonor && (
        <TempRejectModal
          donor={tempRejectingDonor}
          onSubmit={(availableAfter, reason) =>
            handleTempReject(tempRejectingDonor, availableAfter, reason)
          }
          onClose={() => setTempRejectingDonor(null)}
        />
      )}
    </div>
  );
}
