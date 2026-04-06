import { Heart, Loader2, Send, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DistrictDto, DistrictManagerDto } from "../backend";
import { BloodRequestForm } from "../components/BloodRequestForm";
import { DonorForm } from "../components/DonorForm";
import {
  getStoredCreds,
  saveStoredCred,
  useAuth,
} from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

type Tab = "become-donor" | "request" | "profile";

export default function UserDashboard() {
  const { session, login } = useAuth();
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<Tab>("become-donor");
  const [dms, setDms] = useState<DistrictManagerDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [dmForRequest, setDmForRequest] = useState("");
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

  const getDistrictName = (districtId: bigint) =>
    districts.find((d) => d.id === districtId)?.name ?? "Unknown District";

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

  return (
    <div className="animate-slide-in-up">
      <div className="hidden md:flex gap-2 mb-6">
        {(["become-donor", "request", "profile"] as Tab[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
              activeTab === t
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border text-muted-foreground hover:bg-secondary"
            }`}
            data-ocid={`user.${t}.tab`}
          >
            {t.replace("-", " ")}
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
                You're a Donor!
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
            <>
              <div className="mb-3">
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
              <button
                type="button"
                className="btn-danger w-full"
                onClick={() => setShowRequestForm(true)}
                disabled={!dmForRequest}
                data-ocid="user.request.primary_button"
              >
                <span className="flex items-center justify-center gap-2">
                  <Send size={16} /> Continue
                </span>
              </button>
            </>
          ) : (
            <BloodRequestForm
              fromRole="user"
              fromId={userId ?? 0n}
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
