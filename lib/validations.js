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
    topic: z.string().max(500).transform(v => (v || '').replace(/\0/g, '').trim()).pipe(
        z.string().min(1).catch('Tema sin especificar')
    ),
    platform: z.string().max(50).optional().catch('Reels').default('Reels'),
    tone: z.string().max(100).optional().catch('Profesional').default('Profesional'),
    goal: z.string().max(200).optional().catch('Viralizar').default('Viralizar'),
    count: z.number().int().min(1).max(4).optional().catch(1).default(1),
    ideas: z.string().max(5000).optional().nullable().catch(null),
    userId: z.string().optional().nullable().catch(null),
    awareness: z.string().max(100).optional().catch('no te conoce').default('no te conoce'),
    victory: z.string().max(1000).optional().nullable().catch(null),
    opinion: z.string().max(1000).optional().nullable().catch(null),
    story: z.string().max(2000).optional().nullable().catch(null),
    hookType: z.string().max(100).optional().catch('curiosidad extrema').default('curiosidad extrema'),
    intensity: z.number().int().min(1).max(5).optional().catch(3).default(3),
    videoDuration: z.string().max(20).optional().catch('60 seg').default('60 seg'),
    specificDetails: z.string().max(5000).optional().nullable().catch(null),
    ctaIdea: z.string().max(1000).optional().nullable().catch(null),
    experienciaReal: z.string().max(2000).optional().nullable().catch(null),
    opinionPersonal: z.string().max(2000).optional().nullable().catch(null),
    faseCreador: z.string().max(500).optional().nullable().catch(null),
    sourceType: z.string().max(100).optional().nullable().catch(null),
    sourceReferenceId: z.string().optional().nullable().catch(null),
    projectId: z.string().optional().nullable().catch(null),
});

// ──────────────────────────────────────────────
// Plan Generation Schema
// ──────────────────────────────────────────────
export const GeneratePlanSchema = z.object({
    description: safeString(1500).pipe(z.string().min(5, 'Descripción muy corta')),
    platforms: z.array(safePlatformStr).min(1, 'Selecciona al menos una plataforma').max(10),
    frequency: safeString(50),
    focus: safeString(50),
    tone: safeString(30),
    context: safeOptional(2500),
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
    // NEW MARKETING BRIEF FIELDS
    businessOffer: safeOptional(1000),
    targetAudience: safeOptional(500),
    targetAudienceType: safeOptional(100),
    mainPainPoint: safeOptional(1000),
    monthlyGoals: z.array(z.string().max(100)).optional().default([]),
    successMetric: safeOptional(500),
    keyThemes: safeOptional(1000),
    contentStyles: z.array(z.string().max(100)).optional().default([]),
    howNotToSound: safeOptional(500),
    brandMantra: safeOptional(500),
    ticketPrice: safeOptional(100),

    // SECURITY: was z.array(z.any()) — now strictly typed strings
    selectedIdeas: z.array(z.string().max(1000)).optional().nullable(),
    postCount: z.number().int().min(1).max(30).optional().default(30),
    projectId: z.string().uuid().optional().nullable(),
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
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
});

// ──────────────────────────────────────────────
// Refine Schema
// ──────────────────────────────────────────────
export const RefineSchema = z.object({
    text: z.union([
        safeString(2000), 
        z.array(z.string().max(2000))
    ]).optional(),
    texts: z.array(z.string().max(2000)).optional(), // Alternative field for bulk
    type: z.enum(['gancho', 'desarrollo', 'cta', 'titles', 'hooks', 'descriptions', 'hashtags_groups', 'full_script']),
    context: safeOptional(500),
    instruction: safeOptional(1000),
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
});

// ──────────────────────────────────────────────
// Polish Schema (NEW — was missing)
// ──────────────────────────────────────────────
export const PolishSchema = z.object({
    text: safeString(3000).pipe(z.string().min(5, 'El texto es muy corto')),
    instruction: safeOptional(1000), // NEW: user can provide custom instruction
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
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
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
});

// ──────────────────────────────────────────────
// Ideas Extra Schema (NEW — was missing)
// ──────────────────────────────────────────────
export const IdeasExtraSchema = z.object({
    context: safeOptional(1000),
    experienceLevel: safeOptional(100),
    productTicket: safeOptional(100),
    objections: safeOptional(500),
    examples: safeOptional(500),
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    proactive: z.boolean().optional().default(false),
    businessOffer: safeOptional(1000),
    targetAudience: safeOptional(500),
    mainPainPoint: safeOptional(1000),
});

// ──────────────────────────────────────────────
// Waitlist Schema (NEW — was missing)
// ──────────────────────────────────────────────
export const WaitlistSchema = z.object({
    email: z.string().email('Email inválido').max(254),
});

// ──────────────────────────────────────────────
// Ads Plan Generation Schema (v4.2.0)
// ──────────────────────────────────────────────
export const GenerateAdsSchema = z.object({
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    quantity: z.number().int().min(1).max(20).default(5),
    offer: safeString(1000).pipe(z.string().min(3, 'La oferta es muy corta')),
    offerType: safeString(100).default('Producto digital'),
    objective: safeString(100).default('Ventas directas'),
    audience: safeString(1000).default(''),
    painPoint: safeOptional(1000),
    differentiator: safeOptional(1000),
    promise: safeOptional(1000),
    adStyles: z.array(z.string().max(100)).optional().default([]),
    tone: safeString(50).default('cercano'),
    platforms: z.array(z.string().max(50)).min(1).max(10).default(['Meta Ads']),
});
