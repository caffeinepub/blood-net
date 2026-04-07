import {
  BarChart2,
  Bell,
  CheckCircle,
  ChevronRight,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  AreaManagerDto,
  BloodRequestDto,
  DistrictDto,
  DistrictManagerDto,
} from "../backend";
import { ChatSection, useCEOChatContacts } from "../components/ChatSection";
import { FeedbackSection } from "../components/FeedbackSection";
import { triggerTabChange } from "../components/NavBar";
import { StatusBadge } from "../components/StatusBadge";
import { getCeoProfile, saveCeoProfile, useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

type Tab =
  | "districts"
  | "approvals"
  | "managers"
  | "notices"
  | "feedback"
  | "chat"
  | "profile";

function KPICard({
  label,
  value,
  color = "text-foreground",
}: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function DMAnalysisModal({
  dm,
  onClose,
}: { dm: DistrictManagerDto; onClose: () => void }) {
  const { actor } = useActor();
  const [ams, setAms] = useState<AreaManagerDto[]>([]);
  const [requests, setRequests] = useState<BloodRequestDto[]>([]);
  const [filter, setFilter] = useState<"1month" | "1year" | "all">("1month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    Promise.all([
      actor.getApprovedAreaManagersByDistrict(dm.districtId),
      actor.getBloodRequestsForRecipient("dm", dm.id),
    ])
      .then(([amList, reqList]) => {
        setAms(amList);
        setRequests(reqList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actor, dm]);

  const now = Date.now();
  const filtered = requests.filter((r) => {
    const created = Number(r.createdAt);
    if (filter === "1month") return now - created < 30 * 24 * 60 * 60 * 1000;
    if (filter === "1year") return now - created < 365 * 24 * 60 * 60 * 1000;
    return true;
  });
  const completed = filtered.filter((r) => r.status === "completed").length;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="dm_analysis.dialog"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-bold text-foreground">{dm.username}</h3>
            <p className="text-xs text-muted-foreground">{dm.contact}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            className="text-muted-foreground hover:text-foreground p-1"
            data-ocid="dm_analysis.close_button"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {loading ? (
            <div
              className="flex justify-center py-8"
              data-ocid="dm_analysis.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Area Managers ({ams.length})
                </h4>
                {ams.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="dm_analysis.empty_state"
                  >
                    No area managers yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ams.map((am, i) => (
                      <div
                        key={am.id.toString()}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary"
                        data-ocid={`dm_analysis.item.${i + 1}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{am.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {am.contact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Blood Requests
                  </h4>
                  <div className="flex gap-1">
                    {(["1month", "1year", "all"] as const).map((f) => (
                      <button
                        type="button"
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                          filter === f
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                        data-ocid={`dm_analysis.${f}.toggle`}
                      >
                        {f === "1month"
                          ? "1 Mo"
                          : f === "1year"
                            ? "1 Yr"
                            : "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">
                      {filtered.length}
                    </p>
                    <p className="text-xs text-blue-600">Total Requests</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">
                      {completed}
                    </p>
                    <p className="text-xs text-emerald-600">Completed</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CEODashboard() {
  const { actor } = useActor();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("districts");
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [pendingDMs, setPendingDMs] = useState<DistrictManagerDto[]>([]);
  const [approvedDMs, setApprovedDMs] = useState<DistrictManagerDto[]>([]);
  const [newDistrict, setNewDistrict] = useState("");
  const [isAddingDistrict, setIsAddingDistrict] = useState(false);
  const [selectedDM, setSelectedDM] = useState<DistrictManagerDto | null>(null);
  const [noticeMsg, setNoticeMsg] = useState("");
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [ceoProfile, setCeoProfile] = useState(getCeoProfile());
  const [editProfile, setEditProfile] = useState({
    username: ceoProfile.username,
    password: ceoProfile.password,
    contact: ceoProfile.contact,
    confirmPassword: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const { contacts: chatContacts, loading: chatLoading } = useCEOChatContacts();

  const loadData = useCallback(async () => {
    if (!actor) return;
    const [dList, pendList, appList] = await Promise.all([
      actor.getDistricts(),
      actor.getPendingDistrictManagers(),
      actor.getApprovedDistrictManagers(),
    ]);
    setDistricts(dList);
    setPendingDMs(pendList);
    setApprovedDMs(appList);
  }, [actor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as Tab;
      setActiveTab(tab);
    };
    window.addEventListener("bloodnet-tab-change", handler);
    return () => window.removeEventListener("bloodnet-tab-change", handler);
  }, []);

  const handleAddDistrict = async () => {
    if (!newDistrict.trim() || !actor) return;
    setIsAddingDistrict(true);
    try {
      await actor.createDistrict(newDistrict.trim());
      setNewDistrict("");
      toast.success("District created!");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsAddingDistrict(false);
    }
  };

  const handleApproveDM = async (dmId: bigint) => {
    if (!actor) return;
    try {
      await actor.approveDistrictManager(dmId);
      toast.success("District Manager approved!");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleRejectDM = async (dmId: bigint) => {
    if (!actor) return;
    try {
      await actor.rejectDistrictManager(dmId);
      toast.success("District Manager rejected.");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleSendNotice = async () => {
    if (!noticeMsg.trim() || !actor) return;
    setIsSendingNotice(true);
    try {
      await Promise.all(
        approvedDMs.map((dm) =>
          actor.sendNotice("ceo", 0n, "dm", dm.id, noticeMsg),
        ),
      );
      setNoticeMsg("");
      toast.success(`Notice sent to ${approvedDMs.length} District Managers!`);
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsSendingNotice(false);
    }
  };

  const handleSaveProfile = () => {
    if (editProfile.password !== editProfile.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsSavingProfile(true);
    const updated = {
      username: editProfile.username,
      password: editProfile.password,
      contact: editProfile.contact,
    };
    saveCeoProfile(updated);
    setCeoProfile(updated);
    login({
      role: "ceo",
      id: 0n,
      username: updated.username,
      contact: updated.contact,
    });
    toast.success("Profile updated!");
    setIsSavingProfile(false);
  };

  const districtMap: Record<string, string> = {};
  for (const d of districts) districtMap[d.id.toString()] = d.name;

  const ALL_TABS: Tab[] = [
    "districts",
    "approvals",
    "managers",
    "notices",
    "feedback",
    "chat",
    "profile",
  ];

  const TAB_LABELS: Record<Tab, string> = {
    districts: "Districts",
    approvals: "Approvals",
    managers: "Managers",
    notices: "Notices",
    feedback: "Feedback",
    chat: "Chat",
    profile: "Profile",
  };

  return (
    <div className="animate-slide-in-up">
      {/* Tab indicator */}
      <div className="hidden md:flex gap-2 mb-6 flex-wrap">
        {ALL_TABS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
              activeTab === t
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border text-muted-foreground hover:bg-secondary"
            }`}
            data-ocid={`ceo.${t}.tab`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Districts Tab */}
      {activeTab === "districts" && (
        <div className="space-y-5" data-ocid="ceo.districts.section">
          <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-destructive" /> Create District
            </h2>
            <div className="flex gap-3">
              <input
                className="form-input flex-1"
                placeholder="District name"
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDistrict()}
                data-ocid="ceo.district.input"
              />
              <button
                type="button"
                className="btn-primary px-4"
                onClick={handleAddDistrict}
                disabled={isAddingDistrict || !newDistrict.trim()}
                data-ocid="ceo.district.primary_button"
              >
                {isAddingDistrict ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">
                All Districts ({districts.length})
              </h3>
            </div>
            {districts.length === 0 ? (
              <div
                className="p-8 text-center"
                data-ocid="ceo.districts.empty_state"
              >
                <MapPin
                  size={32}
                  className="mx-auto text-muted-foreground mb-2"
                />
                <p className="text-muted-foreground text-sm">
                  No districts yet. Create one above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {districts.map((d, i) => (
                  <div
                    key={d.id.toString()}
                    className="flex items-center justify-between px-5 py-3"
                    data-ocid={`ceo.district.item.${i + 1}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin size={14} className="text-primary" />
                      </div>
                      <span className="font-medium text-sm">{d.name}</span>
                    </div>
                    <StatusBadge
                      status={d.isAssigned ? "approved" : "pending"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="space-y-4" data-ocid="ceo.approvals.section">
          <div className="grid grid-cols-2 gap-3">
            <KPICard
              label="Pending"
              value={pendingDMs.length}
              color="text-amber-600"
            />
            <KPICard
              label="Approved"
              value={approvedDMs.length}
              color="text-emerald-600"
            />
          </div>
          {pendingDMs.length === 0 ? (
            <div
              className="bg-white rounded-xl border border-border p-8 text-center"
              data-ocid="ceo.approvals.empty_state"
            >
              <CheckCircle
                size={32}
                className="mx-auto text-muted-foreground mb-2"
              />
              <p className="text-muted-foreground text-sm">
                No pending approvals
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDMs.map((dm, i) => (
                <div
                  key={dm.id.toString()}
                  className="bg-white rounded-xl border border-border p-4 shadow-xs"
                  data-ocid={`ceo.approval.item.${i + 1}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">{dm.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {dm.contact}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        District:{" "}
                        {districtMap[dm.districtId.toString()] ??
                          dm.districtId.toString()}
                      </p>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveDM(dm.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                      data-ocid={`ceo.approval.confirm_button.${i + 1}`}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectDM(dm.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                      data-ocid={`ceo.approval.delete_button.${i + 1}`}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Managers Tab */}
      {activeTab === "managers" && (
        <div className="space-y-4" data-ocid="ceo.managers.section">
          <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">
                District Managers ({approvedDMs.length})
              </h3>
            </div>
            {approvedDMs.length === 0 ? (
              <div
                className="p-8 text-center"
                data-ocid="ceo.managers.empty_state"
              >
                <Users
                  size={32}
                  className="mx-auto text-muted-foreground mb-2"
                />
                <p className="text-muted-foreground text-sm">
                  No approved district managers yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {approvedDMs.map((dm, i) => (
                  <button
                    type="button"
                    key={dm.id.toString()}
                    onClick={() => setSelectedDM(dm)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary transition-colors text-left"
                    data-ocid={`ceo.manager.item.${i + 1}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{dm.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {dm.contact} &bull;{" "}
                          {districtMap[dm.districtId.toString()] ?? "—"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div className="space-y-5" data-ocid="ceo.notices.section">
          <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Bell size={18} className="text-destructive" /> Broadcast Notice
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              This notice will be sent to all {approvedDMs.length} approved
              District Managers.
            </p>
            <textarea
              className="form-input resize-none mb-3"
              rows={5}
              placeholder="Type your notice here..."
              value={noticeMsg}
              onChange={(e) => setNoticeMsg(e.target.value)}
              data-ocid="ceo.notice.textarea"
            />
            <button
              type="button"
              className="btn-primary w-full"
              onClick={handleSendNotice}
              disabled={
                isSendingNotice || !noticeMsg.trim() || approvedDMs.length === 0
              }
              data-ocid="ceo.notice.submit_button"
            >
              {isSendingNotice ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                </span>
              ) : (
                `Send to ${approvedDMs.length} DMs`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && <FeedbackSection userRole="ceo" />}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div data-ocid="ceo.chat.section">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <MessageCircle size={18} className="text-destructive" /> Messages
          </h2>
          <ChatSection contacts={chatContacts} loadingContacts={chatLoading} />
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-5" data-ocid="ceo.profile.section">
          <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <User size={18} className="text-destructive" /> Edit Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ceo-un"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Username
                </label>
                <input
                  id="ceo-un"
                  className="form-input"
                  value={editProfile.username}
                  onChange={(e) =>
                    setEditProfile((p) => ({ ...p, username: e.target.value }))
                  }
                  data-ocid="ceo.profile.input"
                />
              </div>
              <div>
                <label
                  htmlFor="ceo-ct"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Contact Number
                </label>
                <input
                  id="ceo-ct"
                  className="form-input"
                  value={editProfile.contact}
                  onChange={(e) =>
                    setEditProfile((p) => ({ ...p, contact: e.target.value }))
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="ceo-pw"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  New Password
                </label>
                <input
                  id="ceo-pw"
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
                  htmlFor="ceo-cp"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="ceo-cp"
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
                data-ocid="ceo.profile.save_button"
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
        </div>
      )}

      {/* DM Analysis Modal */}
      {selectedDM && (
        <DMAnalysisModal dm={selectedDM} onClose={() => setSelectedDM(null)} />
      )}
    </div>
  );
}
