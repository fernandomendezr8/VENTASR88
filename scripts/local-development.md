# Desarrollo Local

## Configuración inicial

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Instalar Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

3. **Iniciar Supabase local**:
   ```bash
   supabase start
   ```

4. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita .env con las URLs locales que muestra supabase start
   ```

5. **Aplicar migraciones**:
   ```bash
   supabase db reset
   ```

6. **Generar tipos**:
   ```bash
   supabase gen types typescript --local > src/lib/database.types.ts
   ```

7. **Iniciar desarrollo**:
   ```bash
   npm run dev
   ```

## URLs locales (después de `supabase start`)

- **API URL**: http://localhost:54321
- **GraphQL URL**: http://localhost:54321/graphql/v1
- **DB URL**: postgresql://postgres:postgres@localhost:54322/postgres
- **Studio URL**: http://localhost:54323
- **Inbucket URL**: http://localhost:54324
- **JWT secret**: tu-jwt-secret-local
- **anon key**: tu-anon-key-local
- **service_role key**: tu-service-role-key-local

## Comandos de desarrollo

### Base de datos
```bash
# Crear nueva migración
supabase migration new nombre_migracion

# Aplicar migraciones
supabase db reset

# Ver diferencias con producción
supabase db diff

# Hacer backup local
supabase db dump --data-only > backup-local.sql

# Restaurar backup
psql postgresql://postgres:postgres@localhost:54322/postgres < backup-local.sql
```

### Desarrollo
```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

### Testing
```bash
# Ejecutar tests (si están configurados)
npm test

# Tests de migraciones
supabase test db
```

## Estructura de archivos

```
├── supabase/
│   ├── config.toml          # Configuración de Supabase
│   ├── migrations/          # Migraciones SQL
│   ├── functions/           # Edge Functions
│   └── seed.sql            # Datos de prueba
├── src/
│   ├── components/         # Componentes React
│   ├── lib/               # Configuración y utilidades
│   ├── hooks/             # Custom hooks
│   └── utils/             # Funciones de utilidad
├── .github/
│   └── workflows/         # GitHub Actions
└── scripts/               # Scripts de desarrollo
```

## Flujo de desarrollo recomendado

1. **Crear rama feature**:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Desarrollar localmente**:
   - Hacer cambios en el código
   - Crear migraciones si es necesario
   - Probar localmente

3. **Crear migración** (si es necesario):
   ```bash
   supabase migration new descripcion_del_cambio
   # Editar el archivo SQL generado
   supabase db reset  # Aplicar cambios
   ```

4. **Actualizar tipos**:
   ```bash
   supabase gen types typescript --local > src/lib/database.types.ts
   ```

5. **Commit y push**:
   ```bash
   git add .
   git commit -m "feat: descripción del cambio"
   git push origin feature/nueva-funcionalidad
   ```

6. **Crear Pull Request**:
   - GitHub Actions verificará las migraciones automáticamente
   - Revisar y aprobar
   - Merge a `develop` o `main`

## Debugging

### Base de datos
```bash
# Conectar a la DB local
psql postgresql://postgres:postgres@localhost:54322/postgres

# Ver logs de Supabase
supabase logs

# Ver estado de servicios
supabase status
```

### Frontend
- Usar React DevTools
- Verificar Network tab para requests a Supabase
- Revisar Console para errores

## Datos de prueba

Para cargar datos de prueba:

```bash
# Si tienes un archivo seed.sql
supabase db reset

# O cargar datos específicos
psql postgresql://postgres:postgres@localhost:54322/postgres < datos-prueba.sql
```

## Troubleshooting

### Problemas comunes

1. **Supabase no inicia**:
   ```bash
   supabase stop
   docker system prune -f
   supabase start
   ```

2. **Migraciones fallan**:
   ```bash
   supabase db reset --debug
   ```

3. **Tipos desactualizados**:
   ```bash
   supabase gen types typescript --local > src/lib/database.types.ts
   ```

4. **Puerto ocupado**:
   ```bash
   supabase stop
   # Cambiar puertos en config.toml si es necesario
   supabase start
   ```

### Logs útiles
```bash
# Ver todos los logs
supabase logs

# Logs específicos
supabase logs --db
supabase logs --api
supabase logs --auth
```