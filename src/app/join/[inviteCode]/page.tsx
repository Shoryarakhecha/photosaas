"use client";
// src/app/join/[inviteCode]/page.tsx
// Public page — no login required. Anyone with the link/QR lands here.

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import styles from "./join.module.css";

interface EventInfo {
  id: string;
  name: string;
  description: string | null;
  date: string;
  tenant: { name: string };
}

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
}

export default function JoinPage() {
  const params = useParams();
  const inviteCode = params.inviteCode as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [joined, setJoined] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetch(`/api/join/${inviteCode}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setEvent(data.event);
      })
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/join/${inviteCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to join");
        return;
      }

      setJoined(true);
      fetchPhotos();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchPhotos = () => {
    fetch(`/api/join/${inviteCode}/photos`)
      .then((res) => res.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.loadingText}>Loading event…</p>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>⚠️</div>
          <h1 className={styles.title}>Link not valid</h1>
          <p className={styles.subtitle}>
            This invite link has expired or doesn't exist anymore. Please ask
            the event organizer for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className={styles.page}>
        <div className={styles.galleryWrap}>
          <div className={styles.galleryHeader}>
            <div className={styles.icon}>✅</div>
            <h1 className={styles.title}>You're in!</h1>
            <p className={styles.subtitle}>
              You've joined <strong>{event.name}</strong>.{" "}
              {photos.length > 0
                ? "Tap any photo to view full size or download."
                : "Photos will appear here once the organizer uploads them — check back soon."}
            </p>
          </div>

          {photos.length > 0 && (
            <div className={styles.photoGrid}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={styles.photoThumb}
                  onClick={() => setLightboxPhoto(photo)}
                >
                  <img src={photo.thumbnailUrl} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>

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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.tenantName}>{event.tenant.name}</p>
        <h1 className={styles.title}>{event.name}</h1>
        <p className={styles.eventDate}>
          {new Date(event.date).toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
        {event.description && <p className={styles.eventDesc}>{event.description}</p>}

        <div className={styles.divider} />

        <p className={styles.formIntro}>Enter your details to join this event</p>

        {submitError && <div className={styles.errorBanner}>{submitError}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Email (recommended — for photo notifications)"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className={styles.input}
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <button type="submit" className={styles.btn} disabled={submitting}>
            {submitting ? "Joining…" : "Join event →"}
          </button>
        </form>
      </div>
    </div>
  );
}
