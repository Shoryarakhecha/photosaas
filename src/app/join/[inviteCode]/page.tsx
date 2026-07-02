// "use client";
// // src/app/join/[inviteCode]/page.tsx
// // Public page — no login required. Anyone with the link/QR lands here.

// import { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import styles from "./join.module.css";

// interface EventInfo {
//   id: string;
//   name: string;
//   description: string | null;
//   date: string;
//   tenant: { name: string };
// }

// interface Photo {
//   id: string;
//   url: string;
//   thumbnailUrl: string;
// }

// interface MatchedPhoto extends Photo {
//   score?: number;
// }

// export default function JoinPage() {
//   const params = useParams();
//   const inviteCode = params.inviteCode as string;

//   const [event, setEvent] = useState<EventInfo | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [notFound, setNotFound] = useState(false);

//   // "details" → "otp" → "joined"
//   const [step, setStep] = useState<"details" | "otp" | "joined">("details");

//   const [form, setForm] = useState({ name: "", email: "", phone: "" });
//   const [otpCode, setOtpCode] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [submitError, setSubmitError] = useState("");
//   const [resendCooldown, setResendCooldown] = useState(0);
//   const [photos, setPhotos] = useState<Photo[]>([]);
//   const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

//   // ── Selfie search state ──
//   const [searching, setSearching] = useState(false);
//   const [searchError, setSearchError] = useState("");
//   const [matches, setMatches] = useState<MatchedPhoto[] | null>(null);

//   useEffect(() => {
//     fetch(`/api/join/${inviteCode}`)
//       .then(async (res) => {
//         if (!res.ok) {
//           setNotFound(true);
//           return;
//         }
//         const data = await res.json();
//         setEvent(data.event);
//       })
//       .finally(() => setLoading(false));
//   }, [inviteCode]);

//   // Cooldown ticker for the "resend code" button
//   useEffect(() => {
//     if (resendCooldown <= 0) return;
//     const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
//     return () => clearTimeout(t);
//   }, [resendCooldown]);

//   const handleRequestOtp = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setSubmitting(true);
//     setSubmitError("");

//     try {
//       const res = await fetch(`/api/join/${inviteCode}/send-otp`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: form.email }),
//       });
//       const data = await res.json();

//       if (!res.ok) {
//         setSubmitError(data.error || "Failed to send code");
//         return;
//       }

//       setStep("otp");
//       setResendCooldown(30);
//     } catch {
//       setSubmitError("Network error. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleResendOtp = async () => {
//     if (resendCooldown > 0) return;
//     setSubmitError("");
//     try {
//       const res = await fetch(`/api/join/${inviteCode}/send-otp`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: form.email }),
//       });
//       const data = await res.json();
//       if (!res.ok) {
//         setSubmitError(data.error || "Failed to resend code");
//         return;
//       }
//       setResendCooldown(30);
//     } catch {
//       setSubmitError("Network error. Please try again.");
//     }
//   };

//   const handleVerifyOtp = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setSubmitting(true);
//     setSubmitError("");

//     try {
//       // Step 1: verify the code
//       const verifyRes = await fetch(`/api/join/${inviteCode}/verify-otp`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: form.email, code: otpCode }),
//       });
//       const verifyData = await verifyRes.json();

//       if (!verifyRes.ok) {
//         setSubmitError(verifyData.error || "Verification failed");
//         return;
//       }

//       // Step 2: now that email is verified, actually create the Member
//       const joinRes = await fetch(`/api/join/${inviteCode}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(form),
//       });
//       const joinData = await joinRes.json();

//       if (!joinRes.ok) {
//         setSubmitError(joinData.error || "Failed to join the event");
//         return;
//       }

//       setStep("joined");
//       fetchPhotos();
//     } catch {
//       setSubmitError("Network error. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const fetchPhotos = () => {
//     fetch(`/api/join/${inviteCode}/photos`)
//       .then((res) => res.json())
//       .then((data) => setPhotos(data.photos || []))
//       .catch(() => {});
//   };

//   const handleSelfieChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setSearching(true);
//     setSearchError("");
//     setMatches(null);

//     try {
//       const fd = new FormData();
//       fd.append("selfie", file);

//       const res = await fetch(`/api/join/${inviteCode}/search`, {
//         method: "POST",
//         body: fd,
//       });
//       const data = await res.json();

//       if (!res.ok) {
//         setSearchError(data.error || "Search failed. Please try again.");
//         return;
//       }

//       setMatches(data.matches);
//     } catch {
//       setSearchError("Network error. Please try again.");
//     } finally {
//       setSearching(false);
//       e.target.value = ""; // allow re-selecting the same file
//     }
//   };

