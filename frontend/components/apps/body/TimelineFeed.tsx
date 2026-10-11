import React, { useState, useEffect, useRef } from "react";
import { TimelinePost } from "../types";
import { isImageAvatar, getAvatarImageUrl } from "../../../lib/api";
import {
  Camera,
  Heart,
  Megaphone,
  Send,
  Trash2,
  X,
  CreditCard,
} from "lucide-react";

export const DEFAULT_TIMELINE_POSTS: TimelinePost[] = [
  {
    id: "post-default-1",
    authorName: "GIM Swimming Academy",
    authorRole: "Official Admin",
    caption: "Ujian Kenaikan Tingkatan Renang akan dilaksanakan serentak pada tanggal 14 September 2026 di Kolam Utama A. Mohon pelatih dan orang tua menyiapkan kesiapan siswa.",
    category: "Ujian Renang",
    createdAt: "2 jam lalu",
    likes: 12,
  },
  {
    id: "post-default-2",
    authorName: "Coach Insan",
    authorRole: "Pelatih Renang",
    caption: "Sesi latihan sore ini berjalan lancar! Peningkatan teknik gaya dada anak-anak kelompok Prestasi makin solid. Tetap semangat berlatih! 🏊‍♂️",
    category: "Kegiatan Renang",
    createdAt: "5 jam lalu",
    likes: 8,
  },
];

interface TimelineFeedProps {
  sessionUser?: string;
  sessionRole?: string;
  userAvatar?: string;
  setActiveTab?: (tab: string) => void;
  showAdminShortcuts?: boolean;
  pendingInvoicesCount?: number;
  paidInvoicesTotal?: number;
}

