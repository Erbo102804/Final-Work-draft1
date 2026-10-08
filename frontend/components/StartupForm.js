"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert } from "@/components/ui";

const EMPTY = {
  name: "", hook: "", problem: "", solution: "", demo_url: "", website: "",
  industry: "other", stage: "idea", location: "Бишкек", team_size: 1, team_description: "", funding_needed: 0,
  business_model: "", financials: "", roadmap: "", tech_details: "", pitch_deck_url: "", terms: "",
};

const PUBLIC_TEXT = [
  ["problem", "Проблема", "Кратко: какую боль решаете?"],
  ["solution", "Решение", "Кратко: как вы её решаете?"],
  ["team_description", "Команда", "Кто в команде и почему вы справитесь"],
];

const PRIVATE_TEXT = [
  ["business_model", "Бизнес-модель"],
  ["financials", "Финансы", "Выручка, метрики, юнит-экономика"],
  ["roadmap", "Дорожная карта"],
  ["tech_details", "Технические детали"],
  ["terms", "Условия инвестирования", "Сумма, доля, инструмент (SAFE, equity...)"],
];

export default function StartupForm({ initial }) {
  const { choices } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY };
    if (initial) Object.keys(EMPTY).forEach((k) => { base[k] = initial[k] ?? EMPTY[k]; });
    return base;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (publish) => {
    setBusy(true);
    setError("");
    try {
      const body = { ...form, team_size: Number(form.team_size) || 1, funding_needed: Number(form.funding_needed) || 0 };
      const saved = initial
        ? await api(`/startups/${initial.id}`, { method: "PATCH", body })
        : await api("/startups", { method: "POST", body });
      if (publish) await api(`/startups/${saved.id}/publish`, { method: "POST" });
      router.push(`/startups/${saved.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const textarea = ([key, label, hint]) => (
    <div className="field" key={key}>
      <label htmlFor={key}>{label}</label>
      <textarea id={key} value={form[key]} onChange={set(key)} placeholder={hint} />
    </div>
  );

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <div className="card form card-accent">
        <h3 className="accent">Публичная часть — видят все</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Название стартапа *</label>
            <input id="name" required maxLength={120} value={form.name} onChange={set("name")} />
          </div>
          <div className="field">
            <label htmlFor="industry">Отрасль</label>
            <select id="industry" value={form.industry} onChange={set("industry")}>
              {choices?.industries.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="stage">Стадия</label>
            <select id="stage" value={form.stage} onChange={set("stage")}>
              {choices?.stages.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="hook">Hook * <span className="muted">— одна цепляющая фраза, из-за которой инвестор остановит прокрутку</span></label>
          <input id="hook" required maxLength={200} value={form.hook} onChange={set("hook")} />
          <span className="hint">{form.hook.length}/200</span>
        </div>
        {PUBLIC_TEXT.map(textarea)}
        <div className="form-grid">
          <div className="field">
            <label htmlFor="demo_url">Демо (YouTube / Loom / Vimeo)</label>
            <input id="demo_url" type="url" value={form.demo_url} onChange={set("demo_url")} placeholder="https://" />
          </div>
          <div className="field">
            <label htmlFor="website">Сайт</label>
            <input id="website" type="url" value={form.website} onChange={set("website")} placeholder="https://" />
          </div>
          <div className="field">
            <label htmlFor="funding_needed">Нужно инвестиций, $</label>
            <input id="funding_needed" type="number" min="0" value={form.funding_needed} onChange={set("funding_needed")} />
          </div>
          <div className="field">
            <label htmlFor="team_size">Размер команды</label>
            <input id="team_size" type="number" min="1" value={form.team_size} onChange={set("team_size")} />
          </div>
          <div className="field">
            <label htmlFor="location">Город</label>
            <input id="location" value={form.location} onChange={set("location")} />
          </div>
        </div>
      </div>

      <div className="card form card-amber">
        <h3 className="amber">Приватная часть — только по одобренному запросу</h3>
        {PRIVATE_TEXT.map(textarea)}
        <div className="field">
          <label htmlFor="pitch_deck_url">Ссылка на полный питч</label>
          <input id="pitch_deck_url" type="url" value={form.pitch_deck_url} onChange={set("pitch_deck_url")} placeholder="https://" />
        </div>
      </div>

      <Alert>{error}</Alert>
      <div className="btn-row">
        <button className="btn" disabled={busy}>Сохранить черновик</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(true)}>
          {initial?.status === "published" ? "Сохранить" : "Сохранить и опубликовать"}
        </button>
      </div>
    </form>
  );
}
