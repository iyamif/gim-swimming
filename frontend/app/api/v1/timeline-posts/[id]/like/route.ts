import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const username = body.username || "anonymous";

    if (!global.__globalTimelinePosts) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const postIndex = global.__globalTimelinePosts.findIndex((p) => p.id === id);
    if (postIndex === -1) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const post = global.__globalTimelinePosts[postIndex];
    const likedBy = post.likedBy || [];
    const hasLiked = likedBy.includes(username);

    const newLikedBy = hasLiked
      ? likedBy.filter((u) => u !== username)
      : [...likedBy, username];
    const newLikes = hasLiked ? Math.max(0, post.likes - 1) : post.likes + 1;

    const updatedPost = {
      ...post,
      likes: newLikes,
      likedBy: newLikedBy,
    };

    global.__globalTimelinePosts[postIndex] = updatedPost;

    return NextResponse.json({
      success: true,
      data: updatedPost,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyukai postingan" },
      { status: 500 }
    );
  }
}
