"use client";
// src/app/dashboard/events/new/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./new-event.module.css";

interface FieldErrors {
  name?: string[];
  description?: string[];
  date?: string[];
}

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    isPublic: false,
  });

  const update =
    (field: "name" | "description" | "date") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
      setServerError("");
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError("");
    setFieldErrors({});

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.issues) {
          setFieldErrors(data.issues);
        } else {
          setServerError(data.error || "Something went wrong");
        }
        return;
      }

      router.push(`/dashboard/events/${data.event.id}`);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link href="/dashboard/events" className={styles.back}>
        ← Back to events
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>Create a new event</h1>
        <p className={styles.subtitle}>
          Once created, you'll get a shareable link and QR code so members can
          join and find their photos.
        </p>

        {serverError && <div className={styles.errorBanner}>{serverError}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Event name</label>
            <input
              className={`${styles.input} ${fieldErrors.name ? styles.inputError : ""}`}
              type="text"
              placeholder="e.g. Sarah & Mike's Wedding, Annual Day 2026"
              value={form.name}
              onChange={update("name")}
              autoFocus
            />
            {fieldErrors.name && <p className={styles.fieldError}>{fieldErrors.name[0]}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <input
              className={`${styles.input} ${fieldErrors.date ? styles.inputError : ""}`}
              type="date"
              value={form.date}
              onChange={update("date")}
            />
            {fieldErrors.date && <p className={styles.fieldError}>{fieldErrors.date[0]}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description (optional)</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              placeholder="A few words about the event"
              value={form.description}
              onChange={update("description")}
              rows={3}
            />
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            />
            <div>
              <span className={styles.checkboxLabel}>Make this event publicly visible</span>
              <p className={styles.checkboxHint}>
                Anyone with the link can view the gallery (members can always join via the link regardless)
              </p>
            </div>
          </label>

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Creating…" : "Create event →"}
          </button>
        </form>
      </div>
    </div>
  );
}
