# Turnero — Sistema de gestión de entregas

App **React + Vite + TypeScript** para gestionar turnos de entrega en depósito.

## Stack
- **Frontend**: React 18 + Vite + TypeScript
- **DB**: Supabase (PostgreSQL)
- **Deploy**: Netlify

## Setup
1. Crear proyecto en [Supabase](https://supabase.com) y ejecutar `supabase_schema.sql`
2. Copiar `.env.example` a `.env` y completar credenciales
3. `npm install && npm run dev`

## Deploy en Netlify
- Build command: `npm run build`
- Publish dir: `dist`
- Env vars: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

## Usuarios
- **Proveedor**: nombre + empresa → elige fecha/hora → confirma turno
- **Operador**: código `DEPOSITO2024` → calendario mensual completo → gestiona estados
