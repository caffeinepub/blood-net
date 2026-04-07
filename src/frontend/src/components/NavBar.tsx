import {
  BarChart2,
  Bell,
  CheckSquare,
  Flag,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  PlusCircle,
  Send,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  label: string;
  tab: string;
  icon: React.ReactNode;
}

const CEO_TABS: NavItem[] = [
  { label: "Districts", tab: "districts", icon: <MapPin size={20} /> },
  { label: "Approvals", tab: "approvals", icon: <CheckSquare size={20} /> },
  { label: "Managers", tab: "managers", icon: <Users size={20} /> },
  { label: "Notices", tab: "notices", icon: <Bell size={20} /> },
  { label: "Feedback", tab: "feedback", icon: <Flag size={20} /> },
  { label: "Chat", tab: "chat", icon: <MessageCircle size={20} /> },
  { label: "Profile", tab: "profile", icon: <User size={20} /> },
];

const DM_TABS: NavItem[] = [
  { label: "Areas", tab: "areas", icon: <MapPin size={20} /> },
  { label: "Approvals", tab: "approvals", icon: <CheckSquare size={20} /> },
  { label: "Managers", tab: "managers", icon: <Users size={20} /> },
  { label: "Requests", tab: "requests", icon: <Send size={20} /> },
  { label: "Notices", tab: "notices", icon: <Bell size={20} /> },
  { label: "Feedback", tab: "feedback", icon: <Flag size={20} /> },
  { label: "Chat", tab: "chat", icon: <MessageCircle size={20} /> },
  { label: "Profile", tab: "profile", icon: <User size={20} /> },
];

const AM_TABS: NavItem[] = [
  { label: "Overview", tab: "overview", icon: <BarChart2 size={20} /> },
  { label: "Donors", tab: "donors", icon: <Heart size={20} /> },
  { label: "Add Donor", tab: "add-donor", icon: <PlusCircle size={20} /> },
  { label: "Requests", tab: "requests", icon: <Send size={20} /> },
  { label: "Feedback", tab: "feedback", icon: <Flag size={20} /> },
  { label: "Chat", tab: "chat", icon: <MessageCircle size={20} /> },
  { label: "Profile", tab: "profile", icon: <User size={20} /> },
];

const USER_TABS: NavItem[] = [
  { label: "Become Donor", tab: "become-donor", icon: <Heart size={20} /> },
  { label: "Request", tab: "request", icon: <Send size={20} /> },
  { label: "Feedback", tab: "feedback", icon: <Flag size={20} /> },
  { label: "Chat", tab: "chat", icon: <MessageCircle size={20} /> },
  { label: "Profile", tab: "profile", icon: <User size={20} /> },
];

const ROLE_TABS = {
  ceo: CEO_TABS,
  dm: DM_TABS,
  am: AM_TABS,
  user: USER_TABS,
};

interface NavBarProps {
  variant: "sidebar" | "bottom";
}

export function triggerTabChange(tab: string) {
  window.dispatchEvent(new CustomEvent("bloodnet-tab-change", { detail: tab }));
}

export function NavBar({ variant }: NavBarProps) {
  const { session, logout } = useAuth();
  if (!session) return null;

  const tabs = ROLE_TABS[session.role];

  const handleTab = (tab: string) => {
    triggerTabChange(tab);
  };

  const handleLogout = () => {
    logout();
  };

  if (variant === "sidebar") {
    return (
      <nav className="flex-1 px-3 py-4 space-y-1">
        {tabs.map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => handleTab(item.tab)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
            data-ocid={`nav.${item.tab}.link`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all mt-4"
          data-ocid="nav.logout.button"
        >
          <LogOut size={20} />
          Logout
        </button>
      </nav>
    );
  }

  // Bottom nav (mobile) — max 5 visible
  const visibleTabs = tabs.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-6 left-0 right-0 z-20 flex justify-center px-3">
      <div className="bg-white rounded-2xl shadow-lg border border-border flex items-center px-2 py-1 gap-1">
        {visibleTabs.map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => handleTab(item.tab)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all min-w-[52px]"
            data-ocid={`nav.${item.tab}.link`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all min-w-[52px]"
          data-ocid="nav.logout.button"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
