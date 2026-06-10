import { redirect } from "next/navigation";

export default async function AdminRoundRedirect({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  redirect(`/rounds/${roundId}`);
}
