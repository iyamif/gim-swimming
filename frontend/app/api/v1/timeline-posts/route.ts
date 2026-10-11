import { NextResponse } from "next/server";

interface TimelinePostServer {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  category: string;
  createdAt: string;
  likes: number;
  likedBy?: string[];
}

// Global server memory store (persists across requests during server lifecycle)
declare global {
  // eslint-disable-next-line no-var
  var __globalTimelinePosts: TimelinePostServer[] | undefined;
}

if (!global.__globalTimelinePosts) {
  global.__globalTimelinePosts = [
    {
      id: "post-default-1",
      authorName: "GIM Swimming Academy",
      authorRole: "Official Admin",
      caption: "Ujian Kenaikan Tingkatan Renang akan dilaksanakan serentak pada tanggal 14 September 2026 di Kolam Utama A. Mohon pelatih dan orang tua menyiapkan kesiapan siswa.",
      category: "Ujian Renang",
      createdAt: "2 jam lalu",
      likes: 12,
      likedBy: [],
    },
    {
      id: "post-default-2",
      authorName: "Coach Insan",
      authorRole: "Pelatih Renang",
      caption: "Sesi latihan sore ini berjalan lancar! Peningkatan teknik gaya dada anak-anak kelompok Prestasi makin solid. Tetap semangat berlatih! 🏊‍♂️",
      category: "Kegiatan Renang",
      createdAt: "5 jam lalu",
      likes: 8,
      likedBy: [],
    },
  ];
}

export async function GET() {
  const posts = global.__globalTimelinePosts || [];
  return NextResponse.json({
    success: true,
    data: posts,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { authorName, authorRole, authorAvatar, caption, mediaUrl, mediaType, category } = body;

    if (!caption && !mediaUrl) {
      return NextResponse.json(
        { success: false, error: "Caption atau lampiran media wajib diisi" },
        { status: 400 }
      );
    }

    const newPost: TimelinePostServer = {
      id: `post-${Date.now()}`,
      authorName: authorName || "Pengguna",
      authorRole: authorRole || "Anggota Klub",
      authorAvatar: authorAvatar || "",
      caption: caption || "",
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      category: category || "Kegiatan Renang",
      createdAt: "Baru saja",
      likes: 0,
      likedBy: [],
    };

    if (!global.__globalTimelinePosts) {
      global.__globalTimelinePosts = [];
    }
    global.__globalTimelinePosts = [newPost, ...global.__globalTimelinePosts];

    return NextResponse.json(
      {
        success: true,
        message: "Postingan berhasil dibuat",
        data: newPost,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memproses postingan" },
      { status: 500 }
    );
  }
}
