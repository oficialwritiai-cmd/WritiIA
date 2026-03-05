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

        // Format data for Excel
        const excelData = items.map(item => {
            const content = item.content || {};
            return {
                'Fecha': item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A',
                'Plataforma': item.platform || 'General',
                'Tipo de Contenido': content.tipo || content.tipo_idea || item.tags?.[1] || 'Idea',
                'Objetivo': item.goal || content.objetivo || 'Engagement',
                'Título de la Idea': item.titulo || content.titulo || content.titulo_idea || 'Sin título',
                'Descripción': content.descripcion || content.idea || '',
                'Por qué funciona': content.por_que_funciona || content.razon || '',
                'CTA Sugerido': content.cta || ''
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
