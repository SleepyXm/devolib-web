"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/app/provider/UserProvider";

export default function DashboardPage() {
  const user = useUser();
  const loggedInUsername = user?.user?.username;
  // default urlUsername to the logged-in username if params are missing
  const { username: urlUsername = loggedInUsername } = useParams() || {};
  const router = useRouter();


  useEffect(() => {
    if (!user?.user) router.push("/login");
  }, [user, router]);

  useEffect(() => {
  if (loggedInUsername) {
    const newUrl = `/${loggedInUsername}s-dashboard`;
    if (window.location.pathname !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }
}, [loggedInUsername]);


  useEffect(() => {
  if (urlUsername && loggedInUsername && urlUsername !== loggedInUsername) {
    router.replace("/dashboard"); // fallback to canonical dashboard
  }
  }, [urlUsername, loggedInUsername, router]);

  return (
    <div>
      <h1 className="text-zinc-600">{loggedInUsername}'s Dashboard</h1>
      {/* dashboard content */}
    </div>
  );
}