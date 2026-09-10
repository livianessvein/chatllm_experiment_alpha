const { useEffect, useMemo, useRef, useState, useCallback } = React;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("chatllm_token") || null);
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("chatllm_email") || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Session state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const chatHistory = useMemo(
    () => messages.filter((msg) => msg.role === "user" || msg.role === "assistant"),
    [messages]
  );

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Load sessions on login
  const loadSessions = useCallback(async () => {
    try {
      const data = await window.listSessions();
      setSessions(data.sessions);
      setSessionsLoaded(true);
      // Auto-select the most recent session
      if (data.sessions.length > 0) {
        const mostRecent = data.sessions[0];
        setActiveSessionId(mostRecent.id);
        loadSessionMessages(mostRecent.id);
      } else {
        // Create a first session automatically
        const newSession = await window.createSession();
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setSessionsLoaded(true);
    }
  }, []);

  const loadSessionMessages = useCallback(async (sessionId) => {
    try {
      const msgs = await window.getSessionMessages(sessionId);
      if (msgs.length === 0) {
        setMessages([
          {
            id: createMessageId(),
            role: "assistant",
            content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
          },
        ]);
      } else {
        setMessages(
          msgs.map((m) => ({
            id: `msg-${m.id}`,
            role: m.role,
            content: m.content,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([
        {
          id: createMessageId(),
          role: "assistant",
          content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
        },
      ]);
    }
  }, []);

  const handleAuthSuccess = (newToken, email) => {
    localStorage.setItem("chatllm_token", newToken);
    localStorage.setItem("chatllm_email", email);
    setToken(newToken);
    setUserEmail(email);
    setMessages([]);
    setSessions([]);
    setActiveSessionId(null);
    setSessionsLoaded(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("chatllm_token");
    localStorage.removeItem("chatllm_email");
    setToken(null);
    setUserEmail(null);
    setMessages([]);
    setSessions([]);
    setActiveSessionId(null);
    setSessionsLoaded(false);
  };

  // Load sessions when token becomes available
  useEffect(() => {
    if (token && !sessionsLoaded) {
      loadSessions();
    }
  }, [token, sessionsLoaded, loadSessions]);

  const handleNewSession = async () => {
    try {
      const newSession = await window.createSession();
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([
        {
          id: createMessageId(),
          role: "assistant",
          content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
        },
      ]);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleSelectSession = (sessionId) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    loadSessionMessages(sessionId);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await window.deleteSession(sessionId);
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (sessionId === activeSessionId) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id);
          loadSessionMessages(updated[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([
            {
              id: createMessageId(),
              role: "assistant",
              content: "Bem-vindo ao ChatLLM Lab. Como posso ajudar voce hoje?",
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const onStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setBusy(false);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const cleaned = text.trim();
    if (!cleaned || busy) return;

    setError("");
    const userMessage = { id: createMessageId(), role: "user", content: cleaned };
    const assistantMessageId = createMessageId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);
    setText("");
    setBusy(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await window.sendMessageStream({
        message: cleaned,
        history: chatHistory,
        signal: abortController.signal,
        session_id: activeSessionId,
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: `${msg.content}${delta}` }
                : msg
            )
          );
        },
        onDone: (data) => {
          // If this was a new session (no activeSessionId), update it
          if (data.session_id && !activeSessionId) {
            setActiveSessionId(data.session_id);
          }
          // Reload sessions to get updated title
          window.listSessions().then((result) => {
            setSessions(result.sessions);
          }).catch(() => {});
        },
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId && !msg.content.trim()
            ? { ...msg, content: "Nao foi possivel obter resposta do modelo agora." }
            : msg
        )
      );
    } catch (err) {
      const aborted = err?.name === "AbortError";
      if (!aborted) {
        setError(err.message || "Falha inesperada ao gerar resposta.");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content.trim() ? msg.content : "Nao foi possivel obter resposta do modelo agora." }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId && !msg.content.trim()
              ? { ...msg, content: "Resposta interrompida." }
              : msg
          )
        );
      }
      // Reload sessions to get updated title even on error
      window.listSessions().then((result) => {
        setSessions(result.sessions);
      }).catch(() => {});
    } finally {
      abortControllerRef.current = null;
      setBusy(false);
    }
  };

  if (!token) {
    return React.createElement(window.Auth, { onAuthSuccess: handleAuthSuccess });
  }

  return (
    <main className="app-shell">
      {React.createElement(window.Sidebar, {
        sessions,
        activeSessionId,
        onSelectSession: handleSelectSession,
        onNewSession: handleNewSession,
        onDeleteSession: handleDeleteSession,
      })}
      <div className="app-main">
        <header className="app-header">
          <div className="brand">ChatLLM Lab</div>
          <div className="user-info">
            <span className="user-email">{userEmail}</span>
            <button className="logout-btn" onClick={handleLogout}>Sair</button>
          </div>
        </header>

        <section className="messages" aria-live="polite" ref={messagesRef}>
          <div className="messages-inner">
            {messages.map((msg) => (
              <article key={msg.id} className={`bubble ${msg.role}`}>
                {React.createElement(window.MessageContent, { content: msg.content })}
              </article>
            ))}
          </div>
        </section>

        {React.createElement(window.Composer, {
          text,
          busy,
          error,
          onChangeText: setText,
          onSubmit,
          onStop,
        })}

        <div className="warning-banner">Lembre-se, voce precisa focar no experimento!!!</div>
      </div>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

