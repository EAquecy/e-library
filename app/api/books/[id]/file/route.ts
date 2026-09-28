import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Streams a title's PDF only to its lecturer or a student with an active purchase/rental.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: allowed } = await supabase.rpc("has_book_access", { p_book: params.id });
  if (!allowed) return NextResponse.json({ error: "Your access to this title has ended or was never granted" }, { status: 403 });

  const { data: book } = await supabase.from("books").select("file_path").eq("id", params.id).single();
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: file, error } = await supabase.storage.from("books").download(book.file_path);
  if (error || !file) return NextResponse.json({ error: "File unavailable" }, { status: 500 });

  return new NextResponse(file.stream(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
