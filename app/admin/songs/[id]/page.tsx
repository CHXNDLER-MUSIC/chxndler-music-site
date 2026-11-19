import SongWorkspace from "@/components/admin/SongWorkspace";

export default async function SongProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SongWorkspace id={id} />;
}
