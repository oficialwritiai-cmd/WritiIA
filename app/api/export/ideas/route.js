import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(req) {
    try {
        const { ids, items: rawItems, userId } = await req.json();

        const supabase = createSupabaseClient();
        let items = [];

        if (ids && Array.isArray(ids) && ids.length > 0) {
            // Fetch selected ideas from library
            const { data, error } = await supabase
                .from('library')
                .select('*')
                .in('id', ids)
                .eq('user_id', userId);
            if (error) throw error;
            items = data || [];
        } else if (rawItems && Array.isArray(rawItems)) {
            items = rawItems;
        }

        if (items.length === 0) {
            return NextResponse.json({ error: 'No hay ideas para exportar.' }, { status: 400 });
        }

        // Remove completely empty items
        const validItems = items.filter(item => {
            const content = item.content || item;
            return item.titulo || content.titulo || content.titulo_idea || content.descripcion || item.title || item.plataforma || content.plataforma;
        });

        if (validItems.length === 0) {
            return NextResponse.json({ error: 'No hay ideas válidas para exportar.' }, { status: 400 });
        }

        // Format data for Excel
        const excelData = validItems.map((item, idx) => {
            // Support both DB library items (item.content) and direct idea objects (item)
            const content = item.content || item;

            // Calculate a scheduled date similar to the UI Monthly Plan
            let fechaDate = 'N/A';
            if (item.created_at) {
                fechaDate = new Date(item.created_at).toLocaleDateString();
            } else {
                const day = Math.floor(idx * (30 / validItems.length)) + 1;
                const dateObj = new Date();
                fechaDate = `${day.toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
            }

            const titulo = item.titulo || content.titulo || content.titulo_idea || item.title || `Idea de Contenido #${idx + 1}`;
            const plataforma = item.platform || content.plataforma || 'General';
            const objetivo = item.goal || content.objetivo || 'Engagement';
            const tipo = content.tipo || content.tipo_contenido || content.tipo_idea || item.tags?.[1] || 'Idea Estratégica';

            // Smart fallbacks requested by user
            const descripcion = content.descripcion || content.idea || `Contenido sobre "${titulo}" orientado a ${objetivo}.`;
            const porQueFunciona = content.por_que_funciona || content.razon || `Funciona porque conecta orgánicamente a tu audiencia con el objetivo comercial (${objetivo}) usando un formato adaptado para ${plataforma}.`;
            const cta = content.cta || 'Invita a interactuar (comentar, guardar) o a visitar el enlace de tu perfil.';

            return {
                'Fecha': fechaDate,
                'Plataforma': plataforma,
                'Tipo de Contenido': tipo,
                'Objetivo': objetivo,
                'Título de la Idea': titulo,
                'Descripción': descripcion,
                'Por qué funciona': porQueFunciona,
                'CTA Sugerido': cta
            };
        });

        // Create workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ideas de contenido');

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Disposition': 'attachment; filename="WritiIA_Content_Ideas.xlsx"',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (err) {
        console.error('[EXPORT_ERROR]', err);
        return NextResponse.json({ error: 'Error al generar el archivo Excel.' }, { status: 500 });
    }
}
