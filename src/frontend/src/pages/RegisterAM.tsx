import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNav } from "../App";
import type { AreaDto, DistrictDto } from "../backend";
import { saveStoredCred } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

export default function RegisterAM() {
  const { navigate } = useNav();
  const { actor } = useActor();
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    username: "",
    contact: "",
    password: "",
    confirmPassword: "",
    districtId: "",
    areaId: "",
  });

  useEffect(() => {
    if (!actor) return;
    actor
      .getApprovedDistrictManagers()
      .then(async (dms) => {
        const districtIds = dms.map((dm) => dm.districtId);
        const allDistricts = await actor.getDistricts();
        setDistricts(
          allDistricts.filter((d) => districtIds.some((id) => id === d.id)),
        );
      })
      .catch(() => {});
  }, [actor]);

  useEffect(() => {
    if (!actor || !form.districtId) {
      setAreas([]);
      return;
    }
    actor
      .getAreasByDistrict(BigInt(form.districtId))
      .then((all) => setAreas(all.filter((a) => !a.isAssigned)))
      .catch(() => {});
  }, [actor, form.districtId]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.username ||
      !form.contact ||
      !form.password ||
      !form.districtId ||
      !form.areaId
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!actor) {
      toast.error("Backend not ready");
      return;
    }
    setIsSubmitting(true);
    try {
      const am = await actor.registerAreaManager(
        form.username,
        form.contact,
        form.password,
        BigInt(form.districtId),
        BigInt(form.areaId),
      );
      saveStoredCred(form.contact, {
        id: am.id.toString(),
        role: "am",
        password: form.password,
        username: form.username,
        districtId: am.districtId.toString(),
        areaId: am.areaId.toString(),
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(`Registration failed: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-border p-8 text-center shadow-card">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Application Submitted!
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your Area Manager registration is pending approval by the District
            Manager.
          </p>
          <button
            type="button"
            onClick={() => navigate("login")}
            className="btn-primary"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate("login")}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Register as Area Manager
            </h1>
            <p className="text-xs text-muted-foreground">
              Requires District Manager approval
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4"
        >
          <div>
            <label
              htmlFor="am-username"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Username *
            </label>
            <input
              id="am-username"
              className="form-input"
              placeholder="Full name"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              data-ocid="register_am.input"
            />
          </div>
          <div>
            <label
              htmlFor="am-contact"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Contact Number *
            </label>
            <input
              id="am-contact"
              className="form-input"
              placeholder="Phone number"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="am-password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Password *
            </label>
            <input
              id="am-password"
              type="password"
              className="form-input"
              placeholder="Create password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="am-confirm"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Confirm Password *
            </label>
            <input
              id="am-confirm"
              type="password"
              className="form-input"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="am-district"
              className="block text-sm font-medium text-foreground mb-1"
            >
              District *
            </label>
            <select
              id="am-district"
              className="form-input"
              value={form.districtId}
              onChange={(e) => {
                set("districtId", e.target.value);
                set("areaId", "");
              }}
              data-ocid="register_am.select"
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.id.toString()} value={d.id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="am-area"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Area *
            </label>
            <select
              id="am-area"
              className="form-input"
              value={form.areaId}
              onChange={(e) => set("areaId", e.target.value)}
              disabled={!form.districtId}
            >
              <option value="">Select area</option>
              {areas.map((a) => (
                <option key={a.id.toString()} value={a.id.toString()}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting}
            data-ocid="register_am.submit_button"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Registering...
              </span>
            ) : (
              "Register"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