//   if (loading) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.card}>
//           <p className={styles.loadingText}>Loading event…</p>
//         </div>
//       </div>
//     );
//   }

//   if (notFound || !event) {
//     return (
//       <div className={styles.page}>
//         <div className={styles.card}>
//           <div className={styles.icon}>⚠️</div>
//           <h1 className={styles.title}>Link not valid</h1>
//           <p className={styles.subtitle}>
//             This invite link has expired or doesn't exist anymore. Please ask
//             the event organizer for a new link.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (step === "joined") {
//     const displayedPhotos = matches !== null ? matches : photos;

//     return (
//       <div className={styles.page}>
//         <div className={styles.galleryWrap}>
//           <div className={styles.galleryHeader}>
//             <div className={styles.icon}>✅</div>
//             <h1 className={styles.title}>You're in!</h1>
//             <p className={styles.subtitle}>
//               You've joined <strong>{event.name}</strong>.
//             </p>
//           </div>

//           <div className={styles.selfieSearchBox}>
//             {matches === null ? (
//               <>
//                 <h2 className={styles.selfieTitle}>Find your photos</h2>
//                 <p className={styles.selfieHint}>
//                   Upload a selfie and we'll find every photo you're in. The
//                   first search can take up to a minute while the recognition
//                   engine warms up.
//                 </p>
//                 {searchError && (
//                   <div className={styles.errorBanner}>{searchError}</div>
//                 )}
//                 <label className={`${styles.btn} ${styles.selfieUploadLabel}`}>
//                   {searching ? "Searching… this may take a minute" : "📷 Upload a selfie"}
//                   <input
//                     type="file"
//                     accept="image/*"
//                     capture="user"
//                     onChange={handleSelfieChange}
//                     disabled={searching}
//                     style={{ display: "none" }}
//                   />
//                 </label>
//               </>
//             ) : (
//               <>
//                 <h2 className={styles.selfieTitle}>
//                   {matches.length > 0
//                     ? `Found ${matches.length} photo${matches.length > 1 ? "s" : ""} of you`
//                     : "No matches found"}
//                 </h2>
//                 {matches.length === 0 && (
//                   <p className={styles.selfieHint}>
//                     Try a clearer, front-facing selfie, or check back later —
//                     more photos may still be processing.
//                   </p>
//                 )}
//                 <button
//                   className={styles.backBtn}
//                   onClick={() => {
//                     setMatches(null);
//                     setSearchError("");
//                   }}
//                 >
//                   ← Try another selfie / see all photos
//                 </button>
//               </>
//             )}
//           </div>

//           {displayedPhotos.length > 0 ? (
//             <div className={styles.photoGrid}>
//               {displayedPhotos.map((photo) => (
//                 <div
//                   key={photo.id}
//                   className={styles.photoThumb}
//                   onClick={() => setLightboxPhoto(photo)}
//                 >
//                   <img src={photo.thumbnailUrl} alt="" loading="lazy" />
//                 </div>
//               ))}
//             </div>
//           ) : (
//             matches === null && (
//               <p className={styles.subtitle}>
//                 Photos will appear here once the organizer uploads them — check back soon.
//               </p>
//             )
//           )}
//         </div>

//         {lightboxPhoto && (
//           <div className={styles.lightboxOverlay} onClick={() => setLightboxPhoto(null)}>
//             <button className={styles.lightboxClose} onClick={() => setLightboxPhoto(null)}>
//               ✕
//             </button>
//             <img
//               src={lightboxPhoto.url}
//               alt=""
//               className={styles.lightboxImage}
//               onClick={(e) => e.stopPropagation()}
//             />
//             <a
//               href={lightboxPhoto.url}
//               download
//               className={styles.lightboxDownload}
//               onClick={(e) => e.stopPropagation()}
//             >
//               ⬇ Download full size
//             </a>
//           </div>
//         )}
//       </div>
//     );
//   }

//   if (step === "otp") {
//     return (
//       <div className={styles.page}>
//         <div className={styles.card}>
//           <div className={styles.icon}>📧</div>
//           <h1 className={styles.title}>Check your email</h1>
//           <p className={styles.subtitle}>
//             We sent a 6-digit code to <strong>{form.email}</strong>
//           </p>

//           <div className={styles.divider} />

//           {submitError && <div className={styles.errorBanner}>{submitError}</div>}

//           <form onSubmit={handleVerifyOtp} className={styles.form}>
//             <input
//               className={styles.otpInput}
//               placeholder="000000"
//               value={otpCode}
//               onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
//               inputMode="numeric"
//               maxLength={6}
//               autoFocus
//               required
//             />
//             <button
//               type="submit"
//               className={styles.btn}
//               disabled={submitting || otpCode.length !== 6}
//             >
//               {submitting ? "Verifying…" : "Verify & join →"}
//             </button>
//           </form>

