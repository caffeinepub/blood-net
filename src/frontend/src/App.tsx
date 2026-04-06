import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterAM from "./pages/RegisterAM";
import RegisterDM from "./pages/RegisterDM";
import RegisterUser from "./pages/RegisterUser";

export type PageName =
  | "login"
  | "register-dm"
  | "register-am"
  | "register-user"
  | "dashboard";

// Simple state-based navigation context
import { type ReactNode, createContext, useContext, useState } from "react";

interface NavContextType {
  page: PageName;
  navigate: (p: PageName) => void;
}

const NavContext = createContext<NavContextType | null>(null);

export function useNav(): NavContextType {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be inside NavProvider");
  return ctx;
}

function AppContent() {
  const { session, isLoading } = useAuth();
  const { page } = useNav();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center animate-pulse">
            <span className="text-white text-xl">🩸</span>
          </div>
          <p className="text-muted-foreground text-sm">Loading Blood Net...</p>
        </div>
      </div>
    );
  }

  // Auto-redirect
  if (session && page !== "dashboard") {
    return <DashboardPage />;
  }
  if (!session && page === "dashboard") {
    return <LoginPage />;
  }

  switch (page) {
    case "register-dm":
      return <RegisterDM />;
    case "register-am":
      return <RegisterAM />;
    case "register-user":
      return <RegisterUser />;
    case "dashboard":
      return <DashboardPage />;
    default:
      return <LoginPage />;
  }
}

export default function App() {
  const [page, setPage] = useState<PageName>("login");

  const navigate = (p: PageName) => setPage(p);

  return (
    <NavContext.Provider value={{ page, navigate }}>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </NavContext.Provider>
  );
}
