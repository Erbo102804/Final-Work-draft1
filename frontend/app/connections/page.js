"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import { Alert, Empty, Loader, RequireAuth, StatusTag } from "@/components/ui";

function ConnectionsList({ user }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  const load = () => api("/access-requests").then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const respond = async (id, action) => {
    try {
      await api(`/access-requests/${id}/${action}`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!items) return <Loader />;
  const filtered = tab === "all" ? items : items.filter((r) => r.status === tab);

  return (
    <>
      <Alert>{error}</Alert>
      <div className="tabs">
        {[["all", "Все"], ["pending", "Ожидают"], ["approved", "Контакты"], ["rejected", "Отклонённые"]].map(([v, l]) => (
          <button key={v} className={tab === v ? "active" : ""} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      {filtered.length === 0 ? <Empty>Здесь пока пусто.</Empty> : (
        <div className="stack">
          {filtered.map((r) => {
            const incoming = r.startup && user.id !== r.investor.id;
            const other = incoming ? r.investor : r.founder;
            return (
              <div className="card row between" key={r.id}>
                <div>
                  <div className="row">
                    <b>{r.startup.name}</b>
                    <StatusTag status={r.status} label={r.status_display} />
                    {r.unread_count > 0 && <span className="badge-count">{r.unread_count}</span>}
                  </div>
                  <div className="small muted">
                    {incoming ? "Инвестор" : "Founder"}: {other.full_name}
                    {r.last_message ? ` · «${r.last_message.text.slice(0, 60)}» · ${formatDate(r.last_message.created_at)}` : ""}
                  </div>
                </div>
                <div className="btn-row">
                  {incoming && r.status === "pending" && (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => respond(r.id, "approve")}>Открыть доступ</button>
                      <button className="btn btn-sm btn-danger" onClick={() => respond(r.id, "reject")}>Отклонить</button>
                    </>
                  )}
                  {r.status === "approved" && <Link className="btn btn-sm btn-primary" href={`/connections/${r.id}`}>Чат</Link>}
                  <Link className="btn btn-sm" href={`/startups/${r.startup.id}`}>Стартап</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function ConnectionsPage() {
  return (
    <RequireAuth>
      {(user) => (
        <>
          <h1>Контакты</h1>
          <p className="muted">Запросы на доступ и переписка: Интерес → Доступ → Контакт.</p>
          <ConnectionsList user={user} />
        </>
      )}
    </RequireAuth>
  );
}