//           <button
//             className={styles.resendBtn}
//             onClick={handleResendOtp}
//             disabled={resendCooldown > 0}
//           >
//             {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
//           </button>

//           <button className={styles.backBtn} onClick={() => setStep("details")}>
//             ← Use a different email
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.page}>
//       <div className={styles.card}>
//         <p className={styles.tenantName}>{event.tenant.name}</p>
//         <h1 className={styles.title}>{event.name}</h1>
//         <p className={styles.eventDate}>
//           {new Date(event.date).toLocaleDateString("en-IN", {
//             day: "numeric", month: "long", year: "numeric",
//           })}
//         </p>
//         {event.description && <p className={styles.eventDesc}>{event.description}</p>}

//         <div className={styles.divider} />

//         <p className={styles.formIntro}>Enter your details to join this event</p>

//         {submitError && <div className={styles.errorBanner}>{submitError}</div>}

//         <form onSubmit={handleRequestOtp} className={styles.form}>
//           <input
//             className={styles.input}
//             placeholder="Your name"
//             value={form.name}
//             onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
//             required
//             autoFocus
//           />
//           <input
//             className={styles.input}
//             type="email"
//             placeholder="Email — we'll send a verification code"
//             value={form.email}
//             onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
//             required
//           />
//           <input
//             className={styles.input}
//             placeholder="Phone (optional)"
//             value={form.phone}
//             onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
//           />
//           <button type="submit" className={styles.btn} disabled={submitting}>
//             {submitting ? "Sending code…" : "Send verification code →"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }





"use client";
// src/app/join/[inviteCode]/page.tsx
// Public page — no login required. Anyone with the link/QR lands here.

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import styles from "./join.module.css";


interface EventInfo {
  id: string;
  name: string;
  description: string | null;
  date: string;
  allowMemberUploads: boolean; 
  tenant: { name: string };
}

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
}

interface MatchedPhoto extends Photo {
  score?: number;
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

  // ── Selfie search state ──
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [matches, setMatches] = useState<MatchedPhoto[] | null>(null);
  const [warmupHint, setWarmupHint] = useState(false);
  const [cachedEmbedding, setCachedEmbedding] = useState<number[] | null>(null);
  // add member to upload photos
  const [memberId, setMemberId] = useState<string | null>(null);
  const [guestUploading, setGuestUploading] = useState(false);
  const [guestUploadError, setGuestUploadError] = useState("");
  const guestFileInputRef = useRef<HTMLInputElement>(null);

  const [guestUploadCount, setGuestUploadCount] = useState<number | null>(null);
  const GUEST_UPLOAD_LIMIT = 10;

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

