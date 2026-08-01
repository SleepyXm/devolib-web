"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleGitHubCallback } from "@/app/handlers/auth";
import { Panel, Status, ui } from "@/app/UI";
import { useUser } from "@/app/provider/UserProvider";

export default function AuthCallback() {
  const { setUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    handleGitHubCallback()
      .then(({ user }) => { setUser(user); router.push("/dashboard"); })
      .catch(() => router.push("/login?error=oauth_failed"));
  }, [router, setUser]);

  return (
    <main className={`${ui.page} grid place-items-center`}>
      <Panel className="grid gap-3 p-8 text-center">
        <Status state="idle">authorising GitHub</Status>
        <p className="m-0 text-sm text-white/45">Opening your workspace…</p>
      </Panel>
    </main>
  );
}
