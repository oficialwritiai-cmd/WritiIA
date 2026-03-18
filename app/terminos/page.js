import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import '../landing.css';

export const metadata = {
    title: 'Términos de Servicio | Writi.ai',
    description: 'Términos y condiciones de uso de Writi.ai.',
};

export default function TerminosPage() {
    return (
        <div className="landing" style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 120px' }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 40, fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>

                <h1 style={{ fontSize: '2.5rem', marginBottom: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Términos y Condiciones del Servicio</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 48 }}>Última actualización: 18 de Marzo de 2026</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontSize: '1rem' }}>
                    
                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>1. Definiciones</h2>
                        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <li><strong style={{color: '#fff'}}>Servicio:</strong> La plataforma de software como servicio (SaaS) llamada WRITI.AI, diseñada para la planificación de contenido y generación de guiones con Inteligencia Artificial.</li>
                            <li><strong style={{color: '#fff'}}>Usuario / Cliente:</strong> Cualquier persona que se registre y pague una suscripción para usar el Servicio.</li>
                            <li><strong style={{color: '#fff'}}>Proveedor:</strong> Writi IA, con domicilio en Barcelona, España y correo electrónico hi@writi-ai.com.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>2. Objeto del Contrato (Licencia vs. Venta)</h2>
                        <p>
                            Al suscribirse a WRITI.AI, el Cliente no está comprando el software, sino alquilando el derecho a usarlo. El Proveedor otorga al Cliente una licencia limitada, revocable, no exclusiva, intransferible y no sublicenciable para acceder y utilizar la plataforma de manera estricta a través de internet (modalidad SaaS) y durante el tiempo que mantenga su suscripción activa. El Cliente no tiene derecho a descargar, instalar, alojar en sus propios servidores ni obtener una copia del código subyacente de la plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>3. Propiedad Intelectual</h2>
                        <p>
                            El Proveedor mantiene todos los derechos, títulos e intereses, incluidos los derechos de propiedad intelectual, sobre el Servicio WRITI.AI (incluyendo código fuente, interfaces, diseño, algoritmos de IA propios y marca). El uso del Servicio no otorga al Cliente ningún derecho de propiedad sobre el software. Los textos y guiones finales generados por el Cliente usando la plataforma serán propiedad del Cliente.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>4. Uso Permitido y Usos Prohibidos</h2>
                        <p>El Cliente se compromete a usar el Servicio de forma legal y ética. <strong>Queda estrictamente prohibido:</strong></p>
                        <ul style={{ paddingLeft: 20, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <li>Hacer ingeniería inversa, descompilar o intentar extraer el código fuente o los modelos de IA de WRITI.AI.</li>
                            <li>Revender, sublicenciar o comercializar el acceso a la cuenta a terceros.</li>
                            <li>Utilizar la IA para generar contenido ilegal, difamatorio, que incite al odio o que infrinja derechos de terceros.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>5. Limitación de Responsabilidad</h2>
                        <p>
                            WRITI.AI se proporciona 'tal cual' (as-is) y 'según disponibilidad'. En la máxima medida permitida por la ley aplicable, el Proveedor no será responsable por daños indirectos, incidentales, especiales, punitivos o lucro cesante, pérdida de ingresos, pérdida de datos o interrupciones de negocio que surjan del uso o la imposibilidad de uso del Servicio. En cualquier caso, la responsabilidad total y acumulada del Proveedor ante el Cliente por cualquier reclamación relacionada con este contrato no superará, bajo ninguna circunstancia, el monto total pagado por el Cliente al Proveedor durante los tres (3) meses inmediatamente anteriores al evento que dio lugar a la reclamación.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>6. Portabilidad y Borrado de Datos</h2>
                        <p>
                            En caso de cancelación de la suscripción, la cuenta del Cliente pasará a estado inactivo al finalizar su ciclo de facturación pagado. El Cliente dispondrá de un plazo de treinta (30) días naturales tras la fecha de expiración para acceder a su cuenta en modo de solo lectura y exportar sus guiones e ideas. Una vez transcurrido este plazo, el Proveedor se reserva el derecho de eliminar definitivamente y de forma irrecuperable todos los datos, proyectos y configuraciones del Cerebro IA asociados a la cuenta del Cliente, sin obligación de previo aviso ni responsabilidad alguna por la pérdida de dicha información.
                        </p>
                    </section>
                    
                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>7. Acuerdo de Nivel de Servicio (SLA)</h2>
                        <p>
                            Nuestro objetivo es mantener WRITI.AI operativo y accesible el 99% del tiempo mensual ("Objetivo de Disponibilidad"). El cálculo del tiempo de inactividad no incluirá interrupciones causadas por mantenimientos programados, fuerza mayor o fallos de terceros (como integraciones de API o proveedores de hosting). WRITI.AI es un servicio bajo el esquema de "mejor esfuerzo comercial".
                        </p>
                    </section>

                    <section style={{ padding: '24px', background: 'rgba(255,100,100,0.05)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 12, marginTop: 24 }}>
                        <h2 style={{ fontSize: '1.2rem', color: '#ffb3b3', marginBottom: 12 }}>Aviso Importante sobre IA (Disclaimer)</h2>
                        <p style={{ fontSize: '0.95rem' }}>
                            <strong>Supervisión Humana Requerida:</strong> WRITI.AI es una herramienta impulsada por inteligencia artificial. El Cliente reconoce que la IA puede generar contenido impreciso o repetitivo ("alucinaciones"). Es responsabilidad exclusiva del Cliente revisar y verificar cualquier copy antes de publicarlo. El Proveedor no asume ninguna responsabilidad legal por las consecuencias derivadas del contenido publicado. Asimismo, WRITI.AI no garantiza resultados específicos de negocio, viralidad o aumento de ventas.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
