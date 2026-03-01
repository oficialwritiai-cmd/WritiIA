import { z } from 'zod';

export const GenerateScriptSchema = z.object({
    topic: z.string().trim().min(3, "El tema es muy corto").max(500, "El tema excede el límite de 500 caracteres"),
    platform: z.enum(['Reels', 'TikTok', 'Shorts', 'YouTube', 'LinkedIn', 'X', 'YouTube Shorts']).default('Reels'),
    tone: z.string().max(30).default('Profesional'),
    goal: z.string().max(50).default('Viralizar'),
    count: z.number().min(1).max(4).default(1),
    ideas: z.string().max(2000).optional().nullable(),
    userId: z.string().uuid("ID de usuario inválido")
});

export const GeneratePlanSchema = z.object({
    description: z.string().trim().min(5, "Descripción muy corta").max(1000, "Descripción muy larga"),
    platforms: z.array(z.string().max(30)).min(1, "Selecciona al menos una plataforma").max(10, "Demasiadas plataformas"),
    frequency: z.string().max(50),
    focus: z.string().max(50),
    tone: z.string().max(30),
    context: z.string().max(2000).optional().nullable(),
    userId: z.string().uuid("ID de usuario inválido")
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
