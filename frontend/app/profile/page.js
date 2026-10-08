"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, ChipSelect, RequireAuth } from "@/components/ui";

function ProfileForm({ user }) {
  const { choices, setUser } = useAuth();
  const params = useSearchParams();
  const [form, setForm] = useState({
    full_name: user.full_name, phone: user.phone, telegram: user.telegram, linkedin: user.linkedin, bio: user.bio,
  });
  const [profile, setProfile] = useState(user.investor_profile || null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setP = (key) => (value) => setProfile({ ...profile, [key]: value });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const body = { ...form };
      if (profile) {
        body.investor_profile = { ...profile, ticket_min: Number(profile.ticket_min) || 0, ticket_max: Number(profile.ticket_max) || 0 };
      }
      setUser(await api("/auth/me", { method: "PATCH", body }));
      setNotice("Профиль сохранён.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="form" onSubmit={save}>
      {params.get("welcome") && (
        <Alert type="success">Добро пожаловать в FOUNDEX! Укажите интересы — и мы подберём подходящие стартапы.</Alert>
      )}
      <div className="card form">
        <h3>Контакты</h3>
        <p className="small muted">Контакты видны другой стороне только после одобрения запроса на доступ.</p>
        <div className="form-grid">
          <div className="field"><label>Имя</label><input value={form.full_name} onChange={set("full_name")} /></div>
          <div className="field"><label>Email</label><input value={user.email} disabled /></div>
          <div className="field"><label>Телефон</label><input value={form.phone} onChange={set("phone")} /></div>
          <div className="field"><label>Telegram</label><input value={form.telegram} onChange={set("telegram")} placeholder="@username" /></div>
          <div className="field"><label>LinkedIn</label><input type="url" value={form.linkedin} onChange={set("linkedin")} placeholder="https://" /></div>
        </div>
        <div className="field"><label>О себе</label><textarea value={form.bio} onChange={set("bio")} /></div>
      </div>

      {profile && (
        <div className="card card-amber form">
          <h3 className="amber">Интересы инвестора</h3>
          <div className="form-grid">
            <div className="field"><label>Компания / фонд</label><input value={profile.company} onChange={(e) => setP("company")(e.target.value)} /></div>
            <div className="field">
              <label>Тип инвестора</label>
              <select value={profile.investor_type} onChange={(e) => setP("investor_type")(e.target.value)}>
                {choices?.investor_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Регион</label><input value={profile.location} onChange={(e) => setP("location")(e.target.value)} /></div>
          </div>
          <div className="field">
            <label>Отрасли</label>
            <ChipSelect options={choices?.industries} value={profile.industries} onChange={setP("industries")} />
          </div>
          <div className="field">
            <label>Стадии</label>
            <ChipSelect options={choices?.stages} value={profile.stages} onChange={setP("stages")} />
          </div>
          <div className="form-grid">
            <div className="field"><label>Чек от, $</label><input type="number" min="0" value={profile.ticket_min} onChange={(e) => setP("ticket_min")(e.target.value)} /></div>
            <div className="field"><label>Чек до, $ (0 — без ограничения)</label><input type="number" min="0" value={profile.ticket_max} onChange={(e) => setP("ticket_max")(e.target.value)} /></div>
          </div>
        </div>
      )}
      <Alert>{error}</Alert>
      <Alert type="success">{notice}</Alert>
      <div><button className="btn btn-primary">Сохранить</button></div>
    </form>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      {(user) => (
        <>
          <h1>Профиль</h1>
          <Suspense><ProfileForm user={user} /></Suspense>
        </>
      )}
    </RequireAuth>
  );
}
