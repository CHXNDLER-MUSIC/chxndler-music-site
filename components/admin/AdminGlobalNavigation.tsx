"use client";

import { useEffect, useState } from "react";
import BrandNavigation from "@/components/admin/BrandNavigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function AdminGlobalNavigation() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    if (!user) return () => { active = false; };

    fetch("/api/admin/session", { cache: "no-store" })
      .then(response => response.ok ? response.json() : { isAdmin: false })
      .then(result => { if (active) setIsAdmin(result.isAdmin === true); })
      .catch(() => { if (active) setIsAdmin(false); });

    return () => { active = false; };
  }, [user]);

  if (loading || !isAdmin) return null;

  return <div className="fixed left-1/2 top-3 z-[100] -translate-x-1/2 sm:top-5">
    <BrandNavigation />
  </div>;
}
