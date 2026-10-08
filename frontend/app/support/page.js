"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatDate, formatMoney } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, Empty, Loader, Pipeline, RequireAuth } from "@/components/ui";

function TeamControls({ request, startups, onSaved }) {
  const [step, setStep] = useState(request.step);
  const [notes, setNotes] = useState(request.team_notes);
  const [suggested, setSuggested] = useState(request.suggested_startups.map((s) => s.id));
  const [error, setError] = useState("");
  const { choices } = useAuth();

  const save = async () => {
    try {
      await api(`/support-requests/${request.id}`, {
        method: "PATCH", body: { step, team_notes: notes, suggested_startup_ids: suggested },
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="stack" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <div className="form-grid">
        <div className="field">
          <label>Этап</label>
          <select value={step} onChange={(e) => setStep(e.target.value)}>
            {choices?.support_steps.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Предложенные стартапы</label>
          <select multiple value={suggested.map(String)} style={{ minHeight: 90 }}
            onChange={(e) => setSuggested([...e.target.selectedOptions].map((o) => Number(o.value)))}>
            {startups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Комментарий для пользователя</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Alert>{error}</Alert>
      <button className="btn btn-amber btn-sm" onClick={save}>Сохранить</button>
    </div>
  );
}

function SupportPage({ user }) {
  const { choices } = useAuth();
  const [items, setItems] = useState(null);
  const [myStartups, setMyStartups] = useState([]);
  const [allStartups, setAllStartups] = useState([]);
  const [form, setForm] = useState({ goal: "", budget: "", startup_id: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isTeam = user.role === "admin";

  const load = () => api("/support-requests").then(setItems).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    if (user.role === "founder") api("/startups/mine").then(setMyStartups).catch(() => {});
    if (isTeam) api("/startups").then((d) => setAllStartups(d.results)).catch(() => {});
  }, [user.role, isTeam]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/support-requests", {
        method: "POST",
        body: { goal: form.goal, budget: Number(form.budget) || 0, startup_id: form.startup_id || null },
      });
      setForm({ goal: "", budget: "", startup_id: "" });
      setNotice("Заявка отправлена — менеджер FOUNDEX свяжется с вами.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const steps = choices?.support_steps.filter((s) => s.value !== "new" && s.value !== "closed") || [];

  return (
    <>
      <h1 className="amber">⭐ SUPPORTED — с поддержкой</h1>
      <p className="muted">FOUNDEX активно помогает найти, подобрать и закрыть сделку: поиск → подбор → знакомство → встреча → сделка.</p>
      <Alert type="success">{notice}</Alert>

      {!isTeam && (
        <form className="card card-amber form" onSubmit={submit} style={{ marginBottom: 24 }}>
          <h3>Новая заявка</h3>
          <div className="field">
            <label htmlFor="goal">{user.role === "investor" ? "Какие стартапы вы ищете?" : "Какая помощь нужна вашему стартапу?"}</label>
            <textarea id="goal" required value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="budget">{user.role === "investor" ? "Бюджет, $" : "Целевой раунд, $"}</label>
              <input id="budget" type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            {user.role === "founder" && (
              <div className="field">
                <label htmlFor="startup">Стартап</label>
                <select id="startup" value={form.startup_id} onChange={(e) => setForm({ ...form, startup_id: e.target.value })}>
                  <option value="">—</option>
                  {myStartups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <Alert>{error}</Alert>
          <button className="btn btn-amber">Отправить заявку</button>
        </form>
      )}

      <h2 className="section-title">{isTeam ? "Все заявки" : "Мои заявки"}</h2>
      {!items ? <Loader /> : items.length === 0 ? <Empty>Заявок пока нет.</Empty> : (
        <div className="stack">
          {items.map((r) => (
            <div className="card stack" key={r.id}>
              <div className="row between">
                <b>Заявка #{r.id} {isTeam && <span className="muted">· {r.requester.full_name} ({r.requester.role})</span>}</b>
                <span className={`tag ${r.step === "closed" ? "tag-muted" : "tag-amber"}`}>{r.step_display}</span>
              </div>
              <p className="pre">{r.goal}</p>
              <div className="small muted">
                Бюджет: {formatMoney(r.budget)} · {formatDate(r.created_at)}
                {r.startup ? <> · Стартап: <Link href={`/startups/${r.startup.id}`}>{r.startup.name}</Link></> : null}
                {r.manager ? ` · Менеджер: ${r.manager.full_name}` : ""}
              </div>
              <Pipeline steps={steps} current={r.step} amber />
              {r.team_notes && <div className="alert alert-info"><b>FOUNDEX:</b> {r.team_notes}</div>}
              {r.suggested_startups.length > 0 && (
                <div className="small">Подобранные стартапы:{" "}
                  {r.suggested_startups.map((s, i) => (
                    <span key={s.id}>{i > 0 && ", "}<Link href={`/startups/${s.id}`}>{s.name}</Link></span>
                  ))}
                </div>
              )}
              {isTeam && <TeamControls request={r} startups={allStartups} onSaved={load} />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <RequireAuth>{(user) => <SupportPage user={user} />}</RequireAuth>;
}