      const newMemberId = joinData.member?.id || null;
      if (newMemberId) setMemberId(newMemberId);
      setStep("joined");
      fetchPhotos(newMemberId || undefined);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchPhotos = (forMemberId?: string) => {
    const url = forMemberId
      ? `/api/join/${inviteCode}/photos?memberId=${forMemberId}`
      : `/api/join/${inviteCode}/photos`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setPhotos(data.photos || []);
        if (data.guestUpload) setGuestUploadCount(data.guestUpload.count);
      })
      .catch(() => {});
  };

  const handleSelfieChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSearching(true);
    setSearchError("");
    setMatches(null);
    setWarmupHint(false);

    // If the search is still running after 6s, it's likely the face
    // service was asleep — tell the guest so they don't think it's broken.
    const warmupTimer = setTimeout(() => setWarmupHint(true), 6000);

    try {
      const fd = new FormData();
      fd.append("selfie", file);

      const res = await fetch(`/api/join/${inviteCode}/search`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "Search failed. Please try again.");
        return;
      }

      setMatches(data.matches);
      if (data.embedding) setCachedEmbedding(data.embedding);
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      clearTimeout(warmupTimer);
      setWarmupHint(false);
      setSearching(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  };

  const handleGuestFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0 || !memberId) return;

    setGuestUploadError("");
    setGuestUploading(true);

    try {
      const fd = new FormData();
      fd.append("memberId", memberId);
      files.forEach((file) => fd.append("files", file));

      const res = await fetch(`/api/join/${inviteCode}/photos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setGuestUploadError(data.error || "Upload failed.");
        if (data.guestUpload) setGuestUploadCount(data.guestUpload.count);
        return;
      }

      if (data.uploaded?.length) {
        setPhotos((prev) => [...prev, ...data.uploaded]);
      }
      if (data.guestUpload) {
        setGuestUploadCount(data.guestUpload.count);
      }
      if (data.failed?.length) {
        setGuestUploadError(
          data.failed.length === files.length
            ? data.failed[0].reason
            : `${data.failed.length} photo(s) failed to upload.`
        );
      }
    } catch {
      setGuestUploadError("Network error during upload.");
    } finally {
      setGuestUploading(false);
    }
  };

  const handleGuestFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleGuestFiles(e.target.files);
    e.target.value = "";
  };

  // Re-runs the search using the already-extracted face embedding — no new
  // selfie needed. Useful for guests checking back after more photos are
  // uploaded, without re-uploading a selfie or waiting on face extraction again.
  const handleRefreshMatches = async () => {
    if (!cachedEmbedding) return;
    setSearching(true);
    setSearchError("");

    try {
      const res = await fetch(`/api/join/${inviteCode}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding: cachedEmbedding }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "Search failed. Please try again.");
        return;
      }

      setMatches(data.matches);
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setSearching(false);
    }
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
    const displayedPhotos = matches !== null ? matches : photos;

    return (
      <div className={styles.page}>
        <div className={styles.galleryWrap}>
          <div className={styles.galleryHeader}>
            <div className={styles.icon}>✅</div>
            <h1 className={styles.title}>You're in!</h1>
            <p className={styles.subtitle}>
              You've joined <strong>{event.name}</strong>.
            </p>
          </div>

          <div className={styles.selfieSearchBox}>
            {matches === null ? (
              <>
                <h2 className={styles.selfieTitle}>Find your photos</h2>
                <p className={styles.selfieHint}>
                  Upload a selfie and we'll find every photo you're in. The
                  first search can take up to a minute while the recognition
                  engine warms up.
                </p>
                {searchError && (
                  <div className={styles.errorBanner}>{searchError}</div>
                )}
                <label className={`${styles.btn} ${styles.selfieUploadLabel}`}>
                  {searching
                    ? warmupHint
                      ? "Still working… recognition engine is warming up"
                      : "Searching…"
                    : "📷 Upload a selfie"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleSelfieChange}
                    disabled={searching}
                    style={{ display: "none" }}
                  />
                </label>
              </>
            ) : (
              <>
                <h2 className={styles.selfieTitle}>
                  {matches.length > 0
                    ? `Found ${matches.length} photo${matches.length > 1 ? "s" : ""} of you`
                    : "No matches found"}
                </h2>
                {matches.length === 0 && (
                  <p className={styles.selfieHint}>
                    Try a clearer, front-facing selfie, or check back later —
                    more photos may still be processing.
                  </p>
                )}
                {searchError && (
                  <div className={styles.errorBanner}>{searchError}</div>
                )}
                <div className={styles.matchActions}>
                  {cachedEmbedding && (
                    <button
                      className={styles.backBtn}
                      onClick={handleRefreshMatches}
                      disabled={searching}
                    >
                      {searching ? "Checking…" : "🔄 Check for new photos"}
                    </button>
                  )}
                  <button
                    className={styles.backBtn}
                    onClick={() => {
                      setMatches(null);
                      setSearchError("");
                    }}
                  >
                    ← Try another selfie / see all photos
                  </button>
                </div>
              </>
            )}
          </div>

          {event.allowMemberUploads && memberId && (
            <div className={styles.selfieSearchBox}>
              <h2 className={styles.selfieTitle}>Add your own photos</h2>
              <p className={styles.selfieHint}>
                Got great shots from the day? Upload them here — everyone at
                this event will be able to see them.
                {guestUploadCount !== null && (
                  <> You've uploaded {guestUploadCount} of {GUEST_UPLOAD_LIMIT}.</>
                )}
              </p>
              {guestUploadError && (
                <div className={styles.errorBanner}>{guestUploadError}</div>
              )}
              {guestUploadCount !== null && guestUploadCount >= GUEST_UPLOAD_LIMIT ? (
                <p className={styles.selfieHint}>
                  You've reached the upload limit for this event.
                </p>
              ) : (
                <label className={`${styles.btn} ${styles.selfieUploadLabel}`}>
                  {guestUploading ? "Uploading…" : "📤 Upload photos"}
                  <input
                    ref={guestFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    onChange={handleGuestFileInputChange}
                    disabled={guestUploading}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>
          )}

          {displayedPhotos.length > 0 ? (
            <div className={styles.photoGrid}>
              {displayedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={styles.photoThumb}
                  onClick={() => setLightboxPhoto(photo)}
                >
                  <img src={photo.thumbnailUrl} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          ) : (
            matches === null && (
              <p className={styles.subtitle}>
                Photos will appear here once the organizer uploads them — check back soon.
              </p>
            )
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