import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Conversation {
  id: string;
  title: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export default function AIAdvisor() {
  const { user, userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ["ai-conversations", companyId, user?.id],
    enabled: !!companyId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, title")
        .eq("company_id", companyId ?? "")
        .eq("user_id", user?.id ?? "")
        .order("created_at", { ascending: false });
      return (data ?? []) as Conversation[];
    },
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["ai-messages", selectedConversationId],
    enabled: !!selectedConversationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_messages")
        .select("id, conversation_id, role, content, created_at")
        .eq("conversation_id", selectedConversationId ?? "")
        .order("created_at", { ascending: true });
      return (data ?? []) as Message[];
    },
  });

  const createConversation = async () => {
    if (!companyId || !user?.id) return;
    const { data } = await supabase
      .from("ai_conversations")
      .insert({ company_id: companyId, user_id: user.id, title: "New conversation" })
      .select("id")
      .single();

    if (data?.id) {
      setSelectedConversationId(data.id);
      refetchConversations();
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedConversationId || !companyId) return;

    const userText = prompt.trim();
    setPrompt("");
    setBusy(true);

    await supabase.from("ai_messages").insert({
      conversation_id: selectedConversationId,
      role: "user",
      content: userText,
    });

    let assistantReply = "I can help analyze sales trends, margins, and inventory risk. Ask me for a specific report.";

    const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-chat", {
      body: {
        conversation_id: selectedConversationId,
        messages: [{ role: "user", content: userText }],
      },
    });

    if (!fnError && fnData) {
      if (typeof fnData === "string") assistantReply = fnData;
      if (typeof fnData?.reply === "string") assistantReply = fnData.reply;
      if (typeof fnData?.content === "string") assistantReply = fnData.content;
    }

    await supabase.from("ai_messages").insert({
      conversation_id: selectedConversationId,
      role: "assistant",
      content: assistantReply,
    });

    setBusy(false);
    refetchMessages();
    refetchConversations();
  };

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" className="w-full" onClick={createConversation}>New Conversation</Button>
          <div className="space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                className={`w-full rounded-md border px-2 py-1 text-left text-xs ${selectedConversationId === c.id ? "bg-muted" : ""}`}
                onClick={() => setSelectedConversationId(c.id)}
              >
                {c.title || "Untitled"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader className="pb-2"><CardTitle className="text-sm">AI Advisor</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="flex-1 space-y-2 overflow-auto rounded-md border p-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground">Start a conversation to get business insights.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-md px-2 py-1 text-xs ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask about sales, inventory, pricing..."
              disabled={!selectedConversationId || busy}
            />
            <Button type="submit" size="sm" disabled={!selectedConversationId || busy || !prompt.trim()}>
              {busy ? "..." : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
