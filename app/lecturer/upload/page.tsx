import { requireLecturer } from "@/lib/session";
import { UploadForm } from "@/components/upload-form";

export default async function UploadPage() {
  const { user } = await requireLecturer();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow">New title</p>
        <h1 className="text-3xl font-semibold">Upload a book or handout</h1>
        <p className="text-sm text-ink-soft">PDF only, up to 50 MB. Students can only read it inside Lectern, watermarked with their name and ID.</p>
      </div>
      <UploadForm userId={user.id} variant="lecturer" />
    </div>
  );
}
