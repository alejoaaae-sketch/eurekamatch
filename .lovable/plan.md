

## Plan: Reestructurar lógica de Pagos y Notificaciones con filtrado por país

### Problema actual
- `beta_mode` es un interruptor global. Cuando está OFF, los pagos reales se activan para **todos** los países sin control granular.
- `beta_countries` solo filtra dónde aplica el beta, pero no se usa realmente en el frontend (el check es solo `betaMode` booleano global).
- Las notificaciones ya tienen el patrón correcto (enabled + countries), pero tampoco se filtra por país en el frontend.

### Lógica deseada

```text
PAGOS:
  beta_mode = ON?
    └─ SÍ → Simulación (sin cobros reales) para todos
    └─ NO → ¿País del usuario está en payment_countries?
              └─ SÍ → PayPal real
              └─ NO → Simulación (o pagos deshabilitados)

NOTIFICACIONES:
  notifications_enabled = ON?
    └─ SÍ → ¿País del usuario está en notification_countries?
              └─ SÍ → Permitir envío SMS
              └─ NO → No disponible
    └─ NO → No disponible
```

### Cambios necesarios

#### 1. Base de datos: añadir columna `payment_countries`
Nueva columna en `global_config`:
- `payment_countries text[] NOT NULL DEFAULT '{}'` -- países donde los cobros reales están activos (vacío = todos)

#### 2. Hook `useAppConfig.tsx`
- Añadir `payment_countries` al tipo `GlobalConfig` y exponerlo.
- Cambiar la lógica de `betaMode`: actualmente devuelve el valor global. Ahora debe considerar el país del usuario:
  - Si `beta_mode` = true → `betaMode = true` (simulación).
  - Si `beta_mode` = false → comprobar si el país del usuario está en `payment_countries`. Si está (o lista vacía = todos), pagos reales. Si no está, simulación.
- Para las notificaciones: exponer una función `canUseNotifications(country)` que compruebe `notifications_enabled` + `notification_countries`.

#### 3. Obtener país del usuario
- Reutilizar la detección por IP existente en `src/lib/i18n.ts` (`ip-api.com`). Crear un hook `useUserCountry` o almacenar el país en `sessionStorage` para reutilizarlo sin llamadas duplicadas.

#### 4. Frontend: `BuyPacks.tsx` y `AddPick.tsx`
- Usar el `betaMode` recalculado (que ya considera país) para decidir entre simulación y PayPal. Sin cambios de lógica, solo el hook devuelve el valor correcto.

#### 5. Frontend: Notificaciones (`usePickNotifications.tsx`)
- Añadir comprobación de país antes de permitir el envío.

#### 6. Admin Panel (`Admin.tsx`)
- **Pestaña Global > Pagos**: Cuando `beta_mode` está OFF, mostrar campo `payment_countries` ("Países con pagos activos").
- **Pestaña Notificaciones**: Ya tiene el patrón correcto (enabled + countries). Sin cambios necesarios.
- Eliminar `beta_countries` del UI (se reemplaza por `payment_countries` que tiene más sentido semántico).

### Resumen de archivos a modificar
- **Migración SQL**: añadir `payment_countries` a `global_config`
- `src/hooks/useAppConfig.tsx`: añadir campo, recalcular `betaMode` con país
- `src/hooks/useUserCountry.tsx`: nuevo hook para detectar país
- `src/pages/Admin.tsx`: mostrar `payment_countries` cuando beta OFF
- `src/pages/BuyPacks.tsx`: sin cambios (usa `betaMode` del hook)
- `src/pages/AddPick.tsx`: sin cambios (usa `betaMode` del hook)
- `src/hooks/usePickNotifications.tsx`: filtrar por país

