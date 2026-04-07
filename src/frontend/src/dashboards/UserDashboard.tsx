import { Heart, Loader2, Send, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  AreaDto,
  AreaManagerDto,
  DistrictDto,
  DistrictManagerDto,
} from "../backend";
import { BloodRequestForm } from "../components/BloodRequestForm";
import { ChatSection, useUserChatContacts } from "../components/ChatSection";
import { DonorForm } from "../components/DonorForm";
import { FeedbackSection } from "../components/FeedbackSection";
import {
  getStoredCreds,
  saveStoredCred,
  useAuth,
} from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

type Tab = "become-donor" | "request" | "feedback" | "chat" | "profile";
type SendTarget = "dm" | "am";

export default function UserDashboard() {
  const { session, login } = useAuth();
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<Tab>("become-donor");
  const [dms, setDms] = useState<DistrictManagerDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);

  // Send to DM state
  const [dmForRequest, setDmForRequest] = useState("");
  // Send to AM state
  const [sendTarget, setSendTarget] = useState<SendTarget>("dm");
  const [selectedDistrictForAM, setSelectedDistrictForAM] = useState("");
  const [selectedAMId, setSelectedAMId] = useState("");
  const [amsForDistrict, setAmsForDistrict] = useState<AreaManagerDto[]>([]);
  const [areasForDistrict, setAreasForDistrict] = useState<AreaDto[]>([]);
  const [loadingAMs, setLoadingAMs] = useState(false);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [donorSubmitted, setDonorSubmitted] = useState(false);
  const [editProfile, setEditProfile] = useState({
    username: session?.username ?? "",
    contact: session?.contact ?? "",
    password: "",
    confirmPassword: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const userId = session?.id;

  const { contacts: chatContacts, loading: chatLoading } =
    useUserChatContacts(userId);

  const loadData = useCallback(async () => {
    if (!actor) return;
    try {
      const [dmList, districtList] = await Promise.all([
        actor.getApprovedDistrictManagers(),
        actor.getDistricts(),
      ]);
      setDms(dmList);
      setDistricts(districtList);
    } catch {}
  }, [actor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = (e: Event) =>
      setActiveTab((e as CustomEvent).detail as Tab);
    window.addEventListener("bloodnet-tab-change", handler);
    return () => window.removeEventListener("bloodnet-tab-change", handler);
  }, []);

  // Load AMs for selected district
  useEffect(() => {
    if (!actor || !selectedDistrictForAM) {
      setAmsForDistrict([]);
      setAreasForDistrict([]);
      setSelectedAMId("");
      return;
    }
    const distId = BigInt(selectedDistrictForAM);
    setLoadingAMs(true);
    Promise.all([
      actor.getApprovedAreaManagersByDistrict(distId),
      actor.getAreasByDistrict(distId),
    ])
      .then(([ams, areas]) => {
        setAmsForDistrict(ams);
        setAreasForDistrict(areas);
        setSelectedAMId("");
      })
      .catch(() => {})
      .finally(() => setLoadingAMs(false));
  }, [actor, selectedDistrictForAM]);

  const getDistrictName = (districtId: bigint) =>
    districts.find((d) => d.id === districtId)?.name ?? "Unknown District";

  const getAreaName = (areaId: bigint) =>
    areasForDistrict.find((a) => a.id === areaId)?.name ?? "Area";

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

  const TAB_LABELS: Record<Tab, string> = {
    "become-donor": "Become Donor",
    request: "Send Request",
    feedback: "Feedback",
    chat: "Chat",
    profile: "Profile",
  };

  const toRole = sendTarget === "dm" ? "dm" : "am";
  const toId =
    sendTarget === "dm"
      ? BigInt(dmForRequest || "0")
      : BigInt(selectedAMId || "0");
  const canContinue = sendTarget === "dm" ? !!dmForRequest : !!selectedAMId;

  return (
    <div className="animate-slide-in-up">
      <div className="hidden md:flex gap-2 mb-6 flex-wrap">
        {(
          ["become-donor", "request", "feedback", "chat", "profile"] as Tab[]
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
            data-ocid={`user.${t}.tab`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Become Donor */}
      {activeTab === "become-donor" && (
        <div data-ocid="user.become_donor.section">
          {donorSubmitted ? (
            <div className="bg-white rounded-xl border border-border p-8 text-center shadow-xs">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Heart size={28} className="text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                You&apos;re a Donor!
              </h2>
              <p className="text-muted-foreground text-sm">
                Thank you for registering as a blood donor. Your information has
                been stored.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <Heart size={18} className="text-destructive" /> Become a Blood
                Donor
              </h2>
              <DonorForm
                prefillDistrictId={session?.districtId}
                onSuccess={() => setDonorSubmitted(true)}
              />
            </div>
          )}
        </div>
      )}

      {/* Request Tab */}
      {activeTab === "request" && (
        <div
          className="bg-white rounded-xl border border-border p-5 shadow-xs"
          data-ocid="user.request.section"
        >
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Send size={18} className="text-destructive" /> Send Blood Request
          </h2>

          {!showRequestForm ? (
            <div className="space-y-4">
              {/* Target type toggle */}
              <div>
                <p className="block text-sm font-medium mb-2">Send To</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSendTarget("dm");
                      setSelectedDistrictForAM("");
                      setSelectedAMId("");
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      sendTarget === "dm"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border text-muted-foreground hover:bg-secondary"
                    }`}
                    data-ocid="user.request.dm.toggle"
                  >
                    District Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSendTarget("am");
                      setDmForRequest("");
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      sendTarget === "am"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border text-muted-foreground hover:bg-secondary"
                    }`}
                    data-ocid="user.request.am.toggle"
                  >
                    Area Manager
                  </button>
                </div>
              </div>

              {/* DM selection */}
              {sendTarget === "dm" && (
                <div>
                  <label
                    htmlFor="u-dm-sel"
                    className="block text-sm font-medium mb-1"
                  >
                    Select District Manager
                  </label>
                  <select
                    id="u-dm-sel"
                    className="form-input"
                    value={dmForRequest}
                    onChange={(e) => setDmForRequest(e.target.value)}
                    data-ocid="user.request.select"
                  >
                    <option value="">Select DM</option>
                    {dms.map((dm) => (
                      <option key={dm.id.toString()} value={dm.id.toString()}>
                        {getDistrictName(dm.districtId)} - {dm.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* AM selection: district first, then AM */}
              {sendTarget === "am" && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="u-district-sel"
                      className="block text-sm font-medium mb-1"
                    >
                      Select District
                    </label>
                    <select
                      id="u-district-sel"
                      className="form-input"
                      value={selectedDistrictForAM}
                      onChange={(e) => setSelectedDistrictForAM(e.target.value)}
                      data-ocid="user.request.district.select"
                    >
                      <option value="">Select district</option>
                      {districts.map((d) => (
                        <option key={d.id.toString()} value={d.id.toString()}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDistrictForAM && (
                    <div>
                      <label
                        htmlFor="u-am-sel"
                        className="block text-sm font-medium mb-1"
                      >
                        Select Area Manager
                      </label>
                      {loadingAMs ? (
                        <div
                          className="flex items-center gap-2 py-3 text-sm text-muted-foreground"
                          data-ocid="user.request.am.loading_state"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading
                          area managers...
                        </div>
                      ) : amsForDistrict.length === 0 ? (
                        <p
                          className="text-sm text-muted-foreground py-2"
                          data-ocid="user.request.am.empty_state"
                        >
                          No area managers in this district yet.
                        </p>
                      ) : (
                        <select
                          id="u-am-sel"
                          className="form-input"
                          value={selectedAMId}
                          onChange={(e) => setSelectedAMId(e.target.value)}
                          data-ocid="user.request.am.select"
                        >
                          <option value="">Select area manager</option>
                          {amsForDistrict.map((am) => (
                            <option
                              key={am.id.toString()}
                              value={am.id.toString()}
                            >
                              {am.username} — {getAreaName(am.areaId)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="btn-danger w-full"
                onClick={() => setShowRequestForm(true)}
                disabled={!canContinue}
                data-ocid="user.request.primary_button"
              >
                <span className="flex items-center justify-center gap-2">
                  <Send size={16} /> Continue
                </span>
              </button>
            </div>
          ) : (
            <BloodRequestForm
              fromRole="user"
              fromId={userId ?? 0n}
              toRole={toRole}
              toId={toId}
              onSuccess={() => {
                setShowRequestForm(false);
                setDmForRequest("");
                setSelectedAMId("");
                setSelectedDistrictForAM("");
              }}
              onCancel={() => setShowRequestForm(false)}
            />
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && <FeedbackSection userRole="user" />}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div data-ocid="user.chat.section">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Send size={18} className="text-destructive" /> Messages
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
              <label
                htmlFor="u-prof-un"
                className="block text-sm font-medium mb-1"
              >
                Username
              </label>
              <input
                id="u-prof-un"
                className="form-input"
                value={editProfile.username}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, username: e.target.value }))
                }
                data-ocid="user.profile.input"
              />
            </div>
            <div>
              <label
                htmlFor="u-prof-ct"
                className="block text-sm font-medium mb-1"
              >
                Contact
              </label>
              <input
                id="u-prof-ct"
                className="form-input"
                value={editProfile.contact}
                onChange={(e) =>
                  setEditProfile((p) => ({ ...p, contact: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="u-prof-pw"
                className="block text-sm font-medium mb-1"
              >
                New Password
              </label>
              <input
                id="u-prof-pw"
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
                htmlFor="u-prof-cp"
                className="block text-sm font-medium mb-1"
              >
                Confirm Password
              </label>
              <input
                id="u-prof-cp"
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
              data-ocid="user.profile.save_button"
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
    </div>
  );
}
