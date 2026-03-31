---
description: Cómo desplegar la App a producción en internet (Vercel)
---

Este workflow (skill del agente) permite desplegar de forma segura el MVP del Guardaequipajes en internet para que el dueño del negocio pueda usarlo en cualquier móvil, tablet u ordenador de su local.

Sigue estos pasos rigurosamente cada vez que se invoque el despliegue a producción:

// turbo-all
1. Primero, asegúrate de que el código compila perfectamente antes de enviarlo a internet. Ejecuta:
`npm run build`

2. Comprueba que no hay errores de sintaxis o empaquetado y que se ha generado la carpeta `dist`.

3. A continuación, usa la herramienta de despliegue oficial Vercel (ideal para Vite + React) directamente por terminal:
`npx vercel --prod`

4. **Interacción con el usuario:**
   - La primera vez que se ejecute este comando, Vercel pedirá inicio de sesión desde la consola. Debes avisar al usuario para que siga el enlance que aparecerá en pantalla y haga clic en "Log In" (puede usar su cuenta de Google/Email habitual).
   - Vercel hará algunas preguntas (ej: *Set up and deploy?*, *Which scope?*, *Link to existing project?*). Utiliza tus herramientas para pulsar **"Enter"** (con la herramienta de `send_command_input`) y dejar todas las opciones por defecto que da Vercel (simplemente aceptando las rutas por defecto: "./").
   - Es importante que el proyecto conste como una App generada con el framework *Vite*.

5. Cuando el comando termine, capturará una **URL de Producción** (ej: `https://lockers-elche-123.vercel.app`).

6. Finalmente, formatea un mensaje amistoso, destácale la URL al usuario, y diles que ya pueden abrir esa URL en la pantalla principal de su teléfono o guardarla en marcadores en la tablet de recepción del local para empezar a gestionar maletas.
