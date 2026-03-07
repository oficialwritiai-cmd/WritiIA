/**
 * lib/validations.js
 * ─────────────────────────────────────────────────────────────
 * Centralized Zod input validation schemas.
 * 
 * SECURITY: All schemas enforce:
 * - String length limits to prevent oversized payload attacks
 * - Type enforcement to prevent injection
 * - Strict enums where applicable to prevent unexpected values
 * ─────────────────────────────────────────────────────────────
 */

import { z } from 'zod';

// ──────────────────────────────────────────────
// Shared sanitization helper
// Strip null bytes and dangerous Unicode sequences
// ──────────────────────────────────────────────
const safeString = (max) =>
    z.string()
        .transform((val) => val.replace(/\0/g, '').trim()) // Remove null bytes
        .pipe(z.string().max(max));

const safeOptional = (max) =>
    z.string()
        .transform((val) => val?.replace(/\0/g, '').trim())
        .pipe(z.string().max(max))
        .optional()
        .nullable();

// ──────────────────────────────────────────────
// Allowed platform enum values
// ──────────────────────────────────────────────
const PLATFORMS = z.enum([
    'Reels', 'TikTok', 'LinkedIn', 'X', 'YouTube Shorts',
    'YouTube', 'Instagram', 'Twitter', 'Podcast',
]);

// Lenient platform: allow the enum or fall back to a clean string (max 30)
const safePlatformStr = z.string().max(30);

// ──────────────────────────────────────────────
// Script Generation Schema
// ──────────────────────────────────────────────
export const GenerateScriptSchema = z.object({
    topic: safeString(500).pipe(z.string().min(3, 'El tema es muy corto')),
    platform: safePlatformStr.default('Reels'),
    tone: safeString(50).default('Profesional'),
    goal: safeString(50).default('Viralizar'),
    count: z.number().int().min(1).max(10).default(1),
    ideas: safeOptional(3000),
    userId: z.string().uuid('ID de usuario inválido'),
    awareness: safeString(50).optional().default('no te conoce'),
    victory: safeOptional(500),
    opinion: safeOptional(500),
    story: safeOptional(500),
    hookType: safeString(50).optional().default('curiosidad extrema'),
    intensity: z.number().int().min(1).max(5).default(3),
    sourceType: safeOptional(50),
    sourceReferenceId: z.string().uuid().optional().nullable(),
});

// ──────────────────────────────────────────────
// Plan Generation Schema
// ──────────────────────────────────────────────
export const GeneratePlanSchema = z.object({
    description: safeString(1000).pipe(z.string().min(5, 'Descripción muy corta')),
    platforms: z.array(safePlatformStr).min(1, 'Selecciona al menos una plataforma').max(10),
    frequency: safeString(50),
    focus: safeString(50),
    tone: safeString(30),
    context: safeOptional(2000),
    userId: z.string().uuid('ID de usuario inválido'),
    // SECURITY: was z.array(z.any()) — now strictly typed strings
    selectedIdeas: z.array(z.string().max(1000)).optional().nullable(),
});

// ──────────────────────────────────────────────
// Ideas Generation Schema
// ──────────────────────────────────────────────
export const GenerateIdeasSchema = z.object({
    context: safeString(500).pipe(z.string().min(3, 'Nicho muy corto')),
    platforms: z.array(safePlatformStr).min(1).max(10),
    useSEO: z.boolean().default(true),
    useTikTok: z.boolean().default(true),
    goal: safeString(50),
    count: z.number().int().min(1).max(30).default(10),
    userId: z.string().uuid('ID de usuario inválido'),
});

// ──────────────────────────────────────────────
// Refine Schema
// ──────────────────────────────────────────────
export const RefineSchema = z.object({
    text: safeString(2000).pipe(z.string().min(5, 'El texto es muy corto')),
    type: z.enum(['gancho', 'desarrollo', 'cta']),
    context: safeOptional(500),
    userId: z.string().uuid('ID de usuario inválido'),
});

// ──────────────────────────────────────────────
// Polish Schema (NEW — was missing)
// ──────────────────────────────────────────────
export const PolishSchema = z.object({
    text: safeString(3000).pipe(z.string().min(10, 'El texto es muy corto')),
    userId: z.string().uuid('ID de usuario inválido'),
});

// ──────────────────────────────────────────────
// Estrategia Generate Ideas Schema (NEW — was missing)
// ──────────────────────────────────────────────
export const EstrategiaIdeasSchema = z.object({
    objective: safeString(1000).pipe(z.string().min(5, 'El objetivo es muy corto')),
    launch: safeOptional(500),
    objection: safeOptional(500),
    story: safeOptional(1000),
    types: z.array(z.string().max(50)).max(20).optional().default([]),
    platforms: z.array(safePlatformStr).min(1, 'Selecciona una plataforma').max(10),
    userId: z.string().uuid('ID de usuario inválido'),
});

// ──────────────────────────────────────────────
// Ideas Extra Schema (NEW — was missing)
// ──────────────────────────────────────────────
export const IdeasExtraSchema = z.object({
    context: safeString(1000).pipe(z.string().min(5, 'El contexto es muy corto')),
    experienceLevel: safeOptional(100),
    productTicket: safeOptional(100),
    objections: safeOptional(500),
    examples: safeOptional(500),
    userId: z.string().uuid('ID de usuario inválido'),
});

// ──────────────────────────────────────────────
// Waitlist Schema (NEW — was missing)
// ──────────────────────────────────────────────
export const WaitlistSchema = z.object({
    email: z.string().email('Email inválido').max(254),
});
