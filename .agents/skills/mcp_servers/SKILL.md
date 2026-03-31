---
name: Utilizar Servidores MCP
description: Instrucciones de cómo el agente debe lanzar y conectarse a los servidores del Model Context Protocol (MCP) para adquirir nuevas skills.
---

Este proyecto incluye el mejor repositorio oficial de GitHub para agentes: `modelcontextprotocol/servers` clonado en la carpeta `/mcp-skills`.

Cuando el usuario requiera que Antigravity (el agente IA) adquiera una nueva habilidad externa (ej: interactuar con bases de datos, leer Google Drive, etc.), el agente debe:
1. Navegar a la carpeta `/mcp-skills/src/[nombre-del-servidor]`.
2. Revisar el archivo `README.md` de esa skill en concreto.
3. Instalar sus dependencias o arrancar el servidor usando `npx` (por ejemplo, `npx -y @modelcontextprotocol/server-sqlite`).
4. Proveer al usuario las instrucciones exactas si necesita hacer login o añadir configuraciones de variables de entorno (`.env`).

Esto dota al Agente IA de capacidades casi infinitas para escalar este proyecto a producción (manejo de base de datos automatizado, búsquedas web profundas, subida de archivos al cloud).
