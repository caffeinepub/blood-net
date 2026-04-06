import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { NavBar } from "./NavBar";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-primary text-primary-foreground fixed left-0 top-0 bottom-0 z-20">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-destructive flex items-center justify-center flex-shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Blood droplet icon"
              role="img"
            >
              <title>Blood droplet</title>
              <path
                d="M12 2L7 9.5C5.5 12 5 13.5 5 15C5 18.866 8.134 22 12 22C15.866 22 19 18.866 19 15C19 13.5 18.5 12 17 9.5L12 2Z"
                fill="white"
              />
            </svg>
          </div>
          <div>
            <div className="font-bold text-base text-white leading-tight">
              Blood Net
            </div>
            <div className="text-xs text-white/60 capitalize">
              {session?.role} Panel
            </div>
          </div>
        </div>
        <NavBar variant="sidebar" />
        <div className="mt-auto px-6 py-4 border-t border-white/10">
          <div className="text-xs text-white/40">
            &copy; {new Date().getFullYear()}. Built with &hearts; using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/70 transition-colors"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center flex-shrink-0">
            <svg
              width="16"
              height="16"
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
          <span className="font-bold text-white">Blood Net</span>
          {title && (
            <span className="ml-auto text-xs text-white/60 truncate">
              {title}
            </span>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

        {/* Mobile Bottom Footer */}
        <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-10">
          <div className="text-center py-1 text-[10px] text-muted-foreground">
            &copy; {new Date().getFullYear()}. Built with &hearts; using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              caffeine.ai
            </a>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Nav */}
      <NavBar variant="bottom" />
    </div>
  );
}
