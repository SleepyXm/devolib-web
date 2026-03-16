"use client";
import { logout } from "@/app/handlers/auth";
import { useState, useEffect } from "react";
import { useUser } from "@/app/provider/UserProvider";
import {
  InfoRow,
  SidebarTab,
  TabSection,
  UserAvatar,
  SidebarActions,
} from "./profilecomponents";

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
          <UserAvatar username={username} />
          <div className="flex flex-col w-full gap-2">
            <SidebarTab
              label="Account Info"
              active={activeTab === "account"}
              onClick={() => setActiveTab("account")}
            />
            <SidebarTab
              label="Models"
              active={activeTab === "models"}
              onClick={() => setActiveTab("models")}
            />
            <SidebarTab
              label="Sessions"
              active={activeTab === "sessions"}
              onClick={() => setActiveTab("sessions")}
            />
            <SidebarTab
              label="Billing"
              active={activeTab === "billing"}
              onClick={() => setActiveTab("billing")}
            />
            <SidebarTab
              label="Data"
              active={activeTab === "data"}
              onClick={() => setActiveTab("data")}
            />
            <SidebarTab
              label="Personalization"
              active={activeTab === "personalization"}
              onClick={() => setActiveTab("personalization")}
            />
          </div>
          <SidebarActions onLogout={logout} />
        </div>

        <div className="flex-1 overflow-auto flex flex-col gap-4">
          {activeTab === "account" && (
            <TabSection title="Account Information">
              <InfoRow label="Username" value={user.username} />
              <InfoRow label="Password" value="••••••••" />
              <InfoRow label="Email" />
            </TabSection>
          )}
          {activeTab === "models" && (
            <TabSection title="Models">
              <InfoRow label="Username" value={username} />
              <InfoRow label="Password" value="bombokhalas" />
              <InfoRow label="Email" />
            </TabSection>
          )}
          {activeTab === "sessions" && (
            <TabSection title="Sessions">
              <InfoRow label="Username" value={username} />
              <InfoRow label="Password" value="••••••••" />
              <InfoRow label="Email" />
            </TabSection>
          )}
          {activeTab === "billing" && (
            <TabSection title="Billing">
              <InfoRow label="Username" value={username} />
              <InfoRow label="Password" value="••••••••" />
              <InfoRow label="Email" />
            </TabSection>
          )}
          {activeTab === "data" && (
            <TabSection title="Data">
              <InfoRow label="Username" value={username} />
              <InfoRow label="Password" value="••••••••" />
              <InfoRow label="Email" />
            </TabSection>
          )}
          {activeTab === "personalization" && (
            <TabSection title="Personalization">
              <InfoRow label="Editor Theme" value="Devolib Default" />
              <InfoRow label="Design Assistant" value="Deepseek" />
            </TabSection>
          )}
        </div>
      </div>
    </div>
  );
}
