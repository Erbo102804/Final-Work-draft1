"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Alert } from "@/components/ui";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", role: params.get("role") === "investor" ? "investor" : "founder",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await register(form);
      router.push(user.role === "investor" ? "/profile?welcome=1" : "/startups/new");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }} className="card">
      <h1>Регистрация</h1>
      <form className="form" onSubmit={submit}>
        <div className="grid grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            ["founder", "Founder", "Есть идея — нужен капитал", "card-accent"],
            ["investor", "Investor", "Есть капитал — нужны возможности", "card-amber"],
          ].map(([value, title, desc, cls]) => (
            <button type="button" key={value} onClick={() => setForm({ ...form, role: value })}
              className={`card ${form.role === value ? cls : ""}`}
              style={{ cursor: "pointer", textAlign: "left", color: "inherit", opacity: form.role === value ? 1 : 0.6 }}>
              <b className={value === "investor" ? "amber" : "accent"}>{title}</b>
              <div className="small muted">{desc}</div>
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="full_name">Имя и фамилия</label>
          <input id="full_name" required value={form.full_name} onChange={set("full_name")} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" type="password" minLength={8} required value={form.password} onChange={set("password")} />
          <span className="hint">Минимум 8 символов, не только цифры.</span>
        </div>
        <Alert>{error}</Alert>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Создаём..." : "Создать аккаунт"}</button>
      </form>
      <p className="small muted" style={{ marginTop: 16 }}>Уже есть аккаунт? <Link href="/login">Войти</Link></p>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
