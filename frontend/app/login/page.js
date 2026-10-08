"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Alert } from "@/components/ui";

const DEMO = [
  ["founder@foundex.demo", "Founder"],
  ["investor@foundex.demo", "Investor"],
  ["admin@foundex.demo", "Команда FOUNDEX"],
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.status === 401 ? "Неверный email или пароль." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <div className="card">
        <h1>Вход</h1>
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Alert>{error}</Alert>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Входим..." : "Войти"}</button>
        </form>
        <p className="small muted" style={{ marginTop: 16 }}>
          Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
        </p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <p className="small muted">Демо-аккаунты (пароль <code>foundex2026</code>):</p>
        <div className="btn-row">
          {DEMO.map(([demoEmail, label]) => (
            <button key={demoEmail} type="button" className="btn btn-sm"
              onClick={() => { setEmail(demoEmail); setPassword("foundex2026"); }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
