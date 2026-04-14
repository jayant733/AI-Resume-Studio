"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export function Chatbot({ userId, resumeId }: { userId: number; resumeId?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newHistory = [...messages, { role: "user", content: input } as const];
    setMessages(newHistory);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/products/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          resume_id: resumeId,
          user_message: input,
          chat_history: messages
        })
      });

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${res.statusText}. Ensure you have an active Premium subscription.` }]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      let botMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice("data: ".length);
            if (dataStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                botMessage += parsed.chunk;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = botMessage;
                  return newMsgs;
                });
              } else if (parsed.error) {
                botMessage += ` [Error: ${parsed.error}]`;
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-xl hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="flex h-[500px] w-[360px] flex-col rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-soft">
          <div className="flex items-center justify-between rounded-t-2xl bg-ink/90 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Career Copilot</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:text-mist">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-slate mt-10">
                Hi! Ask me for interview advice, behavioral questions, or resume feedback.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[20px] px-4 py-2 text-sm leading-6 ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-tr-sm"
                      : "bg-white border border-slate/10 shadow-sm text-ink rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate/10 shadow-sm rounded-[20px] rounded-tl-sm px-4 py-2 text-sm text-slate">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate/20 bg-white/50 p-3 rounded-b-2xl">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask your career coach..."
                className="w-full rounded-full border border-slate/20 bg-white pl-4 pr-12 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white disabled:bg-slate/40 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
