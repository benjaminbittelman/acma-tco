# ACMA · TCO de enfierradura · Web App V12

Esta versión está diseñada para **GitHub Pages + Supabase**. La razón es simple:

- **GitHub Pages** entrega una URL HTTPS real para Safari/iPhone/iPad y evita la vista previa de Archivos/Quick Look.
- **Supabase** centraliza todas las evaluaciones hechas desde distintos dispositivos.
- Una **Edge Function** genera un PDF individual por evaluación y puede enviar el correo al cliente dejando al KAM seleccionado en CC.
- Si se cae internet durante la feria, la app conserva la evaluación localmente e intenta sincronizarla cuando vuelve la conexión.

## Qué conserva de las versiones anteriores

- Flujo por compuertas, una decisión por pantalla.
- Fondo azul ACMA con retícula y nodos/diamantes naranjos.
- TCO como lenguaje principal: TCO tradicional vs TCO con malla.
- Selección del KAM al inicio.
- Tipologías y defaults actuales.
- Pérdida con malla fija en 1%.
- Pisos e incidencia en ruta crítica lineal por altura.
- Cuantías kg/m² y kg/m³.
- Consumo de hormigón como referencia ACMA cuando el cliente no lo conoce.
- Registro de qué variables fueron informadas por el cliente y cuáles quedaron como referencia ACMA.
- Gráficos: costo, plazo, composición, sensibilidad ±10% y puntos de equilibrio.
- Autoguardado al entrar al resultado.
- Gestión ACMA oculta al cliente.

## Arquitectura

- Frontend: GitHub Pages.
- Historial central: Supabase Postgres.
- PDF privado: Supabase Storage.
- Backend: Supabase Edge Function.
- Correo transaccional: Resend.
- Respaldo offline: almacenamiento local y sincronización al volver internet.

## Seguridad

El frontend nunca contiene la clave `service_role` de Supabase ni la API key de Resend. El historial central se opera mediante la Edge Function y Gestión ACMA utiliza un PIN de administración.

## Despliegue

El workflow `.github/workflows/pages.yml` publica automáticamente la rama `main` en GitHub Pages.

El archivo `config.js` se actualizará con la URL de la función Supabase una vez creado el proyecto.

## Correcciones V12

- PDF/correo vuelve a leer los datos actuales de la etapa 1.
- Folio estable `TCO-AAAAMMDD-XXXXXX`.
- Regeneración de PDF cuando cambian los datos.
- Accesos rápidos de hormigón con decimales `0,20 · 0,25 · 0,30 · 0,40`.
- Envío al cliente con PDF adjunto y CC automático al KAM.
