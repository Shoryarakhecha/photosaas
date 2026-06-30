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

  // "details" → "otp" → "joined"
  const [step, setStep] = useState<"details" | "otp" | "joined">("details");

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
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

  // Cooldown ticker for the "resend code" button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/join/${inviteCode}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to send code");
        return;
      }

      setStep("otp");
      setResendCooldown(30);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setSubmitError("");
    try {
      const res = await fetch(`/api/join/${inviteCode}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to resend code");
        return;
      }
      setResendCooldown(30);
    } catch {
      setSubmitError("Network error. Please try again.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      // Step 1: verify the code
      const verifyRes = await fetch(`/api/join/${inviteCode}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: otpCode }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setSubmitError(verifyData.error || "Verification failed");
        return;
      }

      // Step 2: now that email is verified, actually create the Member
      const joinRes = await fetch(`/api/join/${inviteCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const joinData = await joinRes.json();

      if (!joinRes.ok) {
        setSubmitError(joinData.error || "Failed to join the event");
        return;
      }

      setStep("joined");
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

  if (step === "joined") {
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

  if (step === "otp") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>📧</div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We sent a 6-digit code to <strong>{form.email}</strong>
          </p>

          <div className={styles.divider} />

          {submitError && <div className={styles.errorBanner}>{submitError}</div>}

          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <input
              className={styles.otpInput}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoFocus
              required
            />
            <button
              type="submit"
              className={styles.btn}
              disabled={submitting || otpCode.length !== 6}
            >
              {submitting ? "Verifying…" : "Verify & join →"}
            </button>
          </form>

          <button
            className={styles.resendBtn}
            onClick={handleResendOtp}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>

          <button className={styles.backBtn} onClick={() => setStep("details")}>
            ← Use a different email
          </button>
        </div>
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

        <form onSubmit={handleRequestOtp} className={styles.form}>
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
            placeholder="Email — we'll send a verification code"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            className={styles.input}
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <button type="submit" className={styles.btn} disabled={submitting}>
            {submitting ? "Sending code…" : "Send verification code →"}
          </button>
        </form>
      </div>
    </div>
  );
}
