import { z } from 'zod';

export const GenerateScriptSchema = z.object({
    topic: z.string().trim().min(3, "El tema es muy corto").max(500, "El tema excede el límite de 500 caracteres"),
    platform: z.string().default('Reels'),
    tone: z.string().max(50).default('Profesional'),
    goal: z.string().max(50).default('Viralizar'),
    count: z.number().min(1).max(10).default(1),
    ideas: z.string().max(3000).optional().nullable(),
    userId: z.string().uuid("ID de usuario inválido"),
    // New fields for the Wizard
    awareness: z.string().optional().default('no te conoce'),
    victory: z.string().optional().nullable(),
    opinion: z.string().optional().nullable(),
    story: z.string().optional().nullable(),
    hookType: z.string().optional().default('curiosidad extrema'),
    intensity: z.number().min(1).max(5).default(3),
    // Source mapping for strategy ideas
    sourceType: z.string().optional().nullable(),
    sourceReferenceId: z.string().optional().nullable()
});

export const GeneratePlanSchema = z.object({
    description: z.string().trim().min(5, "Descripción muy corta").max(1000, "Descripción muy larga"),
    platforms: z.array(z.string().max(30)).min(1, "Selecciona al menos una plataforma").max(10, "Demasiadas plataformas"),
    frequency: z.string().max(50),
    focus: z.string().max(50),
    tone: z.string().max(30),
    context: z.string().max(2000).optional().nullable(),
    userId: z.string().uuid("ID de usuario inválido"),
    selectedIdeas: z.array(z.any()).optional().nullable()
});

export const GenerateIdeasSchema = z.object({
    context: z.string().trim().min(3, "Nicho muy corto").max(500, "Nicho muy largo"),
    platforms: z.array(z.string().max(30)).min(1, "Selecciona al menos una plataforma").max(10),
    useSEO: z.boolean().default(true),
    useTikTok: z.boolean().default(true),
    goal: z.string().max(50),
    count: z.number().min(1).max(30).default(10),
    userId: z.string().uuid("ID de usuario inválido")
});

export const RefineSchema = z.object({
    text: z.string().trim().min(5, "El texto es muy corto").max(2000, "El texto es muy largo"),
    type: z.enum(['gancho', 'desarrollo', 'cta']),
    context: z.string().max(500).optional().nullable(),
    userId: z.string().uuid("ID de usuario inválido")
});
