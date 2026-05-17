import posthog from 'posthog-js';

function track(event, props = {}) {
  try {
    if (typeof window !== 'undefined' && posthog?.capture) {
      posthog.capture(event, props);
    }
  } catch (e) {
    /* never crash the app */
  }
}

export const Analytics = {
  cerebroIniciado:         (projectId) => track('cerebro_ia_iniciado', { project_id: projectId }),
  cerebroCompletado:       (pct)       => track('cerebro_ia_completado', { completitud_pct: pct }),
  ideasGeneradas:          (count)     => track('ideas_generadas', { cantidad: count }),
  guionGenerado:           ()          => track('guion_generado'),
  guionGuardadoBiblioteca: ()          => track('guion_guardado_biblioteca'),
  sesionMatrixCompletada:  ()          => track('sesion_matrix_completada'),
  calendarioAbierto:       ()          => track('calendario_abierto'),
  creditosAgotados:        ()          => track('creditos_agotados'),
  identificarUsuario:      (userId, email) => {
    try {
      if (posthog?.identify) posthog.identify(userId, { email });
    } catch (e) {}
  },
};
