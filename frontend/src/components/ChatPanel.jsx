import { useEffect, useRef, useState } from "react";
import api, { API_BASE_URL, getWebsocketUrl } from "../api/axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getMe } from "../api/auth";
import { speakText, getSpeechTag, SPEECH_LANG_TAGS, LANGUAGE_DISPLAY_NAMES } from "../utils/speechLang";

const STAGE_LABELS = {
  upload_check: "Document ready",
  guardrail: "Safety check",
  embedding: "Understanding question",
  retrieval: "Searching document",
  rerank: "Reranking results",
  generation: "Generating answer",
  translation: "Translating",
};

const EXPLAIN_LEVELS = [
  { value: "", label: "Default" },
  { value: "beginner", label: "Beginner" },
  { value: "student", label: "Student" },
  { value: "engineer", label: "Engineer" },
  { value: "professor", label: "Professor" },
  { value: "child", label: "Explain like I'm 10" },
  { value: "interview", label: "Interview answer" },
];

export default function ChatPanel({ selectedDocument, workspace, onCitationClick, prefillQuestion, onPrefillConsumed }) {
  const [question, setQuestion] = useState("");

  // Filled in when the user selects text in the PDF viewer and clicks
  // "Ask AI about this" -- consumed once, then cleared via the callback
  // so it doesn't keep overwriting manual edits to the question box.
  useEffect(() => {
    if (prefillQuestion) {
      setQuestion(prefillQuestion);
      onPrefillConsumed?.();
    }
  }, [prefillQuestion]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [explainLevel, setExplainLevel] = useState("");
  const [listening, setListening] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);
  const wsRef = useRef(null);

  const [voiceInputLang, setVoiceInputLang] = useState("");

  useEffect(() => {
    getMe().then((u) => setCurrentUserId(u.id)).catch(() => {});
  }, []);

  // Default voice-input language to the document's detected language, so
  // asking a question in the same language as the document works without
  // the user having to configure anything -- still overridable below.
  useEffect(() => {
    if (selectedDocument?.language_code) {
      setVoiceInputLang(selectedDocument.language_code);
    }
  }, [selectedDocument]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser (try Chrome).");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechTag(voiceInputLang || "en");
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  useEffect(() => {
    if (!selectedDocument && !workspace) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      try {
        const url = workspace ? `/chat/workspace/${workspace.id}` : `/chat/${selectedDocument.id}`;
        const response = await api.get(url);
        const history = [];
        response.data.forEach((chat) => {
          history.push({ role: "user", content: chat.question });
          history.push({
            role: "assistant",
            content: chat.answer,
            citations: chat.citations || [],
            steps: [],
            translation: null,
            showTranslation: false,
          });
        });
        setMessages(history);
      } catch (err) {
        console.error(err);
      }
    };

    loadHistory();
  }, [selectedDocument, workspace]);

  // Live collaboration: connect to the workspace's websocket channel so
  // this tab sees presence ("N online") and gets pushed other members'
  // chat turns in real time -- this user's OWN turns arrive via the
  // normal streaming REST response below, not the socket, so they're
  // filtered out here by user_id to avoid a duplicate message.
  useEffect(() => {
    if (!workspace) {
      setOnlineCount(null);
      return;
    }

    const token = localStorage.getItem("token");
    const socket = new WebSocket(getWebsocketUrl(`/ws/workspace/${workspace.id}?token=${token}`));
    wsRef.current = socket;

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "presence") {
        setOnlineCount(data.online);
      } else if (data.type === "chat_message" && data.user_id !== currentUserId) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: data.question, authorName: data.user_name },
          {
            role: "assistant",
            content: data.answer,
            citations: data.citations || [],
            steps: [],
            translation: null,
            showTranslation: false,
          },
        ]);
      }
    };

    socket.onerror = () => {
      console.error("Workspace live-collaboration connection failed.");
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [workspace, currentUserId]);

  const updateLastMessage = (updater) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = updater(updated[updated.length - 1]);
      return updated;
    });
  };

  const updateMessageAt = (index, updater) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = updater(updated[index]);
      return updated;
    });
  };

  const askQuestion = async () => {
    if (!selectedDocument && !workspace) {
      alert("Please select a document or workspace first.");
      return;
    }
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: currentQuestion },
      {
        role: "assistant",
        content: "",
        citations: [],
        steps: [],
        translation: null,
        showTranslation: false,
        streaming: true,
      },
    ]);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: currentQuestion,
          document_id: workspace ? null : selectedDocument.id,
          workspace_id: workspace ? workspace.id : null,
          explain_level: explainLevel || null,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/";
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || `Request failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;

          let event;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "status") {
            updateLastMessage((msg) => {
              const steps = [...msg.steps];
              const label = STAGE_LABELS[event.stage] || event.stage;
              const idx = steps.findIndex((s) => s.stage === event.stage);
              const step = { stage: event.stage, label: event.label || label, done: !!event.done };
              if (idx === -1) steps.push(step);
              else steps[idx] = step;
              return { ...msg, steps };
            });
          } else if (event.type === "token") {
            updateLastMessage((msg) => ({ ...msg, content: msg.content + event.text }));
          } else if (event.type === "citations") {
            updateLastMessage((msg) => ({ ...msg, citations: event.citations }));
          } else if (event.type === "confidence") {
            updateLastMessage((msg) => ({
              ...msg,
              confidence: { label: event.label, level: event.level },
            }));
          } else if (event.type === "translation") {
            updateLastMessage((msg) => ({
              ...msg,
              translation: { languageName: event.language_name, text: event.text },
            }));
          } else if (event.type === "done") {
            updateLastMessage((msg) => ({ ...msg, streaming: false }));
          }
        }
      }
    } catch (err) {
      console.error(err);
      updateLastMessage((msg) => ({
        ...msg,
        content: `❌ ${err.message || "Something went wrong."}`,
        streaming: false,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-white">Chat</h2>

        <select
          value={explainLevel}
          onChange={(e) => setExplainLevel(e.target.value)}
          className="bg-slate-700 text-white text-sm rounded-lg px-2 py-1"
          title="Explain like..."
        >
          {EXPLAIN_LEVELS.map((lvl) => (
            <option key={lvl.value} value={lvl.value}>
              {lvl.label}
            </option>
          ))}
        </select>
      </div>

      {workspace ? (
        <div className="mt-4 bg-blue-900/40 border border-blue-700 text-blue-200 rounded-lg p-3 text-sm flex items-center justify-between">
          <span>💬 Workspace: <strong>{workspace.name}</strong> (searches all documents in it)</span>
          {onlineCount !== null && (
            <span className="text-xs bg-green-700/60 px-2 py-0.5 rounded-full">
              🟢 {onlineCount} online
            </span>
          )}
        </div>
      ) : !selectedDocument ? (
        <div className="mt-4 bg-red-700 text-white rounded-lg p-3 text-sm">
          Select a document from the sidebar, or a workspace from the Workspaces tab.
        </div>
      ) : null}

      <div className="mt-4 flex-1 overflow-y-auto bg-slate-900 rounded-lg p-4">
        {messages.length === 0 && (
          <p className="text-slate-400">Ask a question about your document...</p>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              dir="auto"
              className={`max-w-2xl rounded-xl px-4 py-3 ${
                msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-white"
              }`}
            >
              {msg.role === "assistant" ? (
                <>
                  {msg.steps && msg.steps.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {msg.steps.map((step, i) => (
                        <div key={i} className="text-xs flex items-center gap-2 text-slate-300">
                          <span>{step.done ? "✅" : "⏳"}</span>
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.content && (
                    <div className="prose prose-invert max-w-none prose-sm" dir="auto">
                    </div>
                  )}

                  {msg.confidence && (
                    <div
                      className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${
                        msg.confidence.label === "High"
                          ? "bg-green-700"
                          : msg.confidence.label === "Medium"
                          ? "bg-yellow-700"
                          : "bg-red-700"
                      }`}
                      title="Based on how well the retrieved passage matched your question"
                    >
                      Confidence: {msg.confidence.label}
                    </div>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-600 text-xs text-slate-300 flex flex-wrap gap-2">
                      <span className="font-semibold">Sources:</span>
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => onCitationClick && onCitationClick(c.page, c.snippet)}
                          className="underline hover:text-white"
                        >
                          {c.filename} · p.{c.page}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.translation && (
                    <div className="mt-2">
                      <button
                        onClick={() =>
                          updateMessageAt(index, (m) => ({ ...m, showTranslation: !m.showTranslation }))
                        }
                        className="text-xs text-blue-300 hover:text-white underline"
                      >
                        {msg.showTranslation ? "Hide" : "Show"} {msg.translation.languageName} translation
                      </button>
                      {msg.showTranslation && (
                        <div className="mt-2 prose prose-invert max-w-none prose-sm border-t border-slate-600 pt-2" dir="auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.translation.text}</ReactMarkdown>
                          <button
                            onClick={() => speakText(msg.translation.text, "en")}
                            className="mt-1 text-xs text-slate-400 hover:text-white"
                          >
                            🔊 Listen in {msg.translation.languageName}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.content && !msg.streaming && (
                    <div className="mt-2 flex gap-3 text-xs text-slate-400">
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} className="hover:text-white">
                        📋 Copy
                      </button>
                      <button
                        onClick={() => speakText(msg.content, selectedDocument?.language_code)}
                        className="hover:text-white"
                      >
                        🔊 Listen
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {msg.authorName && (
                    <div className="text-xs text-blue-200 mb-1 font-semibold">{msg.authorName}</div>
                  )}
                  {msg.content}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <textarea
        rows={2}
        dir="auto"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            askQuestion();
          }
        }}
        placeholder="Ask something, or use the mic..."
        className="w-full mt-4 p-3 rounded-lg bg-slate-700 text-white outline-none text-sm"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={askQuestion}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-white disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask AI"}
        </button>

        <button
          onClick={startListening}
          disabled={listening}
          title="Ask by voice"
          className={`px-4 py-2 rounded-lg text-white ${
            listening ? "bg-red-600 animate-pulse" : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          {listening ? "🎙️ Listening..." : "🎤"}
        </button>

        <select
          value={voiceInputLang}
          onChange={(e) => setVoiceInputLang(e.target.value)}
          className="bg-slate-700 text-white text-xs rounded-lg px-2"
          title="Voice input language"
        >
          {Object.entries(SPEECH_LANG_TAGS).map(([code]) => (
            <option key={code} value={code}>
              {LANGUAGE_DISPLAY_NAMES[code] || code}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
