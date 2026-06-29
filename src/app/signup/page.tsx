"use client";
// src/app/signup/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./signup.module.css";

interface FormData {
  orgName: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  orgName?: string[];
  name?: string[];
  email?: string[];
  password?: string[];
  confirmPassword?: string[];
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [form, setForm] = useState<FormData>({
    orgName: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
    setServerError("");
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orgName.trim() || form.orgName.length < 2) {
      setFieldErrors({ orgName: ["Organization name must be at least 2 characters"] });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError("");
    setFieldErrors({});

    try {
      const res = await fetch("/api/auth/signup", {
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

      // Success → go to dashboard
      router.push("/dashboard");
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const slugPreview = form.orgName
    ? form.orgName.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").slice(0, 30)
    : "";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>📸</div>
          <span className={styles.logoText}>PhotoSaaS</span>
        </div>

        <h1 className={styles.title}>
          {step === 1 ? "Create your workspace" : "Set up your account"}
        </h1>
        <p className={styles.subtitle}>
          {step === 1
            ? "Your organization gets its own isolated workspace"
            : "You'll be the owner of this workspace"}
        </p>

        {/* Step indicator */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${step >= 1 ? styles.stepActive : ""}`}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepLabel}>Organization</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step >= 2 ? styles.stepActive : ""}`}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepLabel}>Your account</span>
          </div>
        </div>

        {serverError && (
          <div className={styles.errorBanner}>{serverError}</div>
        )}

        {/* ── Step 1: Organization ── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Organization / Business name</label>
              <input
                className={`${styles.input} ${fieldErrors.orgName ? styles.inputError : ""}`}
                type="text"
                placeholder="e.g. John Photography, ABC School"
                value={form.orgName}
                onChange={update("orgName")}
                autoFocus
              />
              {fieldErrors.orgName && (
                <p className={styles.fieldError}>{fieldErrors.orgName[0]}</p>
              )}
              {slugPreview && (
                <p className={styles.hint}>
                  Your workspace ID: <strong>{slugPreview}</strong>
                  <br />
                  <span className={styles.hintSmall}>
                    Employees and you will use this to log in
                  </span>
                </p>
              )}
            </div>

            <button type="submit" className={styles.btn}>
              Continue →
            </button>
          </form>
        )}

        {/* ── Step 2: Personal account ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Your name</label>
              <input
                className={`${styles.input} ${fieldErrors.name ? styles.inputError : ""}`}
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={update("name")}
                autoFocus
              />
              {fieldErrors.name && (
                <p className={styles.fieldError}>{fieldErrors.name[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email address</label>
              <input
                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
              />
              {fieldErrors.email && (
                <p className={styles.fieldError}>{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ""}`}
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={form.password}
                onChange={update("password")}
              />
              {fieldErrors.password && (
                <p className={styles.fieldError}>{fieldErrors.password[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirm password</label>
              <input
                className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ""}`}
                type="password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
              />
              {fieldErrors.confirmPassword && (
                <p className={styles.fieldError}>{fieldErrors.confirmPassword[0]}</p>
              )}
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? "Creating workspace…" : "Create workspace"}
              </button>
            </div>
          </form>
        )}

        <p className={styles.footer}>
          Already have a workspace?{" "}
          <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
