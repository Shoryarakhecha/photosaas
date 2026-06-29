"use client";
// src/app/login/page.tsx

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState({
    orgSlug: "",
    email: "",
    password: "",
  });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setServerError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Login failed");
        return;
      }

      router.push(callbackUrl);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>📸</div>
          <span className={styles.logoText}>PhotoSaaS</span>
        </div>

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your workspace</p>

        {serverError && (
          <div className={styles.errorBanner}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Organization ID</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. john-photography"
              value={form.orgSlug}
              onChange={update("orgSlug")}
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
            />
            <p className={styles.hint}>
              The workspace ID you received when signing up
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Password</label>
            </div>
            <input
              className={styles.input}
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={update("password")}
            />
          </div>

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        {/* Demo credentials box */}
        <div className={styles.demoBox}>
          <p className={styles.demoTitle}>🧪 Test credentials (after seeding)</p>
          <p className={styles.demoLine}>Org ID: <code>demo-photography</code></p>
          <p className={styles.demoLine}>Email: <code>owner@demo.com</code></p>
          <p className={styles.demoLine}>Password: <code>demo1234</code></p>
        </div>

        <p className={styles.footer}>
          No workspace yet?{" "}
          <Link href="/signup" className={styles.link}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
