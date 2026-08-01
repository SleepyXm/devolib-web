import { useState, useRef, useEffect } from "react";
import { sendMessage } from "@/app/handlers/llm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface ChatProps {
  setCode: (code: string) => void;
}

function stripCodeBlock(response: string): string {
  return response.replace(/```html\n[\s\S]*?```/g, "").trim();
}

const TypingDots = () => {
  const [dotCount, setDotCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((count) => (count + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <span>{".".repeat(dotCount)}</span>;
};

export default function Chat({ setCode }: ChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const data = await sendMessage(input);

      if (data.code) {
        setCode(data.code);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: stripCodeBlock(data.response) },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-48 shrink-0 border-b border-gray-700 bg-zinc-950">
      <div className="flex flex-col flex-grow overflow-y-auto space-y-3 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "self-end bg-white/12 text-white rounded-br-none"
                : "self-start bg-white/5 text-slate-200 rounded-bl-none border border-white/10"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="self-start bg-white/5 border border-white/10 text-slate-400 text-sm italic px-4 py-2.5 rounded-xl rounded-bl-none">
            Designing
            <TypingDots />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Describe a component..."
          disabled={loading}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 transition placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="rounded-lg bg-zinc-300 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white disabled:pointer-events-none disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
