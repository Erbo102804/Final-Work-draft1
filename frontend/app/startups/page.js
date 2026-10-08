"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, ChipSelect, Empty, Loader, StartupCard } from "@/components/ui";

const ORDERING = [
  ["", "Сначала Топ и новые"],
  ["-views_count", "Самые просматриваемые"],
  ["funding_needed", "Меньший запрос"],
  ["-funding_needed", "Больший запрос"],
];

const EMPTY_FILTERS = { search: "", industry: [], stage: [], funding_min: "", funding_max: "", location: "", ordering: "" };

export default function StartupsPage() {
  const { user, choices } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [recommended, setRecommended] = useState([]);

  const load = useCallback(async (f, p) => {
    try {
      setError("");
      setData(await api("/startups", { params: { ...f, page: p } }));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(filters, page), 250);
    return () => clearTimeout(timer);
  }, [filters, page, load]);

  useEffect(() => {
    if (user?.role === "investor") api("/startups/recommended").then(setRecommended).catch(() => {});
  }, [user]);

  // Investors start with their declared interests as default filters.
  const applyInterests = () => {
    const p = user?.investor_profile;
    if (!p) return;
    setPage(1);
    setFilters({
      ...EMPTY_FILTERS, industry: p.industries || [], stage: p.stages || [],
      funding_min: p.ticket_min || "", funding_max: p.ticket_max || "",
    });
  };

  const update = (key) => (value) => { setPage(1); setFilters((f) => ({ ...f, [key]: value })); };
  const updateInput = (key) => (e) => update(key)(e.target.value);

  return (
    <>
      <div className="row between">
        <div>
          <h1>Стартапы</h1>
          <p className="muted">Поиск и фильтрация — Hook + Демо каждого проекта.</p>
        </div>
      </div>

      {recommended.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 className="section-title">Рекомендовано для вас <span className="tag tag-amber">matching</span></h2>
          <div className="grid grid-3">
            {recommended.slice(0, 3).map((s) => (
              <StartupCard key={s.id} startup={s} extra={
                <div className="small">
                  <b className="amber">Совпадение {s.match_score}%</b>
                  <div className="muted">{s.match_reasons.join(" · ")}</div>
                </div>
              } />
            ))}
          </div>
        </section>
      )}

      <div className="layout-sidebar">
        <aside className="card form">
          <div className="field">
            <label>Поиск</label>
            <input placeholder="Название, Hook, проблема..." value={filters.search} onChange={updateInput("search")} />
          </div>
          <div className="field">
            <label>Отрасль</label>
            <ChipSelect options={choices?.industries} value={filters.industry} onChange={update("industry")} />
          </div>
          <div className="field">
            <label>Стадия</label>
            <ChipSelect options={choices?.stages} value={filters.stage} onChange={update("stage")} />
          </div>
          <div className="field">
            <label>Запрос инвестиций, $</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input type="number" min="0" placeholder="от" value={filters.funding_min} onChange={updateInput("funding_min")} />
              <input type="number" min="0" placeholder="до" value={filters.funding_max} onChange={updateInput("funding_max")} />
            </div>
          </div>
          <div className="field">
            <label>Город / регион</label>
            <input value={filters.location} onChange={updateInput("location")} />
          </div>
          <div className="field">
            <label>Сортировка</label>
            <select value={filters.ordering} onChange={updateInput("ordering")}>
              {ORDERING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn btn-sm" onClick={() => { setPage(1); setFilters(EMPTY_FILTERS); }}>Сбросить</button>
            {user?.role === "investor" && (
              <button className="btn btn-sm btn-amber" onClick={applyInterests}>Мои интересы</button>
            )}
          </div>
        </aside>

        <div>
          <Alert>{error}</Alert>
          {!data ? <Loader /> : data.results.length === 0 ? (
            <Empty>По вашему запросу стартапов не найдено.</Empty>
          ) : (
            <>
              <p className="muted small">Найдено: {data.count}</p>
              <div className="grid grid-3">
                {data.results.map((s) => <StartupCard key={s.id} startup={s} />)}
              </div>
              {(data.next || data.previous) && (
                <div className="btn-row" style={{ marginTop: 20, justifyContent: "center" }}>
                  <button className="btn btn-sm" disabled={!data.previous} onClick={() => setPage(page - 1)}>← Назад</button>
                  <span className="muted small">Страница {page}</span>
                  <button className="btn btn-sm" disabled={!data.next} onClick={() => setPage(page + 1)}>Вперёд →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
