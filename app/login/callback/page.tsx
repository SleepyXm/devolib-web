"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { handleGitHubCallback } from "@/app/handlers/auth";
import { useUser } from "@/app/provider/UserProvider";

export default function AuthCallback() {
  const { setUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    handleGitHubCallback()
      .then(({ user }) => {
        setUser(user);
        router.push("/dashboard");
      })
      .catch(() => router.push("/login?error=oauth_failed"));
  }, []);

  return <p>Logging you in...</p>;
}