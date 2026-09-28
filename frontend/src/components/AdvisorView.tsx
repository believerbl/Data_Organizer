import React, { useState } from "react";
import { Sparkles, Send, Bot, User, ShieldCheck } from "lucide-react";
import { api } from "../services/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export const AdvisorView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      sender: "ai",
      text: "👋 Hello! I am **Data Organizer**, an AI storage intelligence assistant created by **Parimarjan Shukla**.\n\nI continuously monitor file accumulation and digital entropy across your drives. You can ask me questions like:\n- *'Can I free 10 GB?'*\n- *'What is taking up space?'*\n- *'Find my duplicate files'*\n- *'Show obsolete downloaded installers'*",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const quickQuestions = [
    "Can I free 10 GB?",
    "What's taking up the most space?",
    "Show me duplicate files",
    "Find obsolete installers",
  ];

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput("");
    setIsLoading(true);

    try {
      const res = await api.sendChatMessage(textToSend);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `⚠️ I ran into an issue querying the index: ${err.message}. Please verify the backend service is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Basic markdown formatter for AI responses
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      // Bold rendering
      let formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Inline code
      formatted = formatted.replace(/`([^`]+)`/g, "<code style='background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:0.85em'>$1</code>");
      // Italic
      formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

      return (
        <span 
          key={idx} 
          style={{ display: "block", minHeight: line.trim() === "" ? 12 : undefined }} 
          dangerouslySetInnerHTML={{ __html: formatted }} 
        />
      );
    });
  };

  return (
    <div className="chat-window">
      {/* Messages Scroll Area */}
      <div className="chat-messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`message-bubble ${m.sender === "user" ? "message-user" : "message-ai"}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: "0.76rem", opacity: 0.8 }}>
              {m.sender === "user" ? <User size={13} /> : <Bot size={13} style={{ color: "var(--accent-cyan)" }} />}
              <span>{m.sender === "user" ? "You" : "Storage Advisor AI"}</span>
              <span style={{ marginLeft: "auto" }}>{m.timestamp}</span>
            </div>
            <div>{renderFormattedText(m.text)}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message-bubble message-ai" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} className="status-dot scanning" />
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Analyzing storage database & reasoning...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="quick-prompts">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            className="prompt-pill"
            onClick={() => handleSend(q)}
            disabled={isLoading}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <input
          type="text"
          id="chat-input-field"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask anything about your files, space recovery, or storage advice..."
          disabled={isLoading}
        />
        <button
          id="chat-send-btn"
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
