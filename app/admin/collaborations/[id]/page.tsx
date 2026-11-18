import { redirect } from "next/navigation";
export default async function CollaborationDetailLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/collaborations?request=${encodeURIComponent(id)}`);
}
