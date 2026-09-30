import { requirePublisher } from "@/lib/session";
import { UploadForm } from "@/components/upload-form";

export default async function PublisherUploadPage() {
  const { user } = await requirePublisher();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow">New publication</p>
        <h1 className="text-3xl font-semibold">Upload a research publication or journal</h1>
        <p className="text-sm text-ink-soft">PDF only, up to 50 MB. Students can only read it inside Lectern, watermarked with their name and ID.</p>
      </div>
      <UploadForm userId={user.id} variant="publisher" />
    </div>
  );
}
