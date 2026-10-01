import { requireProfile } from "@/lib/session";
import { completeOnboarding } from "@/app/actions";
import { AvatarUploader } from "@/components/avatar-uploader";
import { PublicationsEditor } from "@/components/publications-editor";
import { SchedulePicker } from "@/components/schedule-picker";

export default async function OnboardingPage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile, user } = await requireProfile();
  const isPublisher = profile.role === "publisher";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="eyebrow">One last step</p>
        <h1 className="text-3xl font-semibold">Complete your profile</h1>
        <p className="text-sm text-ink-soft">
          Students see this before asking you a question or booking a session — a photo, a short bio, and when
          you&apos;re available. Institution and publications are optional.
        </p>
      </div>

      {searchParams.error && <p className="rounded bg-clay-light px-3 py-2 text-sm text-clay">{searchParams.error}</p>}

      <div className="card space-y-3 p-6">
        <p className="label">Photo</p>
        <AvatarUploader userId={user.id} fullName={profile.full_name} initialPath={profile.avatar_path} />
      </div>

      <form action={completeOnboarding} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="full_name">{isPublisher ? "Publisher / organization name" : "Full name"}</label>
          <input id="full_name" name="full_name" defaultValue={profile.full_name} required className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="department">{isPublisher ? "Field / discipline" : "Department"}</label>
            <input id="department" name="department" defaultValue={profile.department ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="institution">University / institution (optional)</label>
            <input id="institution" name="institution" defaultValue={profile.institution ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="bio">Short bio</label>
          <textarea id="bio" name="bio" rows={3} required defaultValue={profile.bio ?? ""} className="input" />
        </div>
        <div>
          <p className="label">Publications (optional, if available)</p>
          <PublicationsEditor initial={profile.publications} />
        </div>
        <SchedulePicker name="private_session" label="When you're available for private sessions" initial={profile.private_session_schedule} />
        <SchedulePicker name="public_session" label="When you're available for public / class sessions" initial={profile.public_session_schedule} />
        <button className="btn-primary w-full">Finish and continue</button>
      </form>
    </div>
  );
}
