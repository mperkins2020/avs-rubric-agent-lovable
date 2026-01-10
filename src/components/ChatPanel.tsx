import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  ExternalLink, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/rubric";

interface ChatPanelProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-2 border-t border-foreground/10">
            <span className="text-xs opacity-70 block mb-1">Sources:</span>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation, i) => (
                <a
                  key={i}
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {new URL(citation.url).pathname.slice(0, 20)}...
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ChatPanel({ messages, onSendMessage, isLoading = false }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const suggestedQuestions = [
    "Why did we score low on Safety rails?",
    "What would a 2 look like for us?",
    "What should we fix in the next 90 days?",
  ];

  return (
    <GlassCard className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-border/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Challenge Chat</h3>
            <p className="text-xs text-muted-foreground">
              Ask questions about your score
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-8 h-8 text-primary/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask me anything about your rubric score
                  </p>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => onSendMessage(q)}
                        className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-border/50"
            >
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your score..."
                  className="flex-1 bg-secondary/50"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
