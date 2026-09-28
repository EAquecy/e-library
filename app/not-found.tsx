import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Not found</h1>
      <p className="mb-6 text-ink-soft">This page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link href="/" className="btn-primary">Go home</Link>
    </div>
  );
}
