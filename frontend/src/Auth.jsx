const { useState } = React;

function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Erro ao cadastrar.");
        }
        // Auto-login after register
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!loginRes.ok) {
          throw new Error("Cadastro realizado, mas falha ao fazer login automatico.");
        }
        const loginData = await loginRes.json();
        onAuthSuccess(loginData.access_token, email);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Email ou senha invalidos.");
        }
        const data = await res.json();
        onAuthSuccess(data.access_token, email);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">ChatLLM Lab</div>
      </header>
      <div className="auth-container">
        <div className="auth-card">
          <h2>{mode === "login" ? "Entrar" : "Criar Conta"}</h2>
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={busy}
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password">Senha</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                minLength={6}
                required
                disabled={busy}
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
            </button>
          </form>
          <p className="auth-toggle">
            {mode === "login" ? (
              <>
                Nao tem conta?{" "}
                <button className="link-btn" onClick={() => { setMode("register"); setError(""); }}>
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Ja tem conta?{" "}
                <button className="link-btn" onClick={() => { setMode("login"); setError(""); }}>
                  Fazer login
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

window.Auth = Auth;