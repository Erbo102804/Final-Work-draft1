"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatMoney } from "@/lib/api";
import { Alert, Empty, Loader, RequireAuth, StartupCard, StatusTag } from "@/components/ui";

function Stat({ value, label }) {
  return <div className="card stat"><div className="value">{value ?? 0}</div><div className="label">{label}</div></div>;
}

function FounderDashboard({ stats }) {
  const [startups, setStartups] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  const load = () => {
    api("/startups/mine").then(setStartups).catch((e) => setError(e.message));
    api("/access-requests", { params: { box: "incoming", status: "pending" } }).then(setRequests).catch(() => {});
  };
  useEffect(load, []);

  const respond = async (id, action) => {
    try {
      await api(`/access-requests/${id}/${action}`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <div className="grid grid-4">
        <Stat value={stats.startups_published} label="опубликовано стартапов" />
        <Stat value={stats.views_total} label="просмотров" />
        <Stat value={stats.interests_total} label="заинтересованных инвесторов" />
        <Stat value={stats.connections} label="установленных контактов" />
      </div>
      <Alert>{error}</Alert>

      <section className="section">
        <h2 className="section-title">Новые запросы на доступ {requests.length > 0 && <span className="tag tag-amber">{requests.length}</span>}</h2>
        {requests.length === 0 ? <Empty>Новых запросов нет.</Empty> : (
          <div className="grid grid-2">
            {requests.map((r) => (
              <div className="card stack" key={r.id}>
                <div className="row between">
                  <b>{r.investor.full_name}</b>
                  <span className="small muted">→ {r.startup.name}</span>
                </div>
                {r.investor_profile && (
                  <div className="small muted">
                    {r.investor_profile.company || "Частный инвестор"} · чек {formatMoney(r.investor_profile.ticket_min)}–{formatMoney(r.investor_profile.ticket_max)}
                  </div>
                )}
                {r.message && <p className="pre small">«{r.message}»</p>}
                <div className="btn-row">
                  <button className="btn btn-sm btn-primary" onClick={() => respond(r.id, "approve")}>Открыть доступ</button>
                  <button className="btn btn-sm btn-danger" onClick={() => respond(r.id, "reject")}>Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="row between">
          <h2 className="section-title">Мои стартапы</h2>
          <Link href="/startups/new" className="btn btn-primary btn-sm">+ Новый стартап</Link>
        </div>
        {!startups ? <Loader /> : startups.length === 0 ? (
          <Empty>У вас пока нет стартапов. <Link href="/startups/new">Создайте первый</Link> — Hook + Демо.</Empty>
        ) : (
          <div className="grid grid-3">
            {startups.map((s) => (
              <StartupCard key={s.id} startup={s} extra={
                <div className="row small">
                  <StatusTag status={s.status} label={s.status_display} />
                  <span className="muted">👁 {s.views_count} · ★ {s.interest_count}</span>
                  {s.pending_requests > 0 && <span className="tag tag-amber">{s.pending_requests} запр.</span>}
                </div>
              } />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function InvestorDashboard({ stats, user }) {
  const [recommended, setRecommended] = useState(null);
  const [saved, setSaved] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api("/startups/recommended").then(setRecommended).catch(() => setRecommended([]));
    api("/interests").then(setSaved).catch(() => {});
    api("/access-requests", { params: { box: "outgoing" } }).then(setRequests).catch(() => {});
  }, []);

  const profile = user.investor_profile;
  const noInterests = !profile?.industries?.length && !profile?.stages?.length;

  return (
    <>
      <div className="grid grid-4">
        <Stat value={stats.startups_available} label="стартапов на платформе" />
        <Stat value={stats.saved} label="в избранном" />
        <Stat value={stats.requests_pending} label="запросов ожидают ответа" />
        <Stat value={stats.connections} label="открытых контактов" />
      </div>

      {noInterests && (
        <div className="card card-amber section">
          <b>Укажите интересы</b> — отрасли, стадии и размер чека, чтобы получать рекомендации.{" "}
          <Link href="/profile">Заполнить профиль →</Link>
        </div>
      )}

      <section className="section">
        <h2 className="section-title">Рекомендованные стартапы</h2>
        {!recommended ? <Loader /> : recommended.length === 0 ? (
          <Empty>Пока нет совпадений. <Link href="/startups">Смотреть все стартапы →</Link></Empty>
        ) : (
          <div className="grid grid-3">
            {recommended.map((s) => (
              <StartupCard key={s.id} startup={s} extra={
                <div className="small"><b className="amber">Совпадение {s.match_score}%</b> <span className="muted">· {s.match_reasons.join(" · ")}</span></div>
              } />
            ))}
          </div>
        )}
      </section>

      <section className="section grid grid-2">
        <div className="card">
          <h3>Мои запросы на доступ</h3>
          {requests.length === 0 ? <p className="muted small">Вы ещё не запрашивали доступ.</p> : (
            <div className="stack small">
              {requests.map((r) => (
                <div key={r.id} className="row between">
                  <Link href={r.status === "approved" ? `/connections/${r.id}` : `/startups/${r.startup.id}`}>{r.startup.name}</Link>
                  <StatusTag status={r.status} label={r.status_display} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Избранное</h3>
          {saved.length === 0 ? <p className="muted small">Отмечайте интересные стартапы ☆.</p> : (
            <div className="stack small">
              {saved.map((i) => (
                <div key={i.id} className="row between">
                  <Link href={`/startups/${i.startup.id}`}>{i.startup.name}</Link>
                  <span className="muted">{formatMoney(i.startup.funding_needed)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function TeamDashboard({ stats }) {
  return (
    <>
      <div className="grid grid-4">
        <Stat value={stats.users} label="пользователей" />
        <Stat value={stats.startups_published} label="опубликованных стартапов" />
        <Stat value={stats.requests_total} label="запросов на доступ" />
        <Stat value={stats.support_open} label="открытых заявок SUPPORTED" />
      </div>
      <div className="btn-row section">
        <Link href="/support" className="btn btn-amber">Заявки SUPPORTED</Link>
        <a href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:8000/admin/"} className="btn">Django-админка (модерация)</a>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api("/dashboard").then(setStats).catch(() => {}); }, []);

  return (
    <RequireAuth>
      {(user) => (
        <>
          <h1>Кабинет {user.role === "investor" ? "инвестора" : user.role === "founder" ? "Founder" : "команды FOUNDEX"}</h1>
          <p className="muted">Здравствуйте, {user.full_name || user.email}!</p>
          {!stats ? <Loader /> : user.role === "founder" ? <FounderDashboard stats={stats} />
            : user.role === "investor" ? <InvestorDashboard stats={stats} user={user} />
            : <TeamDashboard stats={stats} />}
        </>
      )}
    </RequireAuth>
  );
}
