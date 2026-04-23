"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signup, login, loginWithGitHub } from "@/app/handlers/auth";
import { useUser } from "@/app/provider/UserProvider";
import Popup from "@/app/components/ErrorPopup";
import { AuthInput, AuthDivider, AuthFooter, GithubButton } from "./logincomponents";


export default function Auth() {
  const { setUser } = useUser();
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter();

  useEffect(() => {
    setMounted(true); 
  }, []);

  if (!mounted) return null;

  async function handleSubmit() {
  try {
    if (isSignUp) {
      if (password !== password2) {
        setError("Passwords do not match!");
        return; // stop execution
      }
      if (!email.includes("@")) {
        setError("Please enter a valid email address.");
        return; // stop execution
      }

      const res = await signup(userName, email, password);
      setSuccess("Account created! Check your email to verify.");
    } else {
      const res = await login(userName, password);
      setUser(res);
      router.push(`/dashboard`);
    }
  } catch (err) {
    if (isSignUp) {
       setError(err.message || "Failed to create account. Please try again.");
    }
    else {
    setError("Username or Password was inccorect. Try again");
    }
  }
}

async function handleGitHubLogin() {
  try {
    loginWithGitHub(); // triggers the redirect
  } catch (err) {
    const error = err instanceof Error ? err.message : "Something went wrong.";
    setError(error);
  }
}



  return (
  <div className="grid grid-rows-[5vh_1fr_5vh] items-center justify-items-center min-h-screen gap-[5vh]">
    <Popup message={error} onClose={() => setError("")} type="error" />
    <Popup message={success} onClose={() => setSuccess("")} type="success" />
    <div className="flex flex-col gap-[4vh] row-start-2 items-center w-[30vw]">
        <div className="group relative w-full h-full bg-gradient-to-b from-gray-600/70 via-gray-700/40 to-gray-800/60 backdrop-blur-lg p-4 rounded-xl border border-gray-400/50">

          {/* spinning blurs */}

              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80"></span>
                  <span>Secure area</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  {isSignUp ? "Create your account" : "Sign in"}
                </h2>
                <p className="text-sm text-gray-400 mt-1.5">
                  {isSignUp ? "Enter your username and password to create an account." : "Use your username and password to sign in."}
                </p>
              </div>

              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
                <AuthInput label="Username" type="text" placeholder="Enter your username" value={userName} onChange={(e) => setUserName(e.target.value)} />
                <AuthInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  extra={<a href="#" className="text-xs text-gray-400 hover:text-teal-300 transition-all ease-in-out duration-200">Forgot your Password?</a>}
                />

                {isSignUp && (
                  <>
                    <AuthInput label="Email" type="text" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <AuthInput label="Re-enter Password" type="password" placeholder="Re-enter your password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                  </>
                )}

                {/* Remember me */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="sr-only peer" />
                    <span className="h-4 w-4 rounded-md ring-1 ring-gray-600/40 bg-gray-900/50 flex items-center justify-center peer-checked:bg-gray-200 transition">
                      <svg className="h-3 w-3 text-gray-900 opacity-0 peer-checked:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="m9 12 2 2 4-4"></path></svg>
                    </span>
                    <span className="text-xs text-gray-300">Remember me</span>
                  </label>
                  <a href="#" className="text-xs text-gray-400 hover:text-teal-300">Trouble signing in?</a>
                </div>

                <button type="submit" className="w-full inline-flex gap-2 shadow-[inset_0_-2px_25px_-4px_rgba(255,255,255,0.2)] ring-1 ring-white/10 hover:ring-gray-300/40 hover:from-gray-600 hover:to-gray-500 hover:shadow-lg transition-all duration-300 text-sm font-medium text-white bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg py-2.5 px-4 items-center justify-center">
                  Sign {isSignUp ? "Up" : "In"}
                </button>

                <AuthDivider />
                <GithubButton onClick={handleGitHubLogin} />
              </form>

              <AuthFooter isSignUp={isSignUp} onToggle={() => setIsSignUp(!isSignUp)} />
            </div>
          </div>
      </div>
  )
}
