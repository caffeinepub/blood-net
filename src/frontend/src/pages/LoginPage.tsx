import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNav } from "../App";
import { DistrictManagerStatus } from "../backend";
import {
  type SessionRole,
  getCeoProfile,
  getStoredCreds,
  useAuth,
} from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

type RoleTab = "ceo" | "dm" | "am" | "user";

export default function LoginPage() {
  const { navigate } = useNav();
  const { login } = useAuth();
  const { actor } = useActor();
  const [role, setRole] = useState<RoleTab>("user");
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      if (role === "ceo") {
        const ceo = getCeoProfile();
        if (
          form.identifier === ceo.username &&
          form.password === ceo.password
        ) {
          login({
            role: "ceo",
            id: 0n,
            username: ceo.username,
            contact: ceo.contact,
          });
          navigate("dashboard");
        } else {
          toast.error("Invalid CEO credentials");
        }
        return;
      }

      const creds = getStoredCreds();
      const contact = form.identifier;
      const stored = creds[contact];

      if (!stored) {
        toast.error("Account not found. Please register first.");
        return;
      }

      if (stored.password !== form.password) {
        toast.error("Incorrect password");
        return;
      }

      if (stored.role !== (role as SessionRole)) {
        toast.error(
          `This account is registered as ${stored.role}, not ${role}`,
        );
        return;
      }

      if (role === "dm" && actor) {
        const id = BigInt(stored.id);
        const dm = await actor.getDistrictManager(id);
        if (dm.status !== DistrictManagerStatus.approved) {
          toast.error("Your account is pending approval by the CEO.");
          return;
        }
        login({
          role: "dm",
          id,
          username: stored.username,
          contact,
          districtId: stored.districtId ? BigInt(stored.districtId) : undefined,
        });
        navigate("dashboard");
        return;
      }

      if (role === "am" && actor) {
        const id = BigInt(stored.id);
        const am = await actor.getAreaManager(id);
        if (am.status !== "approved") {
          toast.error(
            "Your account is pending approval by the District Manager.",
          );
          return;
        }
        login({
          role: "am",
          id,
          username: stored.username,
          contact,
          districtId: stored.districtId ? BigInt(stored.districtId) : undefined,
          areaId: stored.areaId ? BigInt(stored.areaId) : undefined,
        });
        navigate("dashboard");
        return;
      }

      if (role === "user") {
        login({
          role: "user",
          id: BigInt(stored.id),
          username: stored.username,
          contact,
          districtId: stored.districtId ? BigInt(stored.districtId) : undefined,
        });
        navigate("dashboard");
        return;
      }

      toast.error("Login failed. Please try again.");
    } catch (err) {
      toast.error(`Login error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const ROLE_LABELS: Record<RoleTab, string> = {
    ceo: "CEO",
    dm: "District Manager",
    am: "Area Manager",
    user: "User",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-destructive flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Blood droplet"
                role="img"
              >
                <title>Blood droplet</title>
                <path
                  d="M12 2L7 9.5C5.5 12 5 13.5 5 15C5 18.866 8.134 22 12 22C15.866 22 19 18.866 19 15C19 13.5 18.5 12 17 9.5L12 2Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Blood Net</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Blood Donation Management System
          </p>
        </div>

        {/* Role Tabs */}
        <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
          <div
            className="grid grid-cols-4 border-b border-border"
            data-ocid="login.tab"
          >
            {(["ceo", "dm", "am", "user"] as RoleTab[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-3 text-xs font-semibold transition-all ${
                  role === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
                data-ocid={`login.${r}.tab`}
              >
                {r === "ceo"
                  ? "CEO"
                  : r === "dm"
                    ? "DM"
                    : r === "am"
                      ? "AM"
                      : "User"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Login as {ROLE_LABELS[role]}
            </h2>

            <div>
              <label
                htmlFor="login-identifier"
                className="block text-sm font-medium text-foreground mb-1"
              >
                {role === "ceo" ? "Username" : "Contact Number"}
              </label>
              <input
                id="login-identifier"
                className="form-input"
                placeholder={
                  role === "ceo" ? "Enter username" : "Enter contact number"
                }
                value={form.identifier}
                onChange={(e) => set("identifier", e.target.value)}
                autoComplete="username"
                data-ocid="login.input"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
              data-ocid="login.submit_button"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Logging in...
                </span>
              ) : (
                `Login as ${ROLE_LABELS[role]}`
              )}
            </button>
          </form>
        </div>

        {/* Registration links */}
        {role !== "ceo" && (
          <div className="mt-4 bg-white rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Don't have an account?
            </p>
            <div className="space-y-2">
              {role === "dm" && (
                <button
                  type="button"
                  onClick={() => navigate("register-dm")}
                  className="block w-full text-center text-sm font-semibold text-destructive hover:underline"
                  data-ocid="login.register_dm.link"
                >
                  Register as District Manager →
                </button>
              )}
              {role === "am" && (
                <button
                  type="button"
                  onClick={() => navigate("register-am")}
                  className="block w-full text-center text-sm font-semibold text-destructive hover:underline"
                  data-ocid="login.register_am.link"
                >
                  Register as Area Manager →
                </button>
              )}
              {role === "user" && (
                <button
                  type="button"
                  onClick={() => navigate("register-user")}
                  className="block w-full text-center text-sm font-semibold text-destructive hover:underline"
                  data-ocid="login.register_user.link"
                >
                  Register as User →
                </button>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()}. Built with &hearts; using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