export default function TimelineFeed({
  sessionUser,
  sessionRole,
  userAvatar = "",
  setActiveTab,
  showAdminShortcuts = false,
  pendingInvoicesCount = 0,
  paidInvoicesTotal = 0,
}: TimelineFeedProps) {
  const [timelinePosts, setTimelinePosts] = useState<TimelinePost[]>([]);
  const [postText, setPostText] = useState("");
  const [postCategory, setPostCategory] = useState("Kegiatan Renang");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedRole = (sessionRole || "").toLowerCase().trim();
  const isCoachRole = normalizedRole === "coach" || normalizedRole === "pelatih";
  const isAdminRole = normalizedRole === "admin";
  const isParentRole = normalizedRole === "orang tua" || normalizedRole === "parent" || normalizedRole === "siswa";

  const loadPosts = () => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("gim_timeline_posts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTimelinePosts(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Error reading timeline posts:", e);
    }
    setTimelinePosts(DEFAULT_TIMELINE_POSTS);
  };

  const savePosts = (posts: TimelinePost[]) => {
    setTimelinePosts(posts);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("gim_timeline_posts", JSON.stringify(posts));
        window.dispatchEvent(new Event("gim_timeline_updated"));
      } catch (err) {
        console.warn("Storage quota exceeded for media, kept in state", err);
      }
    }
  };

  useEffect(() => {
    loadPosts();

    const handleSync = () => {
      loadPosts();
    };

    window.addEventListener("gim_timeline_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("gim_timeline_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      alert("Silakan pilih file foto (JPG/PNG) atau video (MP4/WebM).");
      return;
    }

    setMediaType(isVideo ? "video" : "image");

    const reader = new FileReader();
    reader.onload = (evt) => {
      setMediaPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreatePost = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!postText.trim() && !mediaPreview) {
      alert("Silakan tuliskan caption atau lampirkan foto/video kegiatan renang.");
      return;
    }

    let roleLabel = "Anggota Klub";
    if (isAdminRole) {
      roleLabel = "Admin Official";
    } else if (isCoachRole) {
      roleLabel = "Pelatih Renang";
    } else if (isParentRole) {
      roleLabel = "Orang Tua / Siswa";
    }

    const newPost: TimelinePost = {
      id: `post-${Date.now()}`,
      authorName: sessionUser || "Pengguna",
      authorRole: roleLabel,
      authorAvatar: userAvatar,
      caption: postText.trim(),
      mediaUrl: mediaPreview || undefined,
      mediaType: mediaType || undefined,
      category: postCategory,
      createdAt: "Baru saja",
      likes: 0,
      likedBy: [],
    };

    const updated = [newPost, ...timelinePosts];
    savePosts(updated);
    setPostText("");
    handleRemoveMedia();
  };

  const handleToggleLike = (postId: string) => {
    const userKey = sessionUser || "anonymous";
    const updated = timelinePosts.map((p) => {
      if (p.id === postId) {
        const likedBy = p.likedBy || [];
        const hasLiked = likedBy.includes(userKey);
        const newLikedBy = hasLiked ? likedBy.filter((u) => u !== userKey) : [...likedBy, userKey];
        return {
          ...p,
          likes: hasLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
          likedBy: newLikedBy,
        };
      }
      return p;
    });
    savePosts(updated);
  };

  const handleDeletePost = (postId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus postingan ini?")) {
      const updated = timelinePosts.filter((p) => p.id !== postId);
      savePosts(updated);
    }
  };

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "U";
  const isCustomImage = userAvatar ? isImageAvatar(userAvatar) : false;

  return (
    <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">Timeline &amp; Aktivitas</h3>
          <p className="text-[11px] text-slate-400 font-medium">
            Bagikan momen &amp; update kegiatan latihan renang Anda
          </p>
        </div>
        <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
          {timelinePosts.length} Postingan
        </span>
      </div>

      {/* Hidden File Input for Media Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleMediaSelect}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Post Creation Box */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-xs shrink-0 overflow-hidden shadow-xs border border-white mt-0.5">
            {isCustomImage && userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getAvatarImageUrl(userAvatar)}
                alt={sessionUser}
                className="h-full w-full object-cover"
              />
            ) : userAvatar ? (
              <span className="text-sm">{userAvatar}</span>
            ) : (
              <span>{initialLetter}</span>
            )}
          </div>
          <textarea
            rows={2}
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Tuliskan cerita, evaluasi, atau momen kegiatan renang hari ini..."
            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium"
          />
        </div>

        {/* Media Attachment Preview Container */}
        {mediaPreview && (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black/5 max-h-64 flex items-center justify-center">
            {mediaType === "video" ? (
              <video src={mediaPreview} controls className="max-h-60 w-full object-contain rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaPreview} alt="Preview Upload" className="max-h-60 w-full object-contain rounded-xl" />
            )}
            <button
              type="button"
              onClick={handleRemoveMedia}
              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition cursor-pointer shadow-md"
              title="Hapus Lampiran Media"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Post Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
            >
              <Camera size={14} className="text-blue-600" />
              <span>Foto / Video</span>
            </button>

            <select
              value={postCategory}
              onChange={(e) => setPostCategory(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Kegiatan Renang">Kegiatan Renang</option>
              <option value="Latihan & Evaluasi">Latihan &amp; Evaluasi</option>
              <option value="Ujian Renang">Ujian Renang</option>
              <option value="Prestasi & Lomba">Prestasi &amp; Lomba</option>
              <option value="Pengumuman">Pengumuman</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {isAdminRole && setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab("pengumuman")}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="Buka Pusat Pengumuman"
              >
                <Megaphone size={13} />
                <span>Pusat Pengumuman</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCreatePost()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Send size={13} />
              <span>Posting</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feed Posts List */}
      <div className="space-y-4 pt-1">
        {timelinePosts.map((post) => {
          const userKey = sessionUser || "anonymous";
          const isLiked = (post.likedBy || []).includes(userKey);
          const isAuthor =
            post.authorName === sessionUser ||
            isAdminRole;

          return (
            <div
              key={post.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3 hover:border-slate-300 transition"
            >
              {/* Post Author Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-black text-xs shrink-0 overflow-hidden shadow-2xs">
                    {post.authorAvatar && isImageAvatar(post.authorAvatar) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarImageUrl(post.authorAvatar)}
                        alt={post.authorName}
                        className="h-full w-full object-cover"
                      />
                    ) : post.authorAvatar ? (
                      <span className="text-sm">{post.authorAvatar}</span>
                    ) : (
                      <span>{post.authorName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {post.authorName}
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-md">
                        {post.authorRole}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {post.createdAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-100">
                    {post.category}
                  </span>
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="Hapus Postingan"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Post Caption */}
              {post.caption && (
                <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {post.caption}
                </p>
              )}

              {/* Post Media (Image or Video) */}
              {post.mediaUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                  {post.mediaType === "video" ? (
                    <video
                      src={post.mediaUrl}
                      controls
                      className="w-full max-h-80 object-contain bg-black"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.mediaUrl}
                      alt="Foto Kegiatan Renang"
                      className="w-full max-h-80 object-cover"
                    />
                  )}
                </div>
              )}

              {/* Post Interactions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleLike(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isLiked
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                  }`}
                >
                  <Heart
                    size={14}
                    className={isLiked ? "fill-rose-500 text-rose-500" : "text-slate-400"}
                  />
                  <span>{post.likes} Suka</span>
                </button>

                <span className="text-[10px] text-slate-400 font-medium">
                  GIM Swimming Activity Feed
                </span>
              </div>
            </div>
          );
        })}

        {/* Activity & Finance Shortcut Cards for Admin / Coach */}
        {showAdminShortcuts && isCoachRole && (
          <div
            onClick={() => setActiveTab && setActiveTab("gaji_spp")}
            className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100/80 space-y-2 cursor-pointer hover:bg-emerald-100/50 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Update Honor Pelatih Renang
                  </h4>
                  <p className="text-[10px] text-slate-400">Sistem Honor • Bulan Ini</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                Otomatis
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Honor mengajar Anda dihitung secara otomatis berdasarkan kehadiran mengajar dalam setiap sesi latihan. Klik di sini untuk membuka <strong className="text-emerald-700">Slip Gaji &amp; Riwayat Honor</strong>.
            </p>
          </div>
        )}

        {showAdminShortcuts && isAdminRole && (
          <div
            onClick={() => setActiveTab && setActiveTab("gaji_spp")}
            className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2 cursor-pointer hover:bg-slate-100/60 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Update Administrasi SPP
                  </h4>
                  <p className="text-[10px] text-slate-400">Sistem Keuangan • Hari ini</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {pendingInvoicesCount} Pending
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tercatat total penerimaan SPP terverifikasi sebesar{" "}
              <strong className="text-emerald-600">
                Rp {paidInvoicesTotal.toLocaleString("id-ID")}
              </strong>
              . {pendingInvoicesCount} pembayaran baru menunggu konfirmasi admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
