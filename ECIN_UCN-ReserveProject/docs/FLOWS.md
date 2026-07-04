# Flujos y Funcionamiento del Sistema de Reservas UCN

Este documento describe la arquitectura, los flujos principales de datos y las reglas de negocio del sistema de reservas de salas y mesas de estudio.

---

## 1. Arquitectura General y Tecnologías

El sistema se compone de tres piezas principales que se comunican entre sí:

```mermaid
graph TD
    A[Cliente Web - Vite + React/JS] <-->|HTTP / JSON / JWT| B(Backend - NestJS)
    M[Cliente Móvil - Flutter/React Native] <-->|HTTP / JSON / JWT| B
    B <-->|TypeORM / SQL| DB[(PostgreSQL DB)]
    B -->|SMTP| Mail[Servicio de Correo - Mailtrap/Otro]
    B <-->|OAuth2| Google[Google OAuth API]
```

- **Backend (NestJS + TypeORM)**: Expone una API REST, maneja la lógica de negocio, validación de colisiones de horarios con bloqueo pesimista y se conecta a la base de datos PostgreSQL.
- **Frontend Web & App Móvil**: Consumen la API REST enviando un token JWT en la cabecera `Authorization: Bearer <TOKEN>` para todas las rutas protegidas.
- **PostgreSQL**: Motor de base de datos relacional.
- **Google OAuth**: Proveedor de identidad externo para la autenticación segura de los estudiantes e investigadores de la UCN.

---

## 2. Flujo de Autenticación (Google OAuth)

La autenticación no requiere contraseña local. Se utiliza la cuenta institucional de Google de la UCN. El backend actúa como puente OAuth y genera un código de un solo uso que luego se intercambia por el JWT final.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Usuario (Web / Móvil)
    participant Cliente as Cliente (Web / App)
    participant API as Backend (NestJS)
    participant Google as Servidor Google
    participant DB as Base de Datos

    Usuario->>Cliente: Clic en "Iniciar sesión con Google"
    Cliente->>API: Redirección a /auth/google/web (o /mobile)
    API->>Google: Redirige a pantalla de login de Google
    Usuario->>Google: Introduce credenciales de UCN
    Google->>API: Devuelve perfil de usuario a /auth/google/callback
    
    Note over API,DB: Procesa los datos del perfil recibido
    API->>DB: Busca o crea el usuario en la BD (findOrCreate)
    DB-->>API: Retorna perfil de usuario de la BD (con su Rol)
    
    Note over API: Genera Token JWT temporalmente
    API->>API: Genera un código de login aleatorio (UUID)
    API->>API: Guarda temporalmente { código -> Datos de Login } (Expira en 5 min)
    
    API-->>Cliente: Redirección con código: /auth/callback?code=UUID
    Cliente->>API: POST /auth/exchange { code: UUID }
    API->>API: Busca datos de login, valida expiración y elimina el código temporal
    API-->>Cliente: Retorna JWT Token y datos del usuario
    Cliente->>Cliente: Almacena JWT en localStorage / almacenamiento seguro
```

---

## 3. Flujo de Reservas y Validaciones

Cuando un usuario desea reservar un espacio (sala o mesa) en un día y bloque horario específico, el backend realiza una serie de validaciones secuenciales estrictas antes de confirmar la reserva en una transacción aislada.

```mermaid
flowchart TD
    Start([Usuario solicita Reserva: POST /reservations]) --> Val1{¿Usuario Penalizado?<br>Revisa UserPenalty activa}
    Val1 -- Sí --o Err1[Error 400: Cuenta suspendida en esa fecha]
    Val1 -- No --> Val2{¿Espacio Bloqueado?<br>Revisa bloqueos administrativos}
    Val2 -- Sí --o Err2[Error 409: Espacio bloqueado por administración]
    Val2 -- No --> Val3{¿Es Admin?}
    
    Val3 -- No --> Val4{¿Horario coincide con<br>Bloques permitidos?<br>Revisa BlockConfig}
    Val4 -- No --o Err3[Error 400: Horario no coincide con la división de bloques]
    Val4 -- Sí --> StartTx
    
    Val3 -- Sí --> StartTx[Iniciar Transacción en BD]
    
    StartTx --> Lock[Bloqueo Pesimista del Espacio<br>pessimistic_write]
    Lock --> Val5{¿Es Admin?}
    
    Val5 -- No --> Val6{¿Supera Límite Semanal?<br>Máximo de reservas por usuario}
    Val6 -- Sí --o Rollback[Abortar Transacción / Rollback]
    Val6 -- No --> Val7{¿Hay Colisión de Horario?<br>Reservas coincidentes activas/pendientes}
    
    Val5 -- Sí --> Val7
    
    Val7 -- Sí --o Rollback
    Val7 -- No --> Commit[Guardar Reserva como PENDIENTE / ACTIVA]
    
    Commit --> Save[Confirmar Transacción / Commit]
    Save --> Mail[Enviar Correo de Confirmación]
    Mail --> End([Reserva Creada Exitosamente])
    
    Rollback --> Err4[Error 409/400: Conflicto u otra validación fallida]
