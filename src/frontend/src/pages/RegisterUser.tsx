import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNav } from "../App";
import type { DistrictDto } from "../backend";
import { saveStoredCred, useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

export default function RegisterUser() {
  const { navigate } = useNav();
  const { login } = useAuth();
  const { actor } = useActor();
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      .getApprovedDistrictManagers()
      .then(async (dms) => {
        const districtIds = new Set(dms.map((dm) => dm.districtId.toString()));
        const allDistricts = await actor.getDistricts();
        setDistricts(
          allDistricts.filter((d) => districtIds.has(d.id.toString())),
        );
      })
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
      toast.error("Backend not ready");
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await actor.registerUser(
        form.username,
        form.contact,
        form.password,
        BigInt(form.districtId),
      );
      saveStoredCred(form.contact, {
        id: user.id.toString(),
        role: "user",
        password: form.password,
        username: form.username,
        districtId: user.districtId.toString(),
      });
      login({
        role: "user",
        id: user.id,
        username: form.username,
        contact: form.contact,
        districtId: user.districtId,
      });
      toast.success("Registered successfully! Welcome.");
      navigate("dashboard");
    } catch (err) {
      toast.error(`Registration failed: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Register as User
            </h1>
            <p className="text-xs text-muted-foreground">
              Instant access after registration
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4"
        >
          <div>
            <label
              htmlFor="user-username"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Username *
            </label>
            <input
              id="user-username"
              className="form-input"
              placeholder="Full name"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              data-ocid="register_user.input"
            />
          </div>
          <div>
            <label
              htmlFor="user-contact"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Contact Number *
            </label>
            <input
              id="user-contact"
              className="form-input"
              placeholder="Phone number"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="user-password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Password *
            </label>
            <input
              id="user-password"
              type="password"
              className="form-input"
              placeholder="Create password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="user-confirm"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Confirm Password *
            </label>
            <input
              id="user-confirm"
              type="password"
              className="form-input"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="user-district"
              className="block text-sm font-medium text-foreground mb-1"
            >
              District *
            </label>
            <select
              id="user-district"
              className="form-input"
              value={form.districtId}
              onChange={(e) => set("districtId", e.target.value)}
              data-ocid="register_user.select"
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.id.toString()} value={d.id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
            {districts.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No districts with an approved manager yet.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting}
            data-ocid="register_user.submit_button"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Registering...
              </span>
            ) : (
              "Register & Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
