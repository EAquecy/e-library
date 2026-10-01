import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { updateProfile } from "@/app/actions";
import { AvatarUploader } from "@/components/avatar-uploader";
import { PublicationsEditor } from "@/components/publications-editor";

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const { profile, user } = await requireProfile();
  const isTeaching = profile.role === "lecturer" || profile.role === "publisher";
  const roleLabel = profile.role === "lecturer" ? "Lecturer" : profile.role === "publisher" ? "Publisher" : "Student";
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="eyebrow">{roleLabel} profile</p>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-ink-soft">{user.email}</p>
      </div>
      {searchParams.saved && <p className="rounded bg-forest-light px-3 py-2 text-sm text-forest">Profile saved.</p>}

      {isTeaching && (
        <div className="card space-y-3 p-6">
          <p className="label">Photo</p>
          <AvatarUploader userId={user.id} fullName={profile.full_name} initialPath={profile.avatar_path} />
        </div>
      )}

      <form action={updateProfile} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="full_name">{profile.role === "publisher" ? "Publisher / organization name" : "Full name"}</label>
          <input id="full_name" name="full_name" defaultValue={profile.full_name} required className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.role === "student" && (
            <div>
              <label className="label" htmlFor="student_id">Student ID</label>
              <input id="student_id" name="student_id" defaultValue={profile.student_id ?? ""} className="input" />
            </div>
          )}
          <div className={isTeaching ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor="department">{profile.role === "publisher" ? "Field / discipline" : "Department"}</label>
            <input id="department" name="department" defaultValue={profile.department ?? ""} className="input" />
          </div>
          {isTeaching && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="institution">University / institution (optional)</label>
              <input id="institution" name="institution" defaultValue={profile.institution ?? ""} className="input" />
            </div>
          )}
        </div>
        {isTeaching && (
          <>
            <div>
              <label className="label" htmlFor="bio">Short bio</label>
              <textarea id="bio" name="bio" rows={3} defaultValue={profile.bio ?? ""} className="input" />
            </div>
            <div>
              <p className="label">Publications</p>
              <PublicationsEditor initial={profile.publications} />
            </div>
            <div>
              <label className="label" htmlFor="session_rate">One-on-one rate (GH₵ per 30 minutes)</label>
              <input id="session_rate" name="session_rate" type="number" min={0} step="0.01" defaultValue={profile.session_rate} className="input max-w-40" />
            </div>
            <div>
              <label className="label" htmlFor="private_session_note">When you&apos;re available for private sessions</label>
              <input id="private_session_note" name="private_session_note" defaultValue={profile.private_session_note ?? ""} className="input" placeholder="e.g. Weekday evenings, 6–8pm" />
            </div>
            <div>
              <label className="label" htmlFor="public_session_note">When you&apos;re available for public / class sessions</label>
              <input id="public_session_note" name="public_session_note" defaultValue={profile.public_session_note ?? ""} className="input" placeholder="e.g. Fridays, 2–4pm" />
            </div>
          </>
        )}
        <button className="btn-primary">Save</button>
      </form>

      {isTeaching && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="font-semibold">Availability calendar</p>
            <p className="text-sm text-ink-soft">Flag dates you&apos;re unavailable or hosting something, with a note.</p>
          </div>
          <Link href="/settings/availability" className="btn-ghost">Manage calendar</Link>
        </div>
      )}

      {isTeaching && (
        <p className="text-center text-sm">
          <Link href={`/people/${profile.id}`} className="text-forest hover:underline">View your public profile →</Link>
        </p>
      )}
    </div>
  );
}
