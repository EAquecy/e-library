import { requireProfile } from "@/lib/session";
import { updateProfile } from "@/app/actions";

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const { profile, user } = await requireProfile();
  const isLecturer = profile.role === "lecturer";
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="eyebrow">{isLecturer ? "Lecturer" : "Student"} profile</p>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-ink-soft">{user.email}</p>
      </div>
      {searchParams.saved && <p className="rounded bg-forest-light px-3 py-2 text-sm text-forest">Profile saved.</p>}
      <form action={updateProfile} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" defaultValue={profile.full_name} required className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {!isLecturer && (
            <div>
              <label className="label" htmlFor="student_id">Student ID</label>
              <input id="student_id" name="student_id" defaultValue={profile.student_id ?? ""} className="input" />
            </div>
          )}
          <div className={isLecturer ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor="department">Department</label>
            <input id="department" name="department" defaultValue={profile.department ?? ""} className="input" />
          </div>
        </div>
        {isLecturer && (
          <>
            <div>
              <label className="label" htmlFor="session_rate">One-on-one rate (GH₵ per 30 minutes)</label>
              <input id="session_rate" name="session_rate" type="number" min={0} step="0.01" defaultValue={profile.session_rate} className="input max-w-40" />
            </div>
            <div>
              <label className="label" htmlFor="bio">Short bio</label>
              <textarea id="bio" name="bio" rows={3} defaultValue={profile.bio ?? ""} className="input" />
            </div>
          </>
        )}
        <button className="btn-primary">Save</button>
      </form>
    </div>
  );
}
