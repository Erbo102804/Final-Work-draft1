"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, embedUrl, formatMoney } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, Loader, StatusTag } from "@/components/ui";

const PRIVATE = [
  ["business_model", "Бизнес-модель"],
  ["financials", "Финансы"],
  ["roadmap", "Дорожная карта"],
  ["tech_details", "Технические детали"],
  ["terms", "Условия"],
];

const FUNNEL = ["Hook", "Интерес", "Доступ", "Контакт"];

function funnelIndex(startup) {
  if (startup.has_access) return 3;
  if (startup.access_request?.status === "pending") return 2;
  if (startup.is_interested) return 1;
  return 0;
}

export default function StartupDetailPage({ params }) {
  const { user } = useAuth();
  const [startup, setStartup] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [interested, setInterested] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await api(`/startups/${params.id}`);
      setStartup(data);
      if (data.is_owner) setInterested(await api(`/startups/${params.id}/interested`));
    } catch (err) {
      setError(err.status === 404 ? "Стартап не найден или ещё не опубликован." : err.message);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load, user]);

  const run = async (fn, successText) => {
    setError("");
    setNotice("");
    try {
      await fn();
      if (successText) setNotice(successText);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !startup) return <Alert>{error}</Alert>;
  if (!startup) return <Loader />;

  const embed = embedUrl(startup.demo_url);
  const isInvestor = user?.role === "investor";
  const req = startup.access_request;
  const step = funnelIndex(startup);

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <Link href="/startups" className="small">← Все стартапы</Link>
      </div>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="tag">{startup.stage_display}</span>
            <span className="tag tag-muted">{startup.industry_display}</span>
            {startup.is_featured && <span className="tag tag-amber">TOP</span>}
            {startup.is_owner && <StatusTag status={startup.status} label={startup.status_display} />}
          </div>
          <h1>{startup.name}</h1>
          <p className="accent" style={{ fontSize: "1.2rem", fontWeight: 600 }}>{startup.hook}</p>
        </div>
        {startup.is_owner && (
          <div className="btn-row">
            <Link href={`/startups/${startup.id}/edit`} className="btn btn-sm">Редактировать</Link>
            {startup.status === "published" ? (
              <button className="btn btn-sm" onClick={() => run(() => api(`/startups/${startup.id}/unpublish`, { method: "POST" }), "Снято с публикации")}>
                Снять с публикации
              </button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => run(() => api(`/startups/${startup.id}/publish`, { method: "POST" }), "Опубликовано!")}>
                Опубликовать
              </button>
            )}
          </div>
        )}
      </div>

      <Alert>{error}</Alert>
      <Alert type="success">{notice}</Alert>

      <div className="layout-detail" style={{ marginTop: 16 }}>
        <div className="stack">
          {embed ? (
            <iframe className="demo" src={embed} title="Демо" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" />
          ) : startup.demo_url ? (
            <a className="demo-placeholder" href={startup.demo_url} target="_blank" rel="noreferrer">▶ Открыть демо</a>
          ) : (
            <div className="demo-placeholder">Демо пока не добавлено</div>
          )}

          <div className="card grid grid-2">
            <div><h3 className="accent">Проблема</h3><p className="pre">{startup.problem}</p></div>
            <div><h3 className="accent">Решение</h3><p className="pre">{startup.solution}</p></div>
          </div>
          {startup.team_description && (
            <div className="card"><h3>Команда — {startup.team_size} чел.</h3><p className="pre">{startup.team_description}</p></div>
          )}

          <div className={`card card-amber ${startup.has_access ? "" : "locked"}`}>
            <h3 className="amber">{startup.has_access ? "🔓 Приватная информация" : "🔒 Приватно (по запросу)"}</h3>
            {startup.has_access ? (
              <>
                {PRIVATE.map(([key, label]) => startup[key] ? (
                  <div className="private-item" key={key}><h4>{label}</h4><div className="pre">{startup[key]}</div></div>
                ) : null)}
                {startup.pitch_deck_url && (
                  <div className="private-item"><h4>Полный питч</h4><a href={startup.pitch_deck_url} target="_blank" rel="noreferrer">{startup.pitch_deck_url}</a></div>
                )}
                {PRIVATE.every(([key]) => !startup[key]) && !startup.pitch_deck_url && (
                  <p className="muted">Founder пока не заполнил приватные данные.</p>
                )}
              </>
            ) : (
              <>
                <p className="muted small">Бизнес-модель, финансы, дорожная карта, техдетали, полный питч и условия открываются после одобрения запроса Founder&apos;ом.</p>
                <div className="blur">
                  {PRIVATE.map(([key, label]) => (
                    <div className="private-item" key={key}><h4>{label}</h4>████████ ██████ ████████████ ████</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="stack">
          <div className="card">
            <div className="stat"><div className="value">{formatMoney(startup.funding_needed)}</div><div className="label">нужно инвестиций</div></div>
            <hr style={{ borderColor: "var(--border)", margin: "14px 0" }} />
            <div className="small stack" style={{ gap: 6 }}>
              <div>Команда: <b>{startup.team_size} чел.</b></div>
              {startup.location && <div>Город: <b>{startup.location}</b></div>}
              {startup.website && <div>Сайт: <a href={startup.website} target="_blank" rel="noreferrer">{startup.website}</a></div>}
              <div>Founder: <b>{startup.founder.full_name || "—"}</b></div>
              <div className="muted">👁 {startup.views_count} · ★ {startup.interest_count} заинтересованных</div>
            </div>
          </div>

          {isInvestor && (
            <div className="card card-accent stack">
              <div className="pipeline">
                {FUNNEL.map((label, i) => (
                  <div key={label} className={`step ${i < step ? "done" : ""} ${i === step ? "current" : ""}`}>{label}</div>
                ))}
              </div>
              <button className={`btn ${startup.is_interested ? "btn-outline" : ""}`}
                onClick={() => run(() => api(`/startups/${startup.id}/interest`, { method: startup.is_interested ? "DELETE" : "POST" }))}>
                {startup.is_interested ? "★ В избранном" : "☆ Интересно"}
              </button>
              {!req && !showRequest && (
                <button className="btn btn-primary" onClick={() => setShowRequest(true)}>Запросить доступ</button>
              )}
              {!req && showRequest && (
                <div className="stack">
                  <textarea placeholder="Пара слов о себе и почему вам интересен проект" value={message} onChange={(e) => setMessage(e.target.value)} />
                  <button className="btn btn-primary" onClick={() => run(
                    () => api(`/startups/${startup.id}/request-access`, { method: "POST", body: { message } }),
                    "Запрос отправлен Founder'у",
                  )}>Отправить запрос</button>
                </div>
              )}
              {req?.status === "pending" && <Alert type="info">Запрос на доступ отправлен — ждём ответа Founder&apos;а.</Alert>}
              {req?.status === "rejected" && <Alert>Founder отклонил запрос на доступ.</Alert>}
              {req?.status === "approved" && (
                <Link href={`/connections/${req.id}`} className="btn btn-primary">Написать Founder&apos;у</Link>
              )}
            </div>
          )}

          {!user && (
            <div className="card card-accent">
              <p>Хотите увидеть финансы и связаться с командой?</p>
              <Link href="/register?role=investor" className="btn btn-primary">Зарегистрироваться как Investor</Link>
            </div>
          )}

          {startup.founder_contacts && !startup.is_owner && (
            <div className="card">
              <h3>Контакты Founder</h3>
              <div className="small stack" style={{ gap: 4 }}>
                <div>{startup.founder_contacts.full_name}</div>
                <a href={`mailto:${startup.founder_contacts.email}`}>{startup.founder_contacts.email}</a>
                {startup.founder_contacts.telegram && <div>Telegram: {startup.founder_contacts.telegram}</div>}
                {startup.founder_contacts.phone && <div>Тел: {startup.founder_contacts.phone}</div>}
                {startup.founder_contacts.linkedin && <a href={startup.founder_contacts.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
              </div>
            </div>
          )}

          {startup.is_owner && (
            <div className="card">
              <h3>Заинтересованные инвесторы</h3>
              {interested.length === 0 ? <p className="muted small">Пока никого — поделитесь ссылкой на стартап.</p> : (
                <div className="stack small">
                  {interested.map((i) => (
                    <div key={i.id}><b>{i.investor.full_name}</b>{i.investor_company ? ` · ${i.investor_company}` : ""}</div>
                  ))}
                </div>
              )}
              <Link href="/connections" className="small">Запросы на доступ →</Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
