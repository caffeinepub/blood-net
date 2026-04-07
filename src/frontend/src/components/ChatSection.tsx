import { Loader2, MessageCircle, Send, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AreaManagerDto, DistrictManagerDto, UserDto } from "../backend";

interface MessageDto {
  id: bigint;
  fromRole: string;
  fromId: bigint;
  toRole: string;
  toId: bigint;
  content: string;
  createdAt: bigint;
}
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

interface Contact {
  id: bigint;
  role: string;
  name: string;
  contact: string;
  subtitle?: string;
}

interface ChatSectionProps {
  contacts: Contact[];
  loadingContacts: boolean;
}

function formatTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

export function ChatSection({ contacts, loadingContacts }: ChatSectionProps) {
  const { session } = useAuth();
  const { actor } = useActor();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(
    async (contact: Contact) => {
      if (!actor || !session) return;
      try {
        // @ts-ignore - new backend method
        const msgs: MessageDto[] = await actor.getMessagesInThread(
          session.role,
          session.id,
          contact.role,
          contact.id,
        );
        setMessages(msgs.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
      } catch {
        // Method may not be available yet
      }
    },
    [actor, session],
  );

  useEffect(() => {
    if (selectedContact) {
      setLoadingMessages(true);
      loadMessages(selectedContact).finally(() => setLoadingMessages(false));

      pollRef.current = setInterval(() => {
        loadMessages(selectedContact);
      }, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedContact, loadMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll needs to trigger on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !actor || !session || !selectedContact) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      // @ts-ignore - new backend method
      const msg: MessageDto = await actor.sendMessage(
        session.role,
        session.id,
        selectedContact.role,
        selectedContact.id,
        content,
      );
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      toast.error(`Failed to send message: ${err}`);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const myId = session?.id;
  const myRole = session?.role;

  // Group messages by date
  const groupedMessages: { date: string; msgs: MessageDto[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  }

  if (loadingContacts) {
    return (
      <div className="flex justify-center py-16" data-ocid="chat.loading_state">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div
        className="bg-white rounded-xl border border-border p-10 text-center"
        data-ocid="chat.empty_state"
      >
        <MessageCircle
          size={36}
          className="mx-auto text-muted-foreground mb-3"
        />
        <p className="font-medium text-sm text-foreground mb-1">
          No contacts available
        </p>
        <p className="text-xs text-muted-foreground">
          {myRole === "user"
            ? "Send a blood request to an Area Manager to unlock messaging."
            : "No contacts to message yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[520px]" data-ocid="chat.section">
      {/* Contact list */}
      <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-sm">Messages</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((c, i) => (
            <button
              key={`${c.role}-${c.id.toString()}`}
              type="button"
              onClick={() => {
                setSelectedContact(c);
                setMessages([]);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors border-b border-border/50 last:border-0 ${
                selectedContact?.id === c.id && selectedContact?.role === c.role
                  ? "bg-secondary"
                  : ""
              }`}
              data-ocid={`chat.contact.item.${i + 1}`}
            >
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                {c.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">
                    {c.subtitle}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread view */}
      <div className="flex-1 bg-white rounded-xl border border-border flex flex-col overflow-hidden">
        {!selectedContact ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle
                size={40}
                className="mx-auto text-muted-foreground mb-3"
              />
              <p className="text-sm text-muted-foreground">
                Select a contact to start chatting
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                <User size={16} className="text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-sm">{selectedContact.name}</p>
                {selectedContact.subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {selectedContact.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div
                  className="flex justify-center py-10"
                  data-ocid="chat.messages.loading_state"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div
                  className="flex items-center justify-center h-full"
                  data-ocid="chat.messages.empty_state"
                >
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t border-border" />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {group.date}
                      </span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                    {group.msgs.map((msg) => {
                      const isOwn =
                        msg.fromRole === myRole && msg.fromId === myId;
                      return (
                        <div
                          key={msg.id.toString()}
                          className={`flex ${
                            isOwn ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-secondary text-foreground rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">
                              {msg.content}
                            </p>
                            <p
                              className={`text-[10px] mt-0.5 ${
                                isOwn
                                  ? "text-primary-foreground/60 text-right"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex items-center gap-2">
              <input
                className="flex-1 rounded-full border border-border bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                data-ocid="chat.input"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors disabled:opacity-50 flex-shrink-0"
                data-ocid="chat.submit_button"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Hook to build contact list for CEO
export function useCEOChatContacts() {
  const { actor } = useActor();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const dms = await actor.getApprovedDistrictManagers();
      setContacts(
        dms.map((dm) => ({
          id: dm.id,
          role: "dm",
          name: dm.username,
          contact: dm.contact,
          subtitle: "District Manager",
        })),
      );
    } catch (err) {
      toast.error(`Failed to load contacts: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading };
}

// Hook to build contact list for DM
export function useDMChatContacts(dmId: bigint | undefined) {
  const { actor } = useActor();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!actor || dmId === undefined) return;
    setLoading(true);
    try {
      const [allDMs, allAMs] = await Promise.all([
        actor.getApprovedDistrictManagers(),
        (actor as any).getAllApprovedAreaManagers
          ? // @ts-ignore - new backend method
            (actor as any).getAllApprovedAreaManagers()
          : Promise.resolve([] as AreaManagerDto[]),
      ]);
      const result: Contact[] = [
        {
          id: 0n,
          role: "ceo",
          name: "CEO",
          contact: "",
          subtitle: "Chief Executive Officer",
        },
        ...allDMs
          .filter((dm) => dm.id !== dmId)
          .map((dm: DistrictManagerDto) => ({
            id: dm.id,
            role: "dm",
            name: dm.username,
            contact: dm.contact,
            subtitle: "District Manager",
          })),
        ...(allAMs as AreaManagerDto[]).map((am) => ({
          id: am.id,
          role: "am",
          name: am.username,
          contact: am.contact,
          subtitle: "Area Manager",
        })),
      ];
      setContacts(result);
    } catch (err) {
      toast.error(`Failed to load contacts: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [actor, dmId]);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading };
}

// Hook to build contact list for AM
export function useAMChatContacts(
  amId: bigint | undefined,
  _districtId: bigint | undefined,
) {
  const { actor } = useActor();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!actor || amId === undefined) return;
    setLoading(true);
    try {
      const [allDMs, allAMs, receivedRequests] = await Promise.all([
        actor.getApprovedDistrictManagers(),
        (actor as any).getAllApprovedAreaManagers
          ? // @ts-ignore - new backend method
            (actor as any).getAllApprovedAreaManagers()
          : Promise.resolve([] as AreaManagerDto[]),
        actor.getBloodRequestsForRecipient("am", amId),
      ]);

      // Users who sent blood requests to this AM
      const userIds = [
        ...new Set(
          receivedRequests
            .filter((r) => r.fromRole === "user")
            .map((r) => r.fromId.toString()),
        ),
      ].map((id) => BigInt(id));

      const userContacts: Contact[] = [];
      for (const uid of userIds) {
        try {
          const u: UserDto = await actor.getUser(uid);
          userContacts.push({
            id: u.id,
            role: "user",
            name: u.username,
            contact: u.contact,
            subtitle: "User",
          });
        } catch {
          // skip
        }
      }

      const result: Contact[] = [
        ...allDMs.map((dm: DistrictManagerDto) => ({
          id: dm.id,
          role: "dm",
          name: dm.username,
          contact: dm.contact,
          subtitle: "District Manager",
        })),
        ...(allAMs as AreaManagerDto[])
          .filter((am) => am.id !== amId)
          .map((am) => ({
            id: am.id,
            role: "am",
            name: am.username,
            contact: am.contact,
            subtitle: "Area Manager",
          })),
        ...userContacts,
      ];
      setContacts(result);
    } catch (err) {
      toast.error(`Failed to load contacts: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [actor, amId]);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading };
}

// Hook to build contact list for User
export function useUserChatContacts(userId: bigint | undefined) {
  const { actor } = useActor();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!actor || userId === undefined) return;
    setLoading(true);
    try {
      // Get blood requests sent BY this user
      let sentRequests: import("../backend").BloodRequestDto[] = [];
      try {
        // @ts-ignore - may not exist
        sentRequests = await actor.getBloodRequestsBySender("user", userId);
      } catch {
        // fallback: no contacts
      }

      const amIds = [
        ...new Set(
          sentRequests
            .filter((r) => r.toRole === "am")
            .map((r) => r.toId.toString()),
        ),
      ].map((id) => BigInt(id));

      const contactList: Contact[] = [];
      for (const amId of amIds) {
        try {
          const am: AreaManagerDto = await actor.getAreaManager(amId);
          contactList.push({
            id: am.id,
            role: "am",
            name: am.username,
            contact: am.contact,
            subtitle: "Area Manager",
          });
        } catch {
          // skip
        }
      }
      setContacts(contactList);
    } catch (err) {
      toast.error(`Failed to load contacts: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [actor, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading };
}
