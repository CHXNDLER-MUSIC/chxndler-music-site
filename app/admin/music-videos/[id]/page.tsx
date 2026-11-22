"use client";

import { use } from "react";
import MusicVideoWorkspace from "@/components/admin/MusicVideoWorkspace";

export default function MusicVideoWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MusicVideoWorkspace id={id} />;
}
