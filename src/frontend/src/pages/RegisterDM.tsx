import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNav } from "../App";
import type { DistrictDto } from "../backend";
import { saveStoredCred } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

export default function RegisterDM() {
  const { navigate } = useNav();
  const { actor } = useActor();
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    username: "",
    contact: "",
    password: "",
    confirmPassword: "",
    districtId: "",
  });

  useEffect(() => {
    if (!actor) return;
    actor
      .getDistricts()
      .then((all) => setDistricts(all.filter((d) => !d.isAssigned)))
      .catch(() => {});
  }, [actor]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.contact || !form.password || !form.districtId) {
      toast.error("Please fill all required fields");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!actor) {
      toast.error("Backend not ready, try again");
      return;
    }
    setIsSubmitting(true);
    try {
      const dm = await actor.registerDistrictManager(
        form.username,
        form.contact,
        form.password,
        BigInt(form.districtId),
      );
      saveStoredCred(form.contact, {
        id: dm.id.toString(),
        role: "dm",
        password: form.password,
        username: form.username,
        districtId: dm.districtId.toString(),
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
            Registration Submitted!
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your District Manager application is pending approval by the CEO.
            You will be able to login once approved.
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
              Register as District Manager
            </h1>
            <p className="text-xs text-muted-foreground">
              Requires CEO approval
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4"
        >
          <div>
            <label
              htmlFor="dm-username"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Username *
            </label>
            <input
              id="dm-username"
              className="form-input"
              placeholder="Full name"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              data-ocid="register_dm.input"
            />
          </div>
          <div>
            <label
              htmlFor="dm-contact"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Contact Number *
            </label>
            <input
              id="dm-contact"
              className="form-input"
              placeholder="Phone number"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="dm-password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Password *
            </label>
            <input
              id="dm-password"
              type="password"
              className="form-input"
              placeholder="Create password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="dm-confirm"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Confirm Password *
            </label>
            <input
              id="dm-confirm"
              type="password"
              className="form-input"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="dm-district"
              className="block text-sm font-medium text-foreground mb-1"
            >
              District *
            </label>
            <select
              id="dm-district"
              className="form-input"
              value={form.districtId}
              onChange={(e) => set("districtId", e.target.value)}
              data-ocid="register_dm.select"
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.id.toString()} value={d.id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
            {districts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No available districts. Wait for CEO to create one.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting}
            data-ocid="register_dm.submit_button"
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
