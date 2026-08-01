"use client";

import { Boxes, GitBranch, ScanSearch } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Popup from "@/app/components/ErrorPopup";
import { login, loginWithGitHub, signup } from "@/app/handlers/auth";
import { Action, content, Eyebrow, Panel, Status, ui } from "@/app/UI";
import { useUser } from "@/app/provider/UserProvider";
import { AuthDivider, AuthInput, GithubButton } from "./logincomponents";

const signals = [
  [GitBranch, "Import from a connected GitHub account"],
  [ScanSearch, "Discover routes, endpoints, roots, and schema"],
  [Boxes, "Control isolated project services"],
] as const;

export default function Auth() {
  const { setUser } = useUser();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [signUp, setSignUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  async function submit() {
    try {
      if (signUp) {
        if (password !== confirmation) return setError("Passwords do not match.");
        if (!email.includes("@")) return setError("Enter a valid email address.");
        await signup(username, email, password);
        return setSuccess("Account created. Check your email to verify it.");
      }
      const result = await login(username, password);
      setUser(result);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    }
  }

  return (
    <main className={`${ui.page} grid grid-cols-[1.05fr_.95fr] max-lg:grid-cols-1`}>
      <Popup message={error} onClose={() => setError("")} type="error" />
      <Popup message={success} onClose={() => setSuccess("")} type="success" />

      <section className="grid content-center gap-8 border-r border-white/10 p-[clamp(2rem,8vw,8rem)] max-lg:hidden">
        <div className="grid max-w-xl gap-5">
          <Eyebrow>{content.auth.eyebrow}</Eyebrow>
          <h1 className="text-5xl font-medium tracking-[-.05em]">{content.auth.title}</h1>
          <p className="text-lg text-white/50">{content.auth.description}</p>
        </div>
        <div className="grid max-w-xl gap-px border border-white/10 bg-white/10">
          {signals.map(([Icon, text]) => (
            <div className="flex min-h-14 items-center gap-3 bg-[var(--dv-surface)] px-4 text-xs text-white/55" key={text}>
              <Icon size={14} className="text-[var(--dv-accent)]" /> {text}
            </div>
          ))}
        </div>
      </section>

      <section className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#0e1117]/70 p-6">
        <Panel className="w-full max-w-md border-white/20 p-8">
          <header className="mb-7 grid gap-3">
            <Status>{signUp ? "new identity" : "secure area"}</Status>
            <h2 className="text-2xl font-medium tracking-[-.035em]">
              {signUp ? "Create your account" : "Sign in to Devolib"}
            </h2>
            <p className="m-0 text-sm text-white/45">
              {signUp ? "Create an identity for your project runtimes." : content.auth.description}
            </p>
          </header>
          <form
            className="grid gap-4"
            onSubmit={(event) => { event.preventDefault(); void submit(); }}
          >
            <AuthInput label="Username" type="text" placeholder="your-handle" value={username} onChange={(event) => setUsername(event.target.value)} />
            {signUp && <AuthInput label="Email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />}
            <AuthInput label="Password" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} />
            {signUp && <AuthInput label="Confirm password" type="password" placeholder="••••••••" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />}
            <Action type="submit" className="w-full">{signUp ? "Create account" : "Enter workspace"}</Action>
            <AuthDivider />
            <GithubButton onClick={loginWithGitHub} />
          </form>
          <p className="mb-0 mt-6 text-xs text-white/40">
            {signUp ? "Already have an account?" : "New to Devolib?"}{" "}
            <button className="text-[var(--dv-accent)]" onClick={() => setSignUp((value) => !value)}>
              {signUp ? "Sign in" : "Create account"}
            </button>
          </p>
        </Panel>
      </section>
    </main>
  );
}
