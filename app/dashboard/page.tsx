"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/app/provider/UserProvider";

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();
  const loggedInUsername = user?.user?.username;


  return (
    <div>
      <h1 className="text-zinc-600">{loggedInUsername}'s Dashboard</h1>
    </div>
  );
}