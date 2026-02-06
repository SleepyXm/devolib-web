"use client";
import { logout } from "@/app/handlers/auth";
import { useState, useEffect } from "react";
import { useUser } from "@/app/provider/UserProvider";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("account");
  const { user } = useUser();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);


  if (!hydrated) return null;
  if (!user) return <div>Loading...</div>;

  const { username } = user;

  return (
    <div className="min-h-screen flex justify-center items-start py-8 relative text-black dark:text-zinc-200">
      <div className="w-[85vw] h-[85vh] border-3 border-black/70 dark:border-white p-6 shadow-2xl flex gap-6">
        <div className="w-48 flex flex-col items-center border-r border-black/20 dark:border-white/10 pr-4 gap-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-medium text-black dark:text-zinc-200">
              {username ? username[0].toUpperCase() : "?"}
            </div>
            <div className="text-black text-sm mt-1">{username}</div>
          </div>

          <div className="flex flex-col w-full gap-2">
            <button
              className={`w-full px-4 py-2 text-left rounded-md ${
                activeTab === "account"
                  ? "text-black font-semibold dark:text-zinc-200"
                  : "text-black/50 dark:text-zinc-200 duration-300 transition-all hover:bg-black/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("account")}
            >
              Account Info
            </button>
            <button
              className={`w-full px-4 py-2 text-left rounded-md ${
                activeTab === "models"
                  ? "text-black font-semibold dark:text-zinc-200"
                  : "text-black/50 dark:text-zinc-200 duration-300 transition-all hover:bg-black/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("models")}
            >
              Models
            </button>
            <button
              className={`w-full px-4 py-2 text-left rounded-md ${
                activeTab === "sessions"
                  ? "text-black font-semibold dark:text-zinc-200"
                  : "text-black/50 dark:text-zinc-200 duration-300 transition-all hover:bg-black/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("sessions")}
            >
              Sessions
            </button>
            <button
              className={`w-full px-4 py-2 text-left rounded-md ${
                activeTab === "billing"
                  ? "text-black font-semibold dark:text-zinc-200"
                  : "text-black/50 dark:text-zinc-200 duration-300 transition-all hover:bg-black/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("billing")}
            >
              Billing
            </button>
            <button
              className={`w-full px-4 py-2 text-left rounded-md ${
                activeTab === "data"
                  ? "bg-white/10 text-black font-semibold dark:text-zinc-200"
                  : "text-black/50 dark:text-zinc-200 duration-300 transition-all hover:bg-black/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("data")}
            >
              Data
            </button>

            <button
              className={`w-full px-4 py-2 text-left rounded-md ${
                activeTab === "personalization"
                  ? "bg-white/10 text-black font-semibold dark:text-zinc-200"
                  : "text-black/50 dark:text-zinc-200 duration-300 transition-all hover:bg-black/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("personalization")}
            >
              Personalization
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-auto w-full">
            <a
              href="/settings"
              className="w-full px-3 py-2 rounded-lg bg-white/5 text-black border border-white/10 text-center dark:text-zinc-200"
            >
              Settings
            </a>
            <button
              onClick={() => logout()}
              className="w-full px-3 py-2 border-2 border-black bg-red-500 hover:bg-red-400 transition"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex flex-col gap-4">
          {activeTab === "account" && (
            <>
              <h2 className="text-3xl font-semibold mt-6 transition-all">
                Account Information
              </h2>

              <div className="flex items-center justify-between border-2 border-black rounded-lg dark:border-white p-3  mt-[2%]">
                <span className="font-medium">Username:</span>
                <span>{user.username}</span>
              </div>

              <div className="flex items-center justify-between border-2 border-black rounded-lg dark:border-white p-3">
                <span className="font-medium">Password:</span>
                <span className="tracking-widest">••••••••</span>
              </div>

              <div className="flex items-center justify-between border-2 border-black rounded-lg dark:border-white p-3">
                <span className="font-medium">Email:</span>
                
              </div>
            </>
          )}

          {activeTab === "models" && (
            <>
              <h2 className="text-3xl font-semibold mt-6">Models</h2>
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md mt-[2%]">
                <span className="font-medium">Username:</span>
                <span>{username}</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Password:</span>
                <span className="tracking-widest">••••••••</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Email:</span>
                
              </div>

            </>
          )}
          {activeTab === "sessions" && (
            <>
              <h2 className="text-3xl font-semibold mt-6">
                Sessions
              </h2>
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md mt-[2%]">
                <span className="font-medium">Username:</span>
                <span>{username}</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Password:</span>
                <span className="tracking-widest">••••••••</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Email:</span>
                 
              </div>
            </>
          )}
          {activeTab === "billing" && (
            <>
              <h2 className="text-3xl font-semibold mt-6">
                Billing
              </h2>
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md mt-[2%]">
                <span className="font-medium">Username:</span>
                <span>{username}</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Password:</span>
                <span className="tracking-widest">••••••••</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Email:</span>
                 
              </div>

            </>
          )}

          {activeTab === "data" && (
            <>
              <h2 className="text-3xl font-semibold mt-6">Data</h2>
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md mt-[2%]">
                <span className="font-medium">Username:</span>
                <span>{username}</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Password:</span>
                <span className="tracking-widest">••••••••</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Email:</span>
                 
              </div>
            </>
          )}

          {activeTab === "personalization" && (
            <>
              <h2 className="text-3xl font-semibold mt-6">
                Personalization
              </h2>
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md mt-[2%]">
                <span className="font-medium">Username:</span>
                <span>{username}</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Password:</span>
                <span className="tracking-widest">••••••••</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-md">
                <span className="font-medium">Email:</span>
                 
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
