"use client";
// src/app/dashboard/events/[id]/EventDetailClient.tsx

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./event-detail.module.css";

interface Member {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  joinedVia: string;
  createdAt: Date;
}

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  embeddings?: unknown | null;
}

interface EventData {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  isPublic: boolean;
  allowMemberUploads: boolean; 
  inviteCode: string;
  createdBy: { name: string };
  members: Member[];
  photos: Photo[];
}

interface Props {
  event: EventData;
  canManage: boolean;
}

export default function EventDetailClient({ event, canManage }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(event.members);
  const [photos, setPhotos] = useState(event.photos);
  const [inviteCode, setInviteCode] = useState(event.inviteCode);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [allowUploads, setAllowUploads] = useState(event.allowMemberUploads);
  const [togglingUploads, setTogglingUploads] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [rescanStatus, setRescanStatus] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const [joinUrl, setJoinUrl] = useState(`/join/${inviteCode}`);

    useEffect(() => {
      setJoinUrl(`${window.location.origin}/join/${inviteCode}`);
    }, [inviteCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm("This will invalidate the current link/QR code. Continue?")) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/events/${event.id}/regenerate-invite`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setInviteCode(data.inviteCode);
    } finally {
      setRegenerating(false);
    }
  };
  const handleToggleUploads = async () => {
    setTogglingUploads(true);
    const next = !allowUploads;
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowMemberUploads: next }),
      });
      if (res.ok) setAllowUploads(next);
    } finally {
      setTogglingUploads(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch(`/api/events/${event.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error || "Failed to add member");
        return;
      }

      setMembers((m) => [data.member, ...m]);
      setAddForm({ name: "", email: "", phone: "" });
      setShowAddForm(false);
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // QR code via a simple, free, no-API-key service — good enough for an MVP.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadError("");
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    // Upload in batches of 20 (the API's per-request limit)
    const BATCH_SIZE = 20;
    const allUploaded: Photo[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const formData = new FormData();
      batch.forEach((file) => formData.append("files", file));

      try {
        const res = await fetch(`/api/events/${event.id}/photos`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.uploaded?.length) {
          allUploaded.push(...data.uploaded);
        }
        if (data.failed?.length) {
          setUploadError(
            `${data.failed.length} file(s) failed: ${data.failed.map((f: any) => f.name).join(", ")}`
          );
        }
      } catch {
        setUploadError("Network error during upload. Some photos may not have uploaded.");
      }

      setUploadProgress((p) => ({ ...p, done: Math.min(p.done + batch.length, p.total) }));
    }

    if (allUploaded.length > 0) {
      setPhotos((prev) => [...prev, ...allUploaded]);
    }

    setUploading(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = ""; // allow re-selecting the same file later
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    setDeletingId(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);
      }
    } finally {
      setDeletingId(null);
    }
  };
  

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member? They'll be able to rejoin with the same email.")) return;
    setRemovingMemberId(memberId);
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } finally {
      setRemovingMemberId(null);
    }
  };

  // ── Live updates: poll every 5s for new members/photos (e.g. self-joins,
  // uploads from another staff member) without requiring a manual refresh.
  // Paused while a local upload is in progress so it can't clobber the
  // in-flight optimistic state from handleFiles.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (uploading || deletingId) return;
      try {
        const res = await fetch(`/api/events/${event.id}/live`);
        if (!res.ok) return;
        const data = await res.json();
        setMembers(data.members);
        setPhotos(data.photos);
      } catch {
        // Silent failure — next poll will retry. Not worth surfacing a
        // visible error for a background refresh.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [event.id, uploading, deletingId]);
  const missingEmbeddingsCount = photos.filter((p: any) => !p.embeddings).length;

    const handleRescan = async () => {
      setRescanning(true);
      setRescanStatus("Scanning…");

      try {
        let remaining = 1;
        let succeededTotal = 0;

        while (remaining > 0) {
          const res = await fetch(`/api/events/${event.id}/photos/rescan`, { method: "POST" });
          const data = await res.json();

          if (!res.ok) {
            setRescanStatus(data.error || "Rescan failed.");
            break;
          }

          succeededTotal += data.succeeded;
          remaining = data.remaining;
          setRescanStatus(`Processed ${succeededTotal} photo(s)… ${remaining} remaining`);

          if (data.processed === 0) break; // nothing left to do
        }

        // Refresh the photo list so embeddings status is up to date
        const listRes = await fetch(`/api/events/${event.id}/photos`);
        const listData = await listRes.json();
        if (listData.photos) setPhotos(listData.photos);

        setRescanStatus("Done.");
      } catch {
        setRescanStatus("Network error during rescan.");
      } finally {
        setRescanning(false);
        setTimeout(() => setRescanStatus(""), 4000);
      }
    };
  return (
    <div className={styles.page}>
      <Link href="/dashboard/events" className={styles.back}>
        ← Back to events
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{event.name}</h1>
          <p className={styles.meta}>
            {new Date(event.date).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
            {" · "}created by {event.createdBy.name}
            {event.isPublic && <span className={styles.publicBadge}>Public</span>}
          </p>
          {event.description && <p className={styles.description}>{event.description}</p>}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Invite section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Invite members</h2>
          <p className={styles.cardSubtitle}>
            Share this link or QR code — anyone who opens it can join the event themselves.
          </p>

          <div className={styles.qrWrap}>
            <img src={qrUrl} alt="Event invite QR code" className={styles.qrImage} />
          </div>

          <div className={styles.linkRow}>
            <input className={styles.linkInput} value={joinUrl} readOnly />
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

{canManage && (
            <button
              className={styles.regenerateBtn}
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? "Regenerating…" : "🔄 Regenerate link"}
            </button>
          )}

          {canManage && (
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={allowUploads}
                onChange={handleToggleUploads}
                disabled={togglingUploads}
              />
              <span>Let guests upload their own photos</span>
            </label>
          )}
        </div>

        {/* Members section */}
        <div className={styles.card}>
          <div className={styles.membersHeader}>
            <div>
              <h2 className={styles.cardTitle}>Members</h2>
              <p className={styles.cardSubtitle}>
                {members.length} joined <span className={styles.liveDot}>● live</span>
              </p>
            </div>
            {canManage && (
              <button className={styles.addBtn} onClick={() => setShowAddForm((s) => !s)}>
                {showAddForm ? "Cancel" : "+ Add manually"}
              </button>
            )}
          </div>

          {showAddForm && (
            <form onSubmit={handleAddMember} className={styles.addForm}>
              {addError && <div className={styles.addError}>{addError}</div>}
              <input
                className={styles.addInput}
                placeholder="Name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                className={styles.addInput}
                placeholder="Email (optional)"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                className={styles.addInput}
                placeholder="Phone (optional)"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <button type="submit" className={styles.addSubmitBtn} disabled={addLoading}>
                {addLoading ? "Adding…" : "Add member"}
              </button>
            </form>
          )}

          <div className={styles.membersList}>
            {members.length === 0 ? (
              <p className={styles.noMembers}>No members yet. Share the invite link above.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className={styles.memberRow}>
                  <div className={styles.memberAvatar}>{m.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.memberInfo}>
                    <p className={styles.memberName}>{m.name}</p>
                    <p className={styles.memberContact}>
                      {m.email || m.phone || "No contact info"}
                    </p>
                  </div>
                  <span className={styles.joinBadge}>
                    {m.joinedVia === "SELF_JOIN" ? "🔗 self-joined" : "✋ added manually"}
                  </span>
                  {canManage && (
                    <button
                      className={styles.memberDeleteBtn}
                      onClick={() => handleRemoveMember(m.id)}
                      disabled={removingMemberId === m.id}
                      title="Remove member"
                    >
                      {removingMemberId === m.id ? "…" : "✕"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Photos section */}
      <div className={styles.photosCard}>
        <div className={styles.membersHeader}>
          <div>
            <h2 className={styles.cardTitle}>Photos</h2>
            <p className={styles.cardSubtitle}>
              {photos.length} uploaded <span className={styles.liveDot}>● live</span>
            </p>
          </div>
          {canManage && missingEmbeddingsCount > 0 && (
            <button
              className={styles.addBtn}
              onClick={handleRescan}
              disabled={rescanning}
            >
              {rescanning
                ? rescanStatus || "Scanning…"
                : `🔍 Re-scan ${missingEmbeddingsCount} photo(s) for faces`}
            </button>
          )}
        </div>
        {rescanStatus && !rescanning && (
          <p className={styles.cardSubtitle}>{rescanStatus}</p>
        )}

        {canManage && (
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              hidden
              onChange={handleFileInputChange}
            />
            {uploading ? (
              <div className={styles.uploadProgress}>
                <div className={styles.spinner} />
                <p className={styles.dropzoneText}>
                  Uploading {uploadProgress.done} / {uploadProgress.total}…
                </p>
              </div>
            ) : (
              <>
                <p className={styles.dropzoneIcon}>📤</p>
                <p className={styles.dropzoneText}>
                  Drag photos here, or click to browse
                </p>
                <p className={styles.dropzoneHint}>JPG, PNG, WEBP, HEIC — up to 15MB each</p>
              </>
            )}
          </div>
        )}

        {uploadError && <div className={styles.addError}>{uploadError}</div>}

        {photos.length === 0 ? (
          <p className={styles.noMembers}>
            {canManage ? "No photos yet. Upload some above." : "No photos uploaded yet."}
          </p>
        ) : (
          <div className={styles.photoGrid}>
            {photos.map((photo) => (
              <div key={photo.id} className={styles.photoThumb}>
                <img
                  src={photo.thumbnailUrl}
                  alt=""
                  onClick={() => setLightboxPhoto(photo)}
                  loading="lazy"
                />
                {canManage && (
                  <button
                    className={styles.photoDeleteBtn}
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    disabled={deletingId === photo.id}
                    title="Delete photo"
                  >
                    {deletingId === photo.id ? "…" : "✕"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxPhoto(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxPhoto(null)}>
            ✕
          </button>
          <img
            src={lightboxPhoto.url}
            alt=""
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={lightboxPhoto.url}
            download
            className={styles.lightboxDownload}
            onClick={(e) => e.stopPropagation()}
          >
            ⬇ Download full size
          </a>
        </div>
      )}
    </div>
  );
}
