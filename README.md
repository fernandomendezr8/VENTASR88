# VentasPro - Sistema de Gestión de Ventas

Sistema completo de gestión de ventas con React, TypeScript, Tailwind CSS y Supabase.

## 🚀 Características

- **Punto de Venta**: Sistema completo de ventas con carrito, promociones y múltiples métodos de pago
- **Gestión de Inventario**: Control de stock, alertas de stock bajo, ajustes de inventario
- **Gestión de Clientes**: Base de datos completa de clientes con historial de compras
- **Gestión de Productos**: Catálogo de productos con categorías, proveedores y unidades de medida
- **Promociones**: Sistema avanzado de promociones (porcentaje, monto fijo, compra X lleva Y, paquetes)
- **Empleados**: Sistema de roles y permisos (admin, manager, cajero, consultor)
- **Reportes**: Análisis de ventas, inventario y rendimiento del negocio
- **Caja Registradora**: Control de movimientos de efectivo y conciliación
- **Configuración**: Personalización completa del sistema

## 🛠️ Tecnologías

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Iconos**: Lucide React
- **Deployment**: Netlify (Frontend), Supabase (Backend)
- **CI/CD**: GitHub Actions

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta en Supabase
- Cuenta en GitHub (para CI/CD)
- Cuenta en Netlify (para deployment)

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/ventaspro.git
cd ventaspro
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Supabase
```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar sesión
supabase login

# Iniciar servicios locales
supabase start
```

### 4. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con las URLs que muestra supabase start
```

### 5. Aplicar migraciones
```bash
supabase db reset
```

### 6. Generar tipos TypeScript
```bash
npm run build:types
```

### 7. Iniciar desarrollo
```bash
npm run dev
```

## 🔧 Scripts Disponibles

### Desarrollo
- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build
- `npm run lint` - Ejecutar ESLint

### Base de Datos
- `npm run db:start` - Iniciar Supabase local
- `npm run db:stop` - Detener Supabase local
- `npm run db:reset` - Resetear base de datos local
- `npm run db:migrate` - Crear nueva migración
- `npm run db:push` - Aplicar migraciones a producción
- `npm run db:backup` - Crear backup de la base de datos
- `npm run build:types` - Generar tipos TypeScript

### Deployment
- `npm run deploy` - Build y deploy completo

## 🏗️ Arquitectura

### Frontend
```
src/
├── components/          # Componentes React
│   ├── Auth.tsx        # Autenticación
│   ├── Dashboard.tsx   # Panel principal
│   ├── Layout.tsx      # Layout principal
│   ├── NewSale.tsx     # Punto de venta
│   ├── Products.tsx    # Gestión de productos
│   ├── Sales.tsx       # Historial de ventas
│   ├── Customers.tsx   # Gestión de clientes
│   ├── Inventory.tsx   # Control de inventario
│   ├── Reports.tsx     # Reportes y análisis
│   ├── Employees.tsx   # Gestión de empleados
│   ├── Settings.tsx    # Configuración
│   └── ...
├── lib/
│   ├── supabase.ts     # Configuración de Supabase
│   └── database.types.ts # Tipos generados
├── hooks/              # Custom hooks
├── utils/              # Utilidades
└── ...
```

### Backend (Supabase)
```
supabase/
├── migrations/         # Migraciones SQL
├── functions/          # Edge Functions
├── config.toml        # Configuración
└── ...
```

## 🔄 CI/CD con GitHub Actions

El proyecto incluye workflows automáticos:

### 1. Deploy (`deploy.yml`)
- Se ejecuta en push a `main`
- Ejecuta tests
- Aplica migraciones a Supabase
- Despliega frontend a Netlify
- Actualiza tipos TypeScript automáticamente

### 2. Migration Check (`migration-check.yml`)
- Se ejecuta en PRs que modifican migraciones
- Valida que las migraciones sean correctas
- Verifica que los tipos estén actualizados

### 3. Database Backup (`database-backup.yml`)
- Backup diario automático a las 2:00 AM UTC
- Guarda backups en el repositorio
- Limpia backups antiguos (mantiene últimos 30)

## ⚙️ Configuración de Secrets

Para que el CI/CD funcione, configura estos secrets en GitHub:

### Supabase
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Netlify
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Ver `scripts/setup-github-secrets.md` para instrucciones detalladas.

## 🗃️ Base de Datos

### Tablas principales
- `products` - Catálogo de productos
- `categories` - Categorías de productos
- `suppliers` - Proveedores
- `customers` - Clientes
- `sales` - Ventas
- `sale_items` - Items de venta
- `inventory` - Control de inventario
- `cash_register` - Movimientos de caja
- `employees` - Empleados y roles
- `promotions` - Sistema de promociones

### Funciones optimizadas
- `get_dashboard_stats()` - Estadísticas del dashboard
- `get_recent_sales()` - Ventas recientes
- `get_low_stock_products()` - Productos con stock bajo
- `cleanup_old_data()` - Limpieza automática

## 👥 Sistema de Roles

### Admin
- Acceso completo al sistema
- Gestión de empleados
- Configuración del sistema

### Manager
- Gestión de ventas, productos, inventario
- Visualización de reportes
- Gestión de clientes y proveedores

### Cajero
- Punto de venta
- Gestión básica de clientes
- Consulta de productos e inventario

### Consultor
- Solo lectura de reportes
- Consulta de datos

## 🔧 Desarrollo

### Crear nueva funcionalidad
1. Crear rama: `git checkout -b feature/nueva-funcionalidad`
2. Desarrollar localmente
3. Crear migración si es necesario: `npm run db:migrate nombre`
4. Actualizar tipos: `npm run build:types`
5. Commit y push
6. Crear Pull Request

### Crear migración
```bash
npm run db:migrate descripcion_del_cambio
# Editar el archivo SQL generado en supabase/migrations/
npm run db:reset  # Aplicar localmente
```

## 📊 Monitoreo y Optimización

- **Performance**: Consultas optimizadas con índices y cache
- **Backup**: Automático diario con GitHub Actions
- **Logs**: Disponibles en Supabase Dashboard
- **Métricas**: Dashboard integrado con estadísticas en tiempo real

## 🐛 Troubleshooting

Ver `scripts/local-development.md` para guía completa de desarrollo local y solución de problemas.

### Problemas comunes
1. **Supabase no inicia**: `supabase stop && supabase start`
2. **Tipos desactualizados**: `npm run build:types`
3. **Migraciones fallan**: `supabase db reset --debug`

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

Para soporte y preguntas:
- Crear issue en GitHub
- Revisar documentación en `scripts/`
- Consultar logs en Supabase Dashboard

---

**VentasPro** - Sistema completo de gestión de ventas para pequeñas y medianas empresas.