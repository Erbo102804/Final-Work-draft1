"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StartupForm from "@/components/StartupForm";
import { Alert, Loader, RequireAuth } from "@/components/ui";

export default function EditStartupPage({ params }) {
  const [startup, setStartup] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/startups/${params.id}`).then(setStartup).catch((err) => setError(err.message));
  }, [params.id]);

  return (
    <RequireAuth roles={["founder", "admin"]}>
      <h1>Редактирование</h1>
      <Alert>{error}</Alert>
      {startup && !startup.is_owner ? <Alert>Редактировать может только владелец.</Alert> : null}
      {!startup && !error ? <Loader /> : null}
      {startup?.is_owner ? <StartupForm initial={startup} /> : null}
    </RequireAuth>
  );
}
