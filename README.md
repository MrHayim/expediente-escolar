# Expediente Escolar

App web para organizar la universidad: horario de clases, tareas por materia, calendario, avisos, calificaciones, faltas, repaso espaciado y temporizador de estudio. Pensada para estudiantes de áreas de la salud, sirve para cualquier carrera.

## Qué hace

- **Hoy**: avisos (atrasadas, entregas de hoy y mañana, exámenes próximos, faltas al límite, materias en riesgo), clases del día y repasos pendientes.
- **Calendario**: horario semanal con las entregas de cada día, y vista mensual.
- **Tareas**: por materia, con tipo (tarea, examen, práctica…), fecha y hora. Al registrar un examen puede crear sesiones de estudio 7, 3 y 1 día antes.
- **Materias**: criterios de evaluación con porcentaje, promedio actual, cuánto necesitas en lo que falta para aprobar, y control de faltas contra la asistencia mínima.
- **Estudio**: temporizador por bloques (25/5, 50/10, 90/20) que suma tiempo por materia, y repaso espaciado de temas (1, 3, 7, 14, 30, 60 y 120 días).
- **Perfiles**: varios perfiles por cuenta. Cada persona que conecta su propio Google Drive tiene sus propios perfiles.
- **Google Calendar**: cada tarea y clase tiene un botón para agregarla a tu calendario (las clases se repiten cada semana hasta el fin del semestre).
- **Avisos del navegador**: antes de clases, entregas y exámenes, mientras la app está abierta o en segundo plano.
- Funciona sin internet y se puede instalar en el celular (Agregar a pantalla de inicio).

## Dónde se guardan los datos

Primero en el navegador. Al conectar Google Drive, todo se guarda en el archivo `Expediente Escolar (datos).json` del Drive de cada usuario. La app usa el permiso `drive.file`: solo puede ver el archivo que ella misma creó, nunca el resto del Drive.

## Configurar Google Drive (una sola vez)

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) y crea un proyecto llamado *Expediente Escolar*.
2. En **APIs y servicios → Biblioteca**, busca **Google Drive API** y actívala.
3. En **Google Auth Platform** (pantalla de consentimiento), elige público **Externo**, ponle nombre a la app y tu correo de soporte.
4. En **Público → Usuarios de prueba**, agrega los correos de Gmail de quienes la van a usar (hasta 100).
5. En **Clientes → Crear cliente**, elige **Aplicación web** y en **Orígenes autorizados de JavaScript** agrega `https://mrhayim.github.io`.
6. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`) y pégalo en `config.js`.

El ID de cliente no es secreto; Google lo diseñó para ir dentro de páginas web.

## Uso en iPhone

Para recibir avisos en iPhone hay que abrir la página en Safari, tocar **Compartir → Agregar a inicio** y usar la app desde ese ícono.
