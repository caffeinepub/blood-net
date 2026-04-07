import {
  Bell,
  CheckCircle,
  ChevronRight,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  AreaDto,
  AreaManagerDto,
  BloodRequestDto,
  DistrictManagerDto,
} from "../backend";
import { BloodRequestForm } from "../components/BloodRequestForm";
import { ChatSection, useDMChatContacts } from "../components/ChatSection";
import { FeedbackSection } from "../components/FeedbackSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  getStoredCreds,
  saveStoredCred,
  useAuth,
} from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

type Tab =
  | "areas"
  | "approvals"
  | "managers"
  | "requests"
  | "notices"
  | "feedback"
  | "chat"
  | "profile";
type RequestSubTab = "send" | "received";

function AMAnalysisModal({
  am,
  onClose,
}: { am: AreaManagerDto; onClose: () => void }) {
  const { actor } = useActor();
  const [requests, setRequests] = useState<BloodRequestDto[]>([]);
  const [filter, setFilter] = useState<"1month" | "1year" | "all">("1month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    actor
      .getBloodRequestsForRecipient("am", am.id)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actor, am]);

  const now = Date.now();
  const filtered = requests.filter((r) => {
    const t = Number(r.createdAt);
    if (filter === "1month") return now - t < 30 * 24 * 60 * 60 * 1000;
    if (filter === "1year") return now - t < 365 * 24 * 60 * 60 * 1000;
    return true;
  });
  const completed = filtered.filter((r) => r.status === "completed").length;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="am_analysis.dialog"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-bold">{am.username}</h3>
            <p className="text-xs text-muted-foreground">{am.contact}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="am_analysis.close_button"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div
              className="flex justify-center py-8"
              data-ocid="am_analysis.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-4">
                {(["1month", "1year", "all"] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                    data-ocid={`am_analysis.${f}.toggle`}
                  >
                    {f === "1month" ? "1 Mo" : f === "1year" ? "1 Yr" : "All"}
                  </button>
                ))}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ForwardModal({
  ams,
  otherDMs,
  onForward,
  onClose,
}: {
  ams: AreaManagerDto[];
  otherDMs: DistrictManagerDto[];
  onForward: (toRole: string, toId: bigint) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="forward.dialog"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm">Forward Request</h3>
          <button
            type="button"
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            className="text-muted-foreground"
            data-ocid="forward.close_button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {ams.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Area Managers
              </p>
              {ams.map((am) => (
                <button
                  type="button"
                  key={am.id.toString()}
                  onClick={() => onForward("am", am.id)}
                  className="w-full text-left p-3 rounded-xl bg-secondary hover:bg-blue-50 text-sm font-medium transition-colors"
                  data-ocid="forward.confirm_button"
                >
                  {am.username}
                </button>
              ))}
            </>
          )}
          {otherDMs.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">
                District Managers
              </p>
              {otherDMs.map((dm) => (
                <button
                  type="button"
                  key={dm.id.toString()}
                  onClick={() => onForward("dm", dm.id)}
                  className="w-full text-left p-3 rounded-xl bg-secondary hover:bg-blue-50 text-sm font-medium transition-colors"
                  data-ocid="forward.confirm_button"
                >
                  {dm.username}
                </button>
              ))}
            </>
          )}
          {ams.length === 0 && otherDMs.length === 0 && (
            <p
              className="text-sm text-muted-foreground text-center py-4"
              data-ocid="forward.empty_state"
            >
              No recipients available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DMDashboard() {
  const { session, login } = useAuth();
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<Tab>("areas");
  const [reqSubTab, setReqSubTab] = useState<RequestSubTab>("send");
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [pendingAMs, setPendingAMs] = useState<AreaManagerDto[]>([]);
  const [approvedAMs, setApprovedAMs] = useState<AreaManagerDto[]>([]);
  const [allDMs, setAllDMs] = useState<DistrictManagerDto[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<BloodRequestDto[]>(
    [],
  );
  const [newArea, setNewArea] = useState("");
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [selectedAM, setSelectedAM] = useState<AreaManagerDto | null>(null);
  const [noticeMsg, setNoticeMsg] = useState("");
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [sendTargetRole, setSendTargetRole] = useState("");
  const [sendTargetId, setSendTargetId] = useState("");
  const [showSendForm, setShowSendForm] = useState(false);
  const [forwardingRequest, setForwardingRequest] =
    useState<BloodRequestDto | null>(null);
  const [editProfile, setEditProfile] = useState({
    username: session?.username ?? "",
    contact: session?.contact ?? "",
    password: "",
    confirmPassword: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const districtId = session?.districtId;
  const dmId = session?.id;

  const { contacts: chatContacts, loading: chatLoading } =
    useDMChatContacts(dmId);

  const loadData = useCallback(async () => {
    if (!actor || districtId === undefined || dmId === undefined) return;
    const [areaList, pendList, appList, dmList, reqList] = await Promise.all([
      actor.getAreasByDistrict(districtId),
      actor.getPendingAreaManagersForDistrict(districtId),
      actor.getApprovedAreaManagersByDistrict(districtId),
      actor.getApprovedDistrictManagers(),
      actor.getBloodRequestsForRecipient("dm", dmId),
    ]);
    setAreas(areaList);
    setPendingAMs(pendList);
    setApprovedAMs(appList);
    setAllDMs(dmList.filter((d) => d.id !== dmId));
    setReceivedRequests(reqList);
  }, [actor, districtId, dmId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = (e: Event) =>
      setActiveTab((e as CustomEvent).detail as Tab);
    window.addEventListener("bloodnet-tab-change", handler);
    return () => window.removeEventListener("bloodnet-tab-change", handler);
  }, []);

  const handleAddArea = async () => {
    if (!newArea.trim() || !actor || districtId === undefined) return;
    setIsAddingArea(true);
    try {
      await actor.createArea(dmId!, districtId, newArea.trim());
      setNewArea("");
      toast.success("Area created!");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsAddingArea(false);
    }
  };

  const handleApproveAM = async (amId: bigint) => {
    if (!actor || dmId === undefined) return;
    try {
      await actor.approveAreaManager(dmId!, amId);
      toast.success("Area Manager approved!");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleRejectAM = async (amId: bigint) => {
    if (!actor || dmId === undefined) return;
    try {
      await actor.rejectAreaManager(dmId!, amId);
      toast.success("Rejected.");
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleSendNotice = async () => {
    if (!noticeMsg.trim() || !actor || dmId === undefined) return;
    setIsSendingNotice(true);
    try {
      await Promise.all(
        approvedAMs.map((am) =>
          actor.sendNotice("dm", dmId, "am", am.id, noticeMsg),
        ),
      );
      setNoticeMsg("");
      toast.success(`Notice sent to ${approvedAMs.length} Area Managers!`);
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsSendingNotice(false);
    }
  };

  const handleForward = async (toRole: string, toId: bigint) => {
    if (!actor || !forwardingRequest) return;
    try {
      await actor.forwardBloodRequest(forwardingRequest.id, toRole, toId);
      toast.success("Request forwarded!");
      setForwardingRequest(null);
      await loadData();
    } catch (err) {
      toast.error(`Failed: ${err}`);
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
    if (existing) {
      saveStoredCred(session.contact, {
        ...existing,
        username: editProfile.username,
        password: editProfile.password || existing.password,
      });
    }
    login({
      ...session,
      username: editProfile.username,
      contact: editProfile.contact,
    });
    toast.success("Profile updated!");
    setIsSavingProfile(false);
  };

  const ALL_TABS: Tab[] = [
    "areas",
    "approvals",
    "managers",
    "requests",
    "notices",
    "feedback",
    "chat",
    "profile",
  ];

  const TAB_LABELS: Record<Tab, string> = {
    areas: "Areas",
    approvals: "Approvals",
    managers: "Managers",
    requests: "Requests",
    notices: "Notices",
    feedback: "Feedback",
    chat: "Chat",
    profile: "Profile",
  };

  return (
    <div className="animate-slide-in-up">
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
            data-ocid={`dm.${t}.tab`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Areas Tab */}
      {activeTab === "areas" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-destructive" /> Create Area
            </h2>
            <div className="flex gap-3">
              <input
                className="form-input flex-1"
                placeholder="Area name"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
                data-ocid="dm.area.input"
              />
              <button
                type="button"
                className="btn-primary px-4"
                onClick={handleAddArea}
                disabled={isAddingArea || !newArea.trim()}
                data-ocid="dm.area.primary_button"
              >
                {isAddingArea ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Areas ({areas.length})</h3>
            </div>
            {areas.length === 0 ? (
              <div className="p-8 text-center" data-ocid="dm.areas.empty_state">
                <MapPin
                  size={32}
                  className="mx-auto text-muted-foreground mb-2"
                />
                <p className="text-muted-foreground text-sm">No areas yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {areas.map((a, i) => (
                  <div
                    key={a.id.toString()}
                    className="flex items-center justify-between px-5 py-3"
                    data-ocid={`dm.area.item.${i + 1}`}
                  >
                    <span className="font-medium text-sm">{a.name}</span>
                    <StatusBadge
                      status={a.isAssigned ? "approved" : "pending"}
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
        <div className="space-y-4">
          {pendingAMs.length === 0 ? (
            <div
              className="bg-white rounded-xl border border-border p-8 text-center"
              data-ocid="dm.approvals.empty_state"
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
              {pendingAMs.map((am, i) => (
                <div
                  key={am.id.toString()}
                  className="bg-white rounded-xl border border-border p-4 shadow-xs"
                  data-ocid={`dm.approval.item.${i + 1}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">{am.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {am.contact}
                      </p>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveAM(am.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                      data-ocid={`dm.approval.confirm_button.${i + 1}`}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectAM(am.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                      data-ocid={`dm.approval.delete_button.${i + 1}`}
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
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">
                Area Managers ({approvedAMs.length})
              </h3>
            </div>
            {approvedAMs.length === 0 ? (
              <div
                className="p-8 text-center"
                data-ocid="dm.managers.empty_state"
              >
                <Users
                  size={32}
                  className="mx-auto text-muted-foreground mb-2"
                />
                <p className="text-muted-foreground text-sm">
                  No approved area managers yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {approvedAMs.map((am, i) => (
                  <button
                    type="button"
                    key={am.id.toString()}
                    onClick={() => setSelectedAM(am)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary transition-colors text-left"
                    data-ocid={`dm.manager.item.${i + 1}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{am.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {am.contact}
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

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["send", "received"] as RequestSubTab[]).map((st) => (
              <button
                type="button"
                key={st}
                onClick={() => setReqSubTab(st)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                  reqSubTab === st
                    ? "bg-primary text-primary-foreground"
                    : "bg-white border border-border text-muted-foreground"
                }`}
                data-ocid={`dm.${st}.tab`}
              >
                {st}
              </button>
            ))}
          </div>

          {reqSubTab === "send" && (
            <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
              <h3 className="font-semibold mb-4">Send Blood Request</h3>
              {!showSendForm ? (
                <>
                  <div className="mb-3">
                    <label
                      htmlFor="dm-send-to"
                      className="block text-sm font-medium mb-1"
                    >
                      Send To
                    </label>
                    <select
                      id="dm-send-to"
                      className="form-input"
                      value={`${sendTargetRole}::${sendTargetId}`}
                      onChange={(e) => {
                        const [r, id] = e.target.value.split("::");
                        setSendTargetRole(r);
                        setSendTargetId(id);
                      }}
                      data-ocid="dm.send.select"
                    >
                      <option value="::">Select recipient</option>
                      <optgroup label="Area Managers">
                        {approvedAMs.map((am) => (
                          <option key={am.id.toString()} value={`am::${am.id}`}>
                            {am.username}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="District Managers">
                        {allDMs.map((dm) => (
                          <option key={dm.id.toString()} value={`dm::${dm.id}`}>
                            {dm.username}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn-danger w-full"
                    onClick={() => setShowSendForm(true)}
                    disabled={!sendTargetRole || !sendTargetId}
                    data-ocid="dm.send.primary_button"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Send size={16} /> Continue
                    </span>
                  </button>
                </>
              ) : (
                <BloodRequestForm
                  fromRole="dm"
                  fromId={dmId ?? 0n}
                  toRole={sendTargetRole}
                  toId={BigInt(sendTargetId || "0")}
                  onSuccess={() => {
                    setShowSendForm(false);
                    setSendTargetRole("");
                    setSendTargetId("");
                  }}
                  onCancel={() => setShowSendForm(false)}
                />
              )}
            </div>
          )}

          {reqSubTab === "received" && (
            <div>
              {receivedRequests.length === 0 ? (
                <div
                  className="bg-white rounded-xl border border-border p-8 text-center"
                  data-ocid="dm.requests.empty_state"
                >
                  <Inbox
                    size={32}
                    className="mx-auto text-muted-foreground mb-2"
                  />
                  <p className="text-muted-foreground text-sm">
                    No requests received
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedRequests.map((r, i) => (
                    <div
                      key={r.id.toString()}
                      className="bg-white rounded-xl border border-border p-4 shadow-xs"
                      data-ocid={`dm.request.item.${i + 1}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {r.patientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.hospitalName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Blood: {r.bloodGroup} &bull; {r.operationDate}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        <p>
                          Attender: {r.attenderName} &bull; {r.contact}
                        </p>
                        <p>Hospital: {r.hospitalAddress}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForwardingRequest(r)}
                        className="btn-secondary text-xs px-3 py-1.5 w-full"
                        data-ocid={`dm.request.edit_button.${i + 1}`}
                      >
                        Forward Request
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Bell size={18} className="text-destructive" /> Broadcast to Area
            Managers
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Sending to {approvedAMs.length} Area Managers.
          </p>
          <textarea
            className="form-input resize-none mb-3"
            rows={5}
            placeholder="Your notice..."
            value={noticeMsg}
            onChange={(e) => setNoticeMsg(e.target.value)}
            data-ocid="dm.notice.textarea"
          />
          <button
            type="button"
            className="btn-primary w-full"
            onClick={handleSendNotice}
            disabled={
              isSendingNotice || !noticeMsg.trim() || approvedAMs.length === 0
            }
            data-ocid="dm.notice.submit_button"
          >
            {isSendingNotice ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Sending...
              </span>
            ) : (
              `Send to ${approvedAMs.length} AMs`
            )}
          </button>
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && <FeedbackSection userRole="dm" />}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div data-ocid="dm.chat.section">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <MessageCircle size={18} className="text-destructive" /> Messages
          </h2>
          <ChatSection contacts={chatContacts} loadingContacts={chatLoading} />
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
              <label htmlFor="dm-un" className="block text-sm font-medium mb-1">
                Username
              </label>
              <input
                id="dm-un"
                className="form-input"
                value={editProfile.username}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, username: e.target.value }))
                }
                data-ocid="dm.profile.input"
              />
            </div>
            <div>
              <label htmlFor="dm-ct" className="block text-sm font-medium mb-1">
                Contact
              </label>
              <input
                id="dm-ct"
                className="form-input"
                value={editProfile.contact}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, contact: e.target.value }))
                }
              />
            </div>
            <div>
              <label htmlFor="dm-pw" className="block text-sm font-medium mb-1">
                New Password
              </label>
              <input
                id="dm-pw"
                type="password"
                className="form-input"
                value={editProfile.password}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            <div>
              <label htmlFor="dm-cp" className="block text-sm font-medium mb-1">
                Confirm Password
              </label>
              <input
                id="dm-cp"
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
              data-ocid="dm.profile.save_button"
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

      {selectedAM && (
        <AMAnalysisModal am={selectedAM} onClose={() => setSelectedAM(null)} />
      )}
      {forwardingRequest && (
        <ForwardModal
          ams={approvedAMs}
          otherDMs={allDMs}
          onForward={handleForward}
          onClose={() => setForwardingRequest(null)}
        />
      )}
    </div>
  );
}
