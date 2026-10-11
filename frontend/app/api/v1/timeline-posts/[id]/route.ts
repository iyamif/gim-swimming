import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (global.__globalTimelinePosts) {
      global.__globalTimelinePosts = global.__globalTimelinePosts.filter(
        (p) => p.id !== id
      );
    }
    return NextResponse.json({
      success: true,
      message: "Postingan berhasil dihapus",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus" },
      { status: 500 }
    );
  }
}
