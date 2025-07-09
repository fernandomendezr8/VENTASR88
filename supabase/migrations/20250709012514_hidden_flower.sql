/*
# Configurar Usuario Administrador

1. Propósito
   - Asegurar que el usuario estivenmendezr@gmail.com esté configurado como administrador
   - Actualizar o crear el registro de empleado con rol admin
   - Resolver problemas de acceso a la sección de empleados

2. Cambios
   - Buscar el user_id del usuario por email
   - Crear o actualizar registro en la tabla employees
   - Asignar rol de administrador y estado activo

3. Seguridad
   - Mantener políticas RLS existentes
   - Asegurar acceso completo para el administrador
*/

-- Función para configurar el usuario administrador
DO $$
DECLARE
  admin_user_id uuid;
  existing_employee_id uuid;
BEGIN
  -- Buscar el user_id del usuario administrador por email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'estivenmendezr@gmail.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Verificar si ya existe un registro de empleado para este usuario
    SELECT id INTO existing_employee_id
    FROM employees 
    WHERE user_id = admin_user_id;
    
    IF existing_employee_id IS NOT NULL THEN
      -- Actualizar empleado existente
      UPDATE employees 
      SET 
        role = 'admin',
        status = 'active',
        name = 'Estiven Mendez',
        email = 'estivenmendezr@gmail.com',
        updated_at = now()
      WHERE user_id = admin_user_id;
      
      RAISE NOTICE 'Usuario administrador actualizado: %', admin_user_id;
    ELSE
      -- Crear nuevo registro de empleado
      INSERT INTO employees (
        user_id,
        name,
        email,
        role,
        status,
        hire_date,
        permissions
      ) VALUES (
        admin_user_id,
        'Estiven Mendez',
        'estivenmendezr@gmail.com',
        'admin',
        'active',
        CURRENT_DATE,
        '{}'::jsonb
      );
      
      RAISE NOTICE 'Nuevo empleado administrador creado: %', admin_user_id;
    END IF;
    
    -- Actualizar cualquier registro placeholder que pueda existir
    UPDATE employees 
    SET 
      user_id = admin_user_id,
      name = 'Estiven Mendez',
      email = 'estivenmendezr@gmail.com',
      role = 'admin',
      status = 'active',
      updated_at = now()
    WHERE user_id IS NULL 
    AND email = 'admin@ventaspro.com';
    
  ELSE
    RAISE NOTICE 'Usuario con email estivenmendezr@gmail.com no encontrado en auth.users';
  END IF;
END $$;

-- Verificar que el usuario administrador esté configurado correctamente
DO $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM employees 
  WHERE email = 'estivenmendezr@gmail.com' 
  AND role = 'admin' 
  AND status = 'active';
  
  IF admin_count > 0 THEN
    RAISE NOTICE 'Usuario administrador configurado correctamente';
  ELSE
    RAISE WARNING 'No se pudo configurar el usuario administrador';
  END IF;
END $$;

-- Asegurar que no haya registros duplicados o conflictivos
DELETE FROM employees 
WHERE email = 'admin@ventaspro.com' 
AND user_id IS NULL;

-- Comentario para documentación
COMMENT ON TABLE employees IS 'Tabla de empleados - Usuario administrador configurado para estivenmendezr@gmail.com';