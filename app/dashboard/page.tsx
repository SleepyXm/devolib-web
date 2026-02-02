"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/app/provider/UserProvider";

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();
  const loggedInUsername = user?.user?.username;


  return (
    <div className="text-zinc-600 p-8">
      <h1 className="text-zinc-600 text-2xl font-bold">{loggedInUsername}'s Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4"> 
        <h1 className="text-xl mb-4">Welcome to your Dashboard</h1>
      </div>
      <div className="mt-2 p-4 h-[70vh] bg-white rounded-lg shadow">
        <h1 className="text-lg font-semibold mb-2">
          Recent Projects
        </h1>

      </div>
    </div>
  );
}