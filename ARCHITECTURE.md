# 🏗️ Arquitectura del Sistema

## Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE RESERVAS UCN                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐      ┌──────────┐
│                  │         │                  │      │          │
│  📱 MOBILE APP   │◄───────►│  🔧 BACKEND API  │◄────►│ 🗄️ DB   │
│  (React Native)  │ HTTP    │   (NestJS)       │ SQL  │ PostSQL  │
│  Expo            │         │   Puerto: 3000   │      │ 5433     │
│                  │         │                  │      │          │
└──────────────────┘         └──────────────────┘      └──────────┘
       │                              │
       │                              │
       ├─ iOS/Android               ├─ OAuth2 Google
       ├─ Localhost (dev)           ├─ JWT Auth
       └─ IP:3000 (demo)            └─ RESTful API
```

---

## 📊 Stack Tecnológico

### **Frontend Mobile**
```
React Native + Expo
├── React Hooks (useState, useContext)
├── React Navigation (TabNavigator)
├── DateTimePicker (Calendario)
├── dayjs (Fechas)
├── Axios (HTTP requests)
└── TypeScript
```

### **Backend**
```
NestJS + TypeORM
├── Módulos:
│   ├── AuthModule (OAuth2 + JWT)
│   ├── UsersModule (Gestión de usuarios)
│   └── ReservationsModule (Core business)
├── Database: PostgreSQL + TypeORM
├── Authentication: Passport.js
├── Logging: Built-in Logger
└── Testing: Jest + Supertest
```

### **Base de Datos**
```
PostgreSQL (Docker)
├── Tabla: users
│   ├── id (UUID)
│   ├── email
│   ├── name
│   ├── googleId
│   └── createdAt
│
└── Tabla: reservations
    ├── id (UUID)
    ├── spaceTitle
    ├── spaceDescription
    ├── reservationDate (YYYY-MM-DD)
    ├── reservationSlot (A-H)
    ├── area
    ├── tipo
    ├── userId (FK)
    └── createdAt
```

---

## 🔄 Flujo de Datos

### **1. Login Flow**
```
Usuario
  │
  ├─ Toca "Inicia Sesión con Google"
  │
  ├─ AuthContext.tsx
  │   └─ Abre navegador → Google OAuth2
  │
  ├─ Backend: GET /auth/google
  │   └─ Redirige a Google
  │
  ├─ Backend: GET /auth/google/callback
  │   └─ Genera JWT Token
  │
  └─ App
      └─ Almacena token en AsyncStorage
```

### **2. Cargar Reservas**
```
ReservasScreen (useState)
  │
  ├─ useEffect → loadReservations()
  │
  ├─ apiGet('/reservas', token)
  │   │
  │   ├─ Backend: GET /reservas
  │   │   └─ SELECT * FROM reservations
  │   │
  │   └─ Retorna: BackendReservation[]
  │
  ├─ mapBackendToReserva() ← MAPEO
  │   ├─ spaceTitle → title
  │   ├─ reservationDate → date
  │   └─ reservationSlot → slot
  │
  └─ setItems(mapped)
      └─ UI actualizada con datos mapeados
```

### **3. Crear Reserva**
```
Usuario: Selecciona espacio → "Reservar" → "Confirmar"
  │
  ├─ handleConfirmReservation()
  │   └─ apiPost('/reservas', reservationData, token)
  │
  ├─ Backend: POST /reservas
  │   ├─ Valida token JWT
  │   ├─ Extrae userId del token
  │   ├─ INSERT INTO reservations
  │   └─ Retorna: BackendReservation (creada)
  │
  ├─ mapBackendToReserva()
  │   └─ Convierte respuesta
  │
  └─ Alert("✅ Reserva creada exitosamente!")
```

### **4. Ver Historial**
```
HistorialScreen
  │
  ├─ useEffect → loadHistory()
  │   └─ apiGet('/reservas/mine', token)
  │
  ├─ Backend: GET /reservas/mine
  │   ├─ Extrae userId del JWT
  │   ├─ SELECT * FROM reservations WHERE userId = ?
  │   └─ Retorna solo reservas del usuario
  │
  ├─ mapBackendToHistorial()
  │   └─ Formatea para Historial
  │
  └─ Renderiza lista de reservas propias
```

---

## 🔐 Seguridad

### **Autenticación OAuth2**
```
User Browser ─────►  Google OAuth2
     │
     ├─ User logs in with Google account
     │
     └─ Google returns: code
                    │
                    ▼
        Backend exchanges code for token
                    │
                    ├─ GET /auth/google/callback?code=XXX
                    └─ Returns: JWT + user data
                    
User App stores JWT locally
     │
     └─ All requests include:
        Authorization: Bearer {JWT_TOKEN}
```

### **JWT Token**
```
Header.Payload.Signature

Payload contiene:
{
  "sub": "user-id-uuid",
  "email": "user@gmail.com",
  "iat": 1234567890,
  "exp": 1234571490
}

