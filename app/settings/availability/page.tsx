import Link from "next/link";
import { requireLecturerOrPublisher } from "@/lib/session";
import { AvailabilityManager } from "@/components/availability-manager";
import type { AvailabilityBlock } from "@/lib/types";

export default async function AvailabilityPage() {
  const { supabase, profile } = await requireLecturerOrPublisher();
  const { data } = await supabase
    .from("availability_blocks")
    .select("*")
    .eq("owner_id", profile.id)
    .order("start_date");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-ink-faint hover:text-ink">← Back to settings</Link>
        <p className="eyebrow mt-2">Availability</p>
        <h1 className="text-3xl font-semibold">Your calendar</h1>
        <p className="text-sm text-ink-soft">
          Mark dates you&apos;re unavailable, or flag an upcoming conference — learners see this on your public profile before asking for a session.
        </p>
      </div>
      <AvailabilityManager initialBlocks={(data ?? []) as AvailabilityBlock[]} />
    </div>
  );
}
