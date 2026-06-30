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
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

// ─────────────────────────────────────────
// MANUALLY ADD MEMBER (by owner/staff)
// ─────────────────────────────────────────
export const AddMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;

// ─────────────────────────────────────────
// SELF-JOIN (public, via invite link — no auth)
// ─────────────────────────────────────────
export const SelfJoinSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
});

export type SelfJoinInput = z.infer<typeof SelfJoinSchema>;