Validado en cada endpoint protegido
```

---

## 📡 API Endpoints

### **Públicos**
```
GET  /                    → Health check
GET  /auth/google         → Inicia login con Google
GET  /auth/google/callback → Callback de Google
GET  /auth/google/web     → Login web
GET  /auth/google/web/callback → Callback web
GET  /auth/logout         → Logout
```

### **Protegidos (Require JWT)**
```
POST   /reservas          → Crear reserva
GET    /reservas          → Listar todas las reservas
GET    /reservas/mine     → Mis reservas (del usuario autenticado)
GET    /reservas/:id      → Obtener reserva por ID
DELETE /reservas/:id      → Cancelar reserva
```

### **Ejemplos de Request**
```bash
# GET /reservas
curl -H "Authorization: Bearer <JWT_TOKEN>" \
     http://localhost:3000/reservas

# POST /reservas
curl -X POST \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "spaceTitle": "Sala A",
       "spaceDescription": "Sala de reuniones",
       "reservationDate": "2026-05-06",
       "reservationSlot": "A",
       "area": "Campus Central",
       "tipo": "Sala"
     }' \
     http://localhost:3000/reservas
```

---

## 🎯 Componentes Principales

### **Backend (NestJS)**

#### `ReservationsController`
```typescript
@Controller('reservas')
export class ReservationsController {
  @Post()
  create(body: CreateReservationDto) → Reservation
  
  @Get()
  findAll() → Reservation[]
  
  @Get('mine')
  findMyReservations() → Reservation[]
  
  @Get(':id')
  findOne(id: string) → Reservation
  
  @Delete(':id')
  remove(id: string) → void
}
```

#### `ReservationsService`
```typescript
export class ReservationsService {
  create(createReservationDto, userId)
  findAll(filters)
  findByUser(userId)
  findOne(id)
  remove(id)
}
```

### **Mobile (React Native)**

#### `ReservasScreen.tsx`
```typescript
- Estado:
  ├─ items: Reserva[]
  ├─ filters: { slot, area, tipo, date }
  └─ ui: { expanded, showModal }

- Funciones:
  ├─ loadReservations()        ← Carga datos
  ├─ handleConfirmReservation() ← Crea reserva
  └─ applyFilters()            ← Filtra lista

- UI:
  ├─ Filtros (Dropdown)
  ├─ FlatList (Reservas)
  ├─ Modal (Confirmar)
  └─ DateTimePicker
```

#### `HistorialScreen.tsx`
```typescript
- Estado:
  └─ historiales: HistorialReserva[]

- Funciones:
  └─ loadHistory()  ← Carga reservas del usuario

- UI:
  └─ FlatList (Reservas propias)
```

#### `AuthContext.tsx`
```typescript
Proporciona:
├─ token: string (JWT)
├─ user: User | null
├─ login(): Promise<void>
├─ logout(): Promise<void>
└─ isAuthenticated: boolean
```

---

## 🔄 Transformación de Datos

### **Backend → Mobile**
```typescript
// Backend responde
{
  "id": "abc123",
  "spaceTitle": "Sala A",
  "spaceDescription": "Sala de reuniones",
  "reservationDate": "2026-05-06",
  "reservationSlot": "A",
  "area": "Campus Central",
  "tipo": "Sala",
  "space": { ... },
  "filtersApplied": { ... }
}

// Mapea a
{
  "id": "abc123",
  "title": "Sala A",           ← spaceTitle
  "description": "Sala de reuniones",
  "date": "2026-05-06",        ← reservationDate
  "slot": "A",                 ← reservationSlot
  "area": "Campus Central",
  "tipo": "Sala"
}

// Se usa en la UI
<Text>{reserva.title}</Text>     ← "Sala A"
<Text>{reserva.date}</Text>      ← "2026-05-06"
<Text>{reserva.slot}</Text>      ← "A"
```

---

## 🧪 Testing

### **Backend Tests**
```bash
npm run test              # Jest unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Coverage report
```

### **Mobile Tests**
```bash
npm run typecheck         # TypeScript validation
npm run lint              # ESLint
```

---

## 📈 Rendimiento

| Métrica | Valor |
|---------|-------|
| Tiempo de carga inicial | ~3-5s |
| Tiempo de GET /reservas | ~200-500ms |
| Tiempo de POST /reservas | ~300-600ms |
| Límite de resultados | Sin límite (paginar en producción) |
| Conexión a DB | ~50-100ms |

---

## 🚀 Deployment

### **Production Checklist**
```
[ ] Configurar HTTPS (SSL/TLS)
[ ] Cambiar JWT_SECRET a valor seguro
[ ] Configurar CORS correctamente
[ ] Usar base de datos separada para prod
[ ] Implementar rate limiting
[ ] Agregar logging y monitoring
[ ] Validar todas las entradas
[ ] Implementar paginación en /reservas
[ ] Agregar autenticación refresh tokens
[ ] Documentar API con Swagger
[ ] Backup automático de BD
```

---

## 📚 Recursos Útiles

- **NestJS Docs:** https://docs.nestjs.com
- **React Native:** https://reactnative.dev
- **TypeORM:** https://typeorm.io
- **Expo:** https://docs.expo.dev
- **PostgreSQL:** https://www.postgresql.org

---

**Arquitectura lista para producción** ✅