```

### Reglas de Negocio en la Creación de Reservas
1. **Bloqueo Pesimista (`pessimistic_write`)**: Cuando se evalúan las colisiones, el backend bloquea la fila del espacio correspondiente. Si dos estudiantes intentan reservar la misma sala al mismo milisegundo, la segunda petición esperará a que termine la primera, evitando reservas duplicadas (double-booking).
2. **División de Bloques (`BlockConfig`)**: Permite subdividir los bloques de estudio (ej: Bloque A de 90 min en 2 subbloques de 45 min). El sistema valida que las horas ingresadas coincidan exactamente con el esquema vigente a la fecha de la reserva.
3. **Límite Semanal**: Los estudiantes regulares tienen un límite máximo de horas o cantidad de reservas semanales para garantizar equidad. Los administradores están exentos de esta restricción.

---

## 4. Flujo de Infracciones, Advertencias y Penalizaciones automáticas

Para evitar el ausentismo y promover el uso responsable de los recursos, el sistema cuenta con un mecanismo automático de advertencias (`UserWarning`) y suspensiones temporales (`UserPenalty`).

### Generación de Advertencias
Se crea una advertencia cuando un usuario:
- Cancela una reserva fuera del plazo permitido (ej: menos de 24 horas antes).
- No asiste a su reserva y no realiza la confirmación/check-in a tiempo.

### Flujo de Penalización Automática:

```mermaid
sequenceDiagram
    autonumber
    participant Sistema as Sistema de Reservas
    participant BD as Base de Datos (PostgreSQL)
    participant Mail as Mail Service (SMTP)

    Sistema->>BD: Crear advertencia (createWarning)
    BD-->>Sistema: Advertencia Guardada
    Sistema->>BD: Contar advertencias acumuladas del usuario
    BD-->>Sistema: Retorna total de advertencias (N)
    
    Note over Sistema: Obtiene límite max_warnings (ej: 3) de admin_settings
    
    alt N <= max_warnings
        Sistema->>Mail: Enviar correo de advertencia con acumulado (N / límite)
    else N > max_warnings
        Note over Sistema: Se excede el límite permitido
        Sistema->>Sistema: Calcular penalización: 7 días de suspensión
        Sistema->>BD: Crear registro en user_penalties (createPenalty)
        BD-->>Sistema: Penalización Guardada
        Sistema->>Mail: Enviar correo de suspensión indicando fechas y motivo
    end
```

### Consecuencia de la Penalización
Durante el período de vigencia de la penalización (desde `startDate` hasta `endDate`), cualquier intento del usuario de crear una nueva reserva será rechazado automáticamente por la API con un error de validación de negocio.

---

## 5. Gestión del Administrador

El rol de **Administrador** (`admin`) posee privilegios exclusivos para gestionar el sistema a través de las siguientes funcionalidades de backend:
1. **Ajustes del Sistema (`AdminSetting`)**: Permite modificar claves-valor globales en caliente como `confirm_deadline_days`, `cancel_deadline_days` y `max_warnings`.
2. **Configuración de Bloques (`BlockConfig`)**: Cambiar la granularidad de los turnos de reserva (1, 2, 3 o 4 subdivisiones de los bloques base) a partir de una fecha específica.
3. **Bloqueo Administrativo de Espacios (`SpaceBlock`)**: Bloquear salas completas o turnos específicos para mantenimiento, eventos institucionales o feriados, cancelando o impidiendo reservas de estudiantes para ese rango.
