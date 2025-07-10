# Configuración de GitHub Secrets

Para que el sistema funcione correctamente con GitHub, necesitas configurar los siguientes secrets en tu repositorio:

## Secrets Requeridos

### Supabase
1. `SUPABASE_ACCESS_TOKEN` - Token de acceso de Supabase
   - Ve a https://app.supabase.com/account/tokens
   - Crea un nuevo token con permisos completos

2. `SUPABASE_PROJECT_ID` - ID de tu proyecto Supabase
   - Encuéntralo en la URL de tu proyecto: `https://app.supabase.com/project/[PROJECT_ID]`

3. `SUPABASE_DB_PASSWORD` - Contraseña de la base de datos
   - La contraseña que configuraste al crear el proyecto

4. `VITE_SUPABASE_URL` - URL pública de tu proyecto
   - Ejemplo: `https://tu-proyecto.supabase.co`

5. `VITE_SUPABASE_ANON_KEY` - Clave anónima pública
   - Encuéntrala en Settings > API de tu proyecto Supabase

### Netlify (para deployment)
6. `NETLIFY_AUTH_TOKEN` - Token de autenticación de Netlify
   - Ve a https://app.netlify.com/user/applications#personal-access-tokens

7. `NETLIFY_SITE_ID` - ID del sitio en Netlify
   - Encuéntralo en Site settings > General > Site details

## Cómo configurar los secrets

1. Ve a tu repositorio en GitHub
2. Navega a Settings > Secrets and variables > Actions
3. Haz clic en "New repository secret"
4. Agrega cada secret con su nombre y valor correspondiente

## Configuración del proyecto Supabase

1. Instala Supabase CLI localmente:
   ```bash
   npm install -g supabase
   ```

2. Inicia sesión en Supabase:
   ```bash
   supabase login
   ```

3. Vincula tu proyecto local:
   ```bash
   supabase link --project-ref TU_PROJECT_ID
   ```

4. Genera los tipos TypeScript:
   ```bash
   supabase gen types typescript --local > src/lib/database.types.ts
   ```

## Flujo de trabajo

Una vez configurado, el sistema funcionará así:

1. **Push a main**: Despliega automáticamente base de datos y frontend
2. **Pull Request**: Verifica que las migraciones sean válidas
3. **Backup diario**: Crea respaldos automáticos de la base de datos
4. **Tipos actualizados**: Se generan automáticamente cuando cambia el schema

## Comandos útiles

```bash
# Crear nueva migración
supabase migration new nombre_de_la_migracion

# Aplicar migraciones localmente
supabase db reset

# Generar tipos
supabase gen types typescript --local > src/lib/database.types.ts

# Hacer backup manual
supabase db dump --data-only > backup.sql

# Aplicar migraciones a producción
supabase db push
```

## Estructura de ramas recomendada

- `main`: Producción (auto-deploy)
- `develop`: Desarrollo (testing automático)
- `feature/*`: Nuevas características
- `hotfix/*`: Correcciones urgentes

## Notas importantes

- Las migraciones se aplican automáticamente en `main`
- Los backups se guardan en el repositorio (carpeta `backups/`)
- Los tipos TypeScript se actualizan automáticamente
- El frontend se despliega en Netlify automáticamente