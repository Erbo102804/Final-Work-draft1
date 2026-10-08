"use client";

import StartupForm from "@/components/StartupForm";
import { RequireAuth } from "@/components/ui";

export default function NewStartupPage() {
  return (
    <RequireAuth roles={["founder"]}>
      <h1>Новый стартап</h1>
      <p className="muted">Стартап → Hook → Демо → Инфо. Заполните публичную карточку и приватные данные.</p>
      <StartupForm />
    </RequireAuth>
  );
}
