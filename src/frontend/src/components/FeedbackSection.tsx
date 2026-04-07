import { Flag, Loader2, MessageSquare, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AreaManagerDto, DistrictManagerDto } from "../backend";

interface FeedbackDto {
  id: bigint;
  fromRole: string;
  fromId: bigint;
  toRole: string;
  toId?: bigint;
  itemType: string;
  message: string;
  createdAt: bigint;
}
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

type FeedbackSubTab = "feedback" | "complaints";

interface FeedbackSectionProps {
  userRole: "ceo" | "dm" | "am" | "user";
}

function formatTs(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackSection({ userRole }: FeedbackSectionProps) {
  const [subTab, setSubTab] = useState<FeedbackSubTab>("feedback");

  if (userRole === "ceo") {
    return <CEOFeedbackView />;
  }

  return (
    <div className="space-y-4" data-ocid="feedback.section">
      <div className="flex gap-2">
        {(["feedback", "complaints"] as FeedbackSubTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
              subTab === t
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border text-muted-foreground hover:bg-secondary"
            }`}
            data-ocid={`feedback.${t}.tab`}
          >
            {t === "feedback" ? "App Feedback" : "Complaints"}
          </button>
        ))}
      </div>

      {subTab === "feedback" && <GeneralFeedbackForm />}
      {subTab === "complaints" && <ComplaintsView userRole={userRole} />}
    </div>
  );
}

function GeneralFeedbackForm() {
  const { session } = useAuth();
  const { actor } = useActor();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !actor || !session) return;
    setSubmitting(true);
    try {
      // @ts-ignore - new backend method
      await actor.submitFeedback(
        session.role,
        session.id,
        "system",
        null,
        "feedback",
        message.trim(),
      );
      toast.success("Feedback submitted! Thank you.");
      setMessage("");
    } catch (err) {
      toast.error(`Failed to submit feedback: ${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="bg-white rounded-xl border border-border p-5 shadow-xs"
      data-ocid="feedback.form.section"
    >
      <h3 className="font-bold mb-2 flex items-center gap-2">
        <MessageSquare size={16} className="text-destructive" /> General App
        Feedback
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Share your thoughts, suggestions, or report issues with the app.
      </p>
      <textarea
        className="form-input resize-none mb-3 min-h-[120px]"
        placeholder="Write your feedback here..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        data-ocid="feedback.textarea"
      />
      <button
        type="button"
        className="btn-primary w-full"
        onClick={handleSubmit}
        disabled={submitting || !message.trim()}
        data-ocid="feedback.submit_button"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Send size={14} /> Submit Feedback
          </span>
        )}
      </button>
    </div>
  );
}

function ComplaintsView({ userRole }: { userRole: string }) {
  const { session } = useAuth();
  const { actor } = useActor();
  const [message, setMessage] = useState("");
  const [targetId, setTargetId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dms, setDms] = useState<DistrictManagerDto[]>([]);
  const [ams, setAms] = useState<AreaManagerDto[]>([]);
  const [receivedComplaints, setReceivedComplaints] = useState<FeedbackDto[]>(
    [],
  );
  const [loadingReceived, setLoadingReceived] = useState(false);

  const loadData = useCallback(async () => {
    if (!actor || !session) return;
    try {
      const [dmList, amList] = await Promise.all([
        actor.getApprovedDistrictManagers(),
        (actor as any).getAllApprovedAreaManagers
          ? // @ts-ignore - new backend method
            (actor as any).getAllApprovedAreaManagers()
          : Promise.resolve([] as AreaManagerDto[]),
      ]);
      setDms(dmList.filter((d) => d.id !== session.id || userRole !== "dm"));
      setAms(
        (amList as AreaManagerDto[]).filter(
          (a) => a.id !== session.id || userRole !== "am",
        ),
      );

      if (userRole === "dm") {
        setLoadingReceived(true);
        try {
          // @ts-ignore
          const complaints = await actor.getFeedbackForDashboard(
            "dm",
            session.id,
          );
          setReceivedComplaints(
            (complaints as FeedbackDto[]).filter(
              (f) => f.itemType === "complaint",
            ),
          );
        } catch {
          setReceivedComplaints([]);
        } finally {
          setLoadingReceived(false);
        }
      }
    } catch (err) {
      toast.error(`Failed to load data: ${err}`);
    }
  }, [actor, session, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!message.trim() || !actor || !session || !targetId) return;
    setSubmitting(true);
    try {
      const [targetRole, tId] = targetId.split("::");
      const targetBigId = BigInt(tId);

      let toRole = "ceo";
      let toId: bigint | null = null;

      if (userRole === "dm") {
        // DM complaining about another DM -> goes to CEO
        toRole = "ceo";
        toId = null;
      } else if (userRole === "am") {
        if (targetRole === "dm") {
          // AM complaining about a DM -> goes to the AM's own supervising DM
          const supervisingDM = dms.find(
            (d) => d.districtId === session.districtId,
          );
          toRole = "dm";
          toId = supervisingDM?.id ?? null;
        } else if (targetRole === "am") {
          // AM complaining about another AM -> goes to target AM's district DM
          const targetAM = ams.find((a) => a.id === targetBigId);
          if (targetAM) {
            const targetDM = dms.find(
              (d) => d.districtId === targetAM.districtId,
            );
            toRole = "dm";
            toId = targetDM?.id ?? null;
          }
        }
      } else if (userRole === "user") {
        // User complaining about an AM -> goes to that AM's district DM
        const targetAM = ams.find((a) => a.id === targetBigId);
        if (targetAM) {
          const targetDM = dms.find(
            (d) => d.districtId === targetAM.districtId,
          );
          toRole = "dm";
          toId = targetDM?.id ?? null;
        }
      }

      const fullMessage = `[Against: ${targetRole.toUpperCase()} #${tId}] ${message.trim()}`;

      // @ts-ignore - new backend method
      await actor.submitFeedback(
        session.role,
        session.id,
        toRole,
        toId,
        "complaint",
        fullMessage,
      );
      toast.success("Complaint submitted.");
      setMessage("");
      setTargetId("");
    } catch (err) {
      toast.error(`Failed to submit complaint: ${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const targetOptions = () => {
    if (userRole === "dm") {
      return dms.map((dm) => ({
        value: `dm::${dm.id}`,
        label: `${dm.username} (District Manager)`,
      }));
    }
    if (userRole === "am") {
      return [
        ...dms.map((dm) => ({
          value: `dm::${dm.id}`,
          label: `${dm.username} (District Manager)`,
        })),
        ...ams.map((am) => ({
          value: `am::${am.id}`,
          label: `${am.username} (Area Manager)`,
        })),
      ];
    }
    if (userRole === "user") {
      return ams.map((am) => ({
        value: `am::${am.id}`,
        label: `${am.username} (Area Manager)`,
      }));
    }
    return [];
  };

  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-xl border border-border p-5 shadow-xs"
        data-ocid="complaint.form.section"
      >
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Flag size={16} className="text-red-500" /> Submit a Complaint
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {userRole === "dm"
            ? "Complaints against another DM will be sent to the CEO."
            : userRole === "am"
              ? "Complaints are routed to the relevant District Manager."
              : "Complaints are routed to the Area Manager's District Manager."}
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="complaint-target"
              className="block text-sm font-medium mb-1"
            >
              Complaint Against
            </label>
            <select
              id="complaint-target"
              className="form-input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              data-ocid="complaint.select"
            >
              <option value="">Select a person</option>
              {targetOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="complaint-msg"
              className="block text-sm font-medium mb-1"
            >
              Complaint Details
            </label>
            <textarea
              id="complaint-msg"
              className="form-input resize-none min-h-[100px]"
              placeholder="Describe your complaint in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-ocid="complaint.textarea"
            />
          </div>
          <button
            type="button"
            className="btn-danger w-full"
            onClick={handleSubmit}
            disabled={submitting || !message.trim() || !targetId}
            data-ocid="complaint.submit_button"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Flag size={14} /> Submit Complaint
              </span>
            )}
          </button>
        </div>
      </div>

      {/* DM sees received complaints */}
      {userRole === "dm" && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Flag size={14} className="text-red-500" /> Received Complaints
          </h3>
          {loadingReceived ? (
            <div
              className="flex justify-center py-8"
              data-ocid="complaints.received.loading_state"
            >
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : receivedComplaints.length === 0 ? (
            <div
              className="bg-white rounded-xl border border-border p-8 text-center"
              data-ocid="complaints.received.empty_state"
            >
              <Flag size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No complaints received
              </p>
            </div>
          ) : (
            receivedComplaints.map((c, i) => (
              <div
                key={c.id.toString()}
                className="bg-white rounded-xl border border-red-100 p-4 shadow-xs"
                data-ocid={`complaints.received.item.${i + 1}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                      {c.fromRole}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID #{c.fromId.toString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTs(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground">{c.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CEOFeedbackView() {
  const { actor } = useActor();
  const [subTab, setSubTab] = useState<"complaints" | "app-feedback">(
    "complaints",
  );
  const [allFeedback, setAllFeedback] = useState<FeedbackDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      // @ts-ignore - new backend method
      const items: FeedbackDto[] = await actor.getAllFeedback();
      setAllFeedback(items);
    } catch {
      setAllFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const complaints = allFeedback.filter(
    (f) => f.itemType === "complaint" && f.toRole === "ceo",
  );
  const appFeedback = allFeedback.filter((f) => f.itemType === "feedback");

  return (
    <div className="space-y-4" data-ocid="ceo.feedback.section">
      <div className="flex gap-2">
        {(["complaints", "app-feedback"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              subTab === t
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border text-muted-foreground hover:bg-secondary"
            }`}
            data-ocid={`ceo.feedback.${t}.tab`}
          >
            {t === "complaints" ? "DM Complaints" : "App Feedback"}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="flex justify-center py-12"
          data-ocid="ceo.feedback.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {(subTab === "complaints" ? complaints : appFeedback).length === 0 ? (
            <div
              className="bg-white rounded-xl border border-border p-8 text-center"
              data-ocid="ceo.feedback.empty_state"
            >
              <Flag size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No {subTab === "complaints" ? "complaints" : "feedback"} yet
              </p>
            </div>
          ) : (
            (subTab === "complaints" ? complaints : appFeedback).map((f, i) => (
              <div
                key={f.id.toString()}
                className="bg-white rounded-xl border border-border p-4 shadow-xs"
                data-ocid={`ceo.feedback.item.${i + 1}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${
                        subTab === "complaints"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {f.fromRole}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID #{f.fromId.toString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTs(f.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground">{f.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
