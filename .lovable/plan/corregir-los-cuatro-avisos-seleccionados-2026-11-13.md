# Corregir los cuatro avisos seleccionados

## Cambios que necesitan tu aprobación
- **Compras de prueba:** solo el administrador podrá recibir créditos mediante compras simuladas. Los demás usuarios no podrán obtener créditos de pago gratis; mientras esté activo el modo de prueba, se mostrará que la compra no está disponible, sin cobrarles automáticamente.
- **Invitaciones:** aceptar el código únicamente al crear la cuenta, nunca mediante cambios posteriores del perfil. Mantener la recompensa de bienvenida y comprobar que la promoción esté activa.
- **Retorno tras pagar con PayPal y Stripe:** permitir solo los dominios actuales de EurekaMatch y las vistas previas de este proyecto expresamente autorizadas. Rechazar cualquier destino externo; no autorizar indiscriminadamente todas las vistas previas de Lovable.

No cambiar otros avisos, precios, saldos existentes, dominio ni presentación.

## Detalles técnicos
- Comprobar el rol administrador dentro de `complete_beta_purchase`, no solo en la pantalla de compras.
- Trasladar la aplicación del código de invitación al alta controlada del perfil; impedir cambios de `referred_by` posteriores y eliminar la concesión por UPDATE, preservando el alta existente y sus demás datos.
- Compartir una validación estricta del origen entre las dos funciones de creación de pagos, antes de contactar con los proveedores.
- Aplicar y verificar los cambios en Lovable Cloud, desplegar las funciones afectadas y ejecutar pruebas de regresión de compras, invitaciones y destinos permitidos/rechazados.
- Registrar únicamente estos cuatro avisos como corregidos cuando las comprobaciones hayan pasado.

## Estado actual
**Corregidos:** 0 en esta intervención.
**Pendientes:** 4 seleccionados, a la espera de aprobar estos cambios de funcionamiento.
**Resumen:** Aún no se han aplicado cambios. Tras corregirlos, conviene repetir el análisis: detecta riesgos comunes, pero no sustituye pruebas avanzadas de penetración.
