const { useState } = React;

function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? "☰" : "✕"}
        </button>
        {!collapsed && (
          <button className="new-session-btn" onClick={onNewSession} title="Nova sessao">
            + Nova sessao
          </button>
        )}
      </div>
      {!collapsed && (
        <nav className="session-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === activeSessionId ? "active" : ""}`}
              onClick={() => onSelectSession(s.id)}
            >
              <span className="session-title" title={s.title || "Nova sessao"}>
                {s.title || "Nova sessao"}
              </span>
              <button
                className="delete-session-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(s.id);
                }}
                title="Excluir sessao"
              >
                🗑
              </button>
            </div>
          ))}
        </nav>
      )}
    </aside>
  );
}

window.Sidebar = Sidebar;