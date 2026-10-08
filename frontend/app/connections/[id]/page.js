"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { Alert, Loader, RequireAuth } from "@/components/ui";

function Chat({ id, user }) {
  const [conn, setConn] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef(null);

  const loadMessages = useCallback(() => api(`/access-requests/${id}/messages`).then(setMessages), [id]);

  useEffect(() => {
    api(`/access-requests/${id}`).then((c) => {
      setConn(c);
      if (c.status === "approved") loadMessages().catch((e) => setError(e.message));
    }).catch((e) => setError(e.message));
  }, [id, loadMessages]);

  useEffect(() => {
    if (conn?.status !== "approved") return undefined;
    const timer = setInterval(() => loadMessages().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [conn, loadMessages]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api(`/access-requests/${id}/messages`, { method: "POST", body: { text } });
      setText("");
      await loadMessages();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!conn) return error ? <Alert>{error}</Alert> : <Loader />;
  const other = user.id === conn.investor.id ? conn.founder : conn.investor;

  return (
    <div className="layout-detail">
      <div className="card stack">
        <div className="row between">
          <h2 style={{ margin: 0 }}>{conn.startup.name}</h2>
          <Link href="/connections" className="small">← Все контакты</Link>
        </div>
        {conn.status !== "approved" ? (
          <Alert type="info">Чат откроется после одобрения запроса на доступ.</Alert>
        ) : (
          <>
            <div className="chat">
              {messages.length === 0 && <p className="muted small">Начните диалог — представьтесь и предложите время для звонка.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.sender.id === user.id ? "mine" : ""}`}>
                  <div className="who">{m.sender.full_name} · {formatDate(m.created_at)}</div>
                  <div className="pre">{m.text}</div>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={send}>
              <input placeholder="Сообщение..." value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-primary">Отправить</button>
            </form>
          </>
        )}
        <Alert>{error}</Alert>
      </div>
      <aside className="card small stack" style={{ gap: 6 }}>
        <h3>{user.id === conn.investor.id ? "Founder" : "Инвестор"}</h3>
        <b>{other.full_name}</b>
        {other.email && <a href={`mailto:${other.email}`}>{other.email}</a>}
        {other.telegram && <div>Telegram: {other.telegram}</div>}
        {other.phone && <div>Тел: {other.phone}</div>}
        {other.linkedin && <a href={other.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
        {other.bio && <p className="muted pre">{other.bio}</p>}
        {user.id !== conn.investor.id && conn.investor_profile && (
          <div className="muted">{conn.investor_profile.company}</div>
        )}
        <Link href={`/startups/${conn.startup.id}`}>Карточка стартапа →</Link>
      </aside>
    </div>
  );
}

export default function ConnectionPage({ params }) {
  return <RequireAuth>{(user) => <Chat id={params.id} user={user} />}</RequireAuth>;
}
