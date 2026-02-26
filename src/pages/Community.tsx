import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Hash, TrendingUp, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const channels = [
  { id: "general", name: "General", icon: Hash, desc: "Open discussion" },
  { id: "stocks", name: "Stock Talk", icon: TrendingUp, desc: "Market analysis" },
  { id: "predictions", name: "Predictions", icon: MessageSquare, desc: "Share predictions" },
];

interface CommunityMessage {
  id: string;
  user_id: string;
  channel: string;
  content: string;
  created_at: string;
  display_name?: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function Community() {
  const [activeChannel, setActiveChannel] = useState("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch profiles for display names
  const fetchProfiles = async (userIds: string[]) => {
    const missing = userIds.filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", missing);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p) => { map[p.user_id] = p.display_name || "Anonymous"; });
      setProfiles((prev) => ({ ...prev, ...map }));
    }
  };

  // Fetch messages for channel
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("community_messages")
      .select("*")
      .eq("channel", activeChannel)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      console.error("Failed to fetch messages:", error);
      return;
    }
    setMessages(data || []);
    if (data && data.length > 0) {
      fetchProfiles(data.map((m) => m.user_id));
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [activeChannel]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`community-${activeChannel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `channel=eq.${activeChannel}`,
        },
        (payload) => {
          const newMsg = payload.new as CommunityMessage;
          setMessages((prev) => [...prev, newMsg]);
          fetchProfiles([newMsg.user_id]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "community_messages",
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !user || sending) return;
    if (trimmed.length > 500) {
      toast({ title: "Too long", description: "Messages must be under 500 characters.", variant: "destructive" });
      return;
    }
    setSending(true);
    setInput("");
    const { error } = await supabase.from("community_messages").insert({
      user_id: user.id,
      channel: activeChannel,
      content: trimmed,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
      setInput(trimmed);
    }
    setSending(false);
  };

  const handleDelete = async (msgId: string) => {
    const { error } = await supabase.from("community_messages").delete().eq("id", msgId);
    if (error) toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
  };

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || "?";
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const grouped: { date: string; msgs: CommunityMessage[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  });

  const activeChannelData = channels.find((c) => c.id === activeChannel)!;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col h-[calc(100vh-3rem)]">
      <motion.div variants={item} className="mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Community
        </h1>
        <p className="text-muted-foreground mt-1">Discuss stocks, share predictions, and learn together in real-time.</p>
      </motion.div>

      <motion.div variants={item} className="flex-1 flex glass-card overflow-hidden min-h-0">
        {/* Channels Sidebar */}
        <div className="w-52 border-r border-border p-3 space-y-1 shrink-0 hidden md:flex flex-col">
          <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">Channels</p>
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeChannel === ch.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <ch.icon className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="font-medium">{ch.name}</div>
                {activeChannel === ch.id && <div className="text-xs text-muted-foreground">{ch.desc}</div>}
              </div>
            </button>
          ))}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Channel header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <activeChannelData.icon className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{activeChannelData.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{activeChannelData.desc}</span>
            {/* Mobile channel switcher */}
            <div className="md:hidden ml-auto flex gap-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`p-1.5 rounded ${activeChannel === ch.id ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                >
                  <ch.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-sm">No messages yet in #{activeChannelData.name}.</p>
                <p className="text-xs">Be the first to say something!</p>
              </div>
            )}

            {grouped.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground font-medium">{group.date}</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                {group.msgs.map((msg) => {
                  const name = profiles[msg.user_id] || "Loading…";
                  const isOwn = msg.user_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 group py-1.5 px-2 rounded-lg hover:bg-secondary/20 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {getInitial(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${isOwn ? "text-primary" : ""}`}>{name}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                          {isOwn && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-auto"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 break-words">{msg.content}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message #${activeChannelData.name}…`}
                maxLength={500}
                className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-1.5 text-right">{input.length}/500</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
