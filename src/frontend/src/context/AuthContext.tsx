import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type SessionRole = "ceo" | "dm" | "am" | "user";

export interface Session {
  role: SessionRole;
  id: bigint;
  username: string;
  contact: string;
  districtId?: bigint;
  areaId?: bigint;
}

export interface StoredCred {
  id: string; // bigint as string
  role: SessionRole;
  password: string;
  username: string;
  districtId?: string;
  areaId?: string;
}

export interface StoredCreds {
  [contact: string]: StoredCred;
}

export interface CeoProfile {
  username: string;
  password: string;
  contact: string;
}

interface AuthContextType {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "bloodnet_session";
const CREDS_KEY = "bloodnet_creds";
const CEO_KEY = "bloodnet_ceo";

export const DEFAULT_CEO: CeoProfile = {
  username: "TNTJ BLOOD WING",
  password: "TNTJBW",
  contact: "0000000000",
};

export function getCeoProfile(): CeoProfile {
  const stored = localStorage.getItem(CEO_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return DEFAULT_CEO;
}

export function saveCeoProfile(profile: CeoProfile): void {
  localStorage.setItem(CEO_KEY, JSON.stringify(profile));
}

export function getStoredCreds(): StoredCreds {
  const stored = localStorage.getItem(CREDS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {};
}

export function saveStoredCred(contact: string, cred: StoredCred): void {
  const creds = getStoredCreds();
  creds[contact] = cred;
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export function removeStoredCred(contact: string): void {
  const creds = getStoredCreds();
  delete creds[contact];
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

function serializeSession(s: Session): object {
  return {
    ...s,
    id: s.id.toString(),
    districtId: s.districtId?.toString(),
    areaId: s.areaId?.toString(),
  };
}

function deserializeSession(raw: Record<string, string>): Session {
  return {
    role: raw.role as SessionRole,
    id: BigInt(raw.id),
    username: raw.username,
    contact: raw.contact,
    districtId: raw.districtId ? BigInt(raw.districtId) : undefined,
    areaId: raw.areaId ? BigInt(raw.areaId) : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const raw = JSON.parse(stored);
        setSession(deserializeSession(raw));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (s: Session) => {
    setSession(s);
    localStorage.setItem(SESSION_KEY, JSON.stringify(serializeSession(s)));
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ session, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
