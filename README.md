# Expediente Escolar

App web para organizar la universidad: horario de clases, tareas por materia, calendario, avisos, calificaciones, faltas, repaso espaciado y temporizador de estudio. Pensada para estudiantes de áreas de la salud, sirve para cualquier carrera.

## Qué hace

- **Hoy**: avisos (atrasadas, entregas de hoy y mañana, exámenes próximos, faltas al límite, materias en riesgo), clases del día y repasos pendientes.
- **Calendario**: horario semanal con las entregas de cada día, y vista mensual.
- **Tareas**: por materia, con tipo (tarea, examen, práctica…), fecha y hora. Al registrar un examen puede crear sesiones de estudio 7, 3 y 1 día antes.
- **Materias**: criterios de evaluación con porcentaje, promedio actual, cuánto necesitas en lo que falta para aprobar, y control de faltas contra la asistencia mínima.
- **Estudio**: temporizador por bloques (25/5, 50/10, 90/20) que suma tiempo por materia, y repaso espaciado de temas (1, 3, 7, 14, 30, 60 y 120 días).
- **Perfiles con PIN**: cada persona entra con su nombre y su PIN; se pueden tener varios perfiles en el mismo dispositivo.
- **Google Calendar**: cada tarea y clase tiene un botón para agregarla a tu calendario (las clases se repiten cada semana hasta el fin del semestre).
- **Avisos del navegador**: antes de clases, entregas y exámenes, mientras la app está abierta o en segundo plano.
- Funciona sin internet y se puede instalar en el celular (Agregar a pantalla de inicio).

## Perfiles y PIN

Cada persona tiene su perfil con un PIN de 4 a 6 números. El PIN se pide solo la primera vez en cada dispositivo. Después de 5 PIN equivocados, ese perfil queda bloqueado 15 minutos. Para crear el primer perfil en un dispositivo nuevo se necesita el **código de instalación**; desde un dispositivo donde ya hay alguien dentro, no.

## Dónde se guardan los datos

En una hoja de Google Sheets de quien instaló la app, a través de Apps Script (`Code.gs`). Cada dispositivo guarda además una copia, así que la app funciona sin internet y sube los cambios cuando vuelve la conexión.

## Instalar el servidor (una sola vez)

1. Crea una hoja en [sheets.new](https://sheets.new) y llámala *Expediente Escolar*.
2. Abre **Extensiones → Apps Script**, borra lo que haya y pega el contenido de `Code.gs`. Guarda.
3. Elige la función **instalar** y presiona **Ejecutar**. Autoriza el acceso a la hoja. En el **Registro de ejecución** aparece el **código de instalación**: anótalo.
4. **Implementar → Nueva implementación → Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier usuario*.
5. Copia la URL que termina en `/exec` y pégala en `config.js`.

Si cambias `Code.gs`: **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. La URL no cambia.

## Uso en iPhone

Para recibir avisos en iPhone hay que abrir la página en Safari, tocar **Compartir → Agregar a inicio** y usar la app desde ese ícono.
