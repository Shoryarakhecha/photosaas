// src/lib/validations.ts
// Zod schemas for all forms — shared between frontend and API

import { z } from "zod";

// ─────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────
export const SignupSchema = z.object({
  // Organization info
  orgName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name too long"),

  // Owner account
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SignupInput = z.infer<typeof SignupSchema>;

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  orgSlug: z
    .string()
    .min(1, "Organization slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ─────────────────────────────────────────
// CREATE EVENT
// ─────────────────────────────────────────
export const CreateEventSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters").max(150),
  description: z.string().max(1000).optional().or(z.literal("")),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Please enter a valid date"),
  isPublic: z.boolean().optional().default(false),
  allowMemberUploads: z.boolean().optional().default(false),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

// Basic phone format check — allows optional +, digits, spaces, hyphens, parens.
// Not full E.164 validation (would need a phone library), but blocks obvious garbage.
const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;

// ─────────────────────────────────────────
// MANUALLY ADD MEMBER (by owner/staff)
// ─────────────────────────────────────────
export const AddMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().regex(phoneRegex, "Please enter a valid phone number").optional().or(z.literal("")),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;

// ─────────────────────────────────────────
// SELF-JOIN (public, via invite link — no auth)
// ─────────────────────────────────────────
// Email is now required — it must be OTP-verified before a Member row
// is created (see /api/join/[inviteCode]/send-otp + verify-otp).
export const SelfJoinSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().regex(phoneRegex, "Please enter a valid phone number").optional().or(z.literal("")),
});

export type SelfJoinInput = z.infer<typeof SelfJoinSchema>;

// ─────────────────────────────────────────
// OTP — SEND CODE
// ─────────────────────────────────────────
export const SendOtpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export type SendOtpInput = z.infer<typeof SendOtpSchema>;

// ─────────────────────────────────────────
// OTP — VERIFY CODE
// ─────────────────────────────────────────
export const VerifyOtpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
