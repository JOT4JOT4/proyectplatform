# 📱 DEMO - Sistema de Reservas UCN

**Proyecto:** ECIN_UCN-ReserveProject  
**Descripción:** Sistema completo para reserva de espacios académicos (aulas, laboratorios, salas)  
**Stack:** NestJS + React Native (Expo) + PostgreSQL + Docker

---

## 🎯 Funcionalidades Principales

### 1. **Autenticación** 🔐
- Login con Google OAuth2
- JWT Token Management
- Persistencia de sesión

### 2. **Pantalla de Reservas** 📅
- **Listado dinámico** de espacios disponibles
- **Filtros avanzados:**
  - Por rango de fechas
  - Por franja horaria (A-H: 08:10 hasta 23:00)
  - Por área/ubicación
  - Por tipo de espacio
- **Crear reserva:** Seleccionar espacio → Confirmar → Guardado en BD

### 3. **Historial** 📋
- Visualizar todas las reservas propias
- Información: Espacio, fecha, estado

### 4. **Backend API** ⚙️
- GET `/reservas` - Listar espacios disponibles
- POST `/reservas` - Crear reserva
- GET `/reservas/mine` - Historial del usuario
- DELETE `/reservas/:id` - Cancelar reserva
- Auth endpoints con Google

### 5. **Base de Datos** 💾
- **9 espacios de ejemplo precargados:**
  - Sala A, B, C, D
  - Aulas Multimedia
  - Laboratorios (Informática, Creativo)
  - Biblioteca
  - Salas Individuales

---

## 🚀 Cómo Ejecutar la Demo

### **Prerequisitos**
- Docker + Docker Compose
- Node.js 18+
- Expo Go (en móvil o emulador)

### **Paso 1: Levantar la Base de Datos**

```bash
cd ECIN_UCN-ReserveProject
docker-compose up -d
```

**Verificar:**
```bash
docker ps | grep db  # Debe mostrar contenedor PostgreSQL activo en puerto 5433
```

### **Paso 2: Iniciar Backend**

```bash
cd backend
npm install  # Si es primera vez
npm run start:dev
```

**Esperado:**
```
[Nest] #### - 06/05/2026, 12:00:42 LOG [NestApplication] Nest application successfully started
```

✅ Backend listo en: `http://localhost:3000`

### **Paso 3: Iniciar App Mobile**

**En otra terminal:**

```bash
cd movil
npm install  # Si es primera vez
EXPO_PUBLIC_API_URL="http://172.30.128.1:3000" npm start
```

⚠️ **Reemplaza `172.30.128.1` con tu IP local** (verifica con `ipconfig`)

### **Paso 4: Escanear QR en Expo Go**

1. Abre **Expo Go** en tu dispositivo/emulador
2. Escanea el **QR code** que aparece en la terminal
3. La app se abrirá automáticamente

---

## 📲 Demo Walkthrough

### **Pantalla 1: Login** 🔐
```
┌─────────────────────┐
│  ECIN UCN RESERVAS  │
│                     │
│  [ Inicia Sesión ]  │
│  [ Con Google ]     │
└─────────────────────┘
```

**Acción:** Toca "Inicia Sesión con Google"

---

### **Pantalla 2: Reservas Disponibles** 📅
```
┌─────────────────────────────┐
│ Filtros ▼                   │
│ Fecha | Slot | Área | Tipo  │
├─────────────────────────────┤
│ 🎓 SALA A                   │
│   📍 Campus Central         │
│   🕐 Franja A (08:10-09:40) │
│   📍 2026-05-06             │
│   [Ver más ▼]               │
│                             │
│ 🎓 AULA MULTIMEDIA A        │
│   📍 Edificio 2             │
│   🕐 Franja B (09:55-11:25) │
│   [Ver más ▼]               │
│ ...                         │
│ [Reservar →]  [Cancelar]    │
└─────────────────────────────┘
```

#### **Demostración de Filtros:**

**1. Filtrar por Área:**
- Toca "Área ▼"
- Selecciona "Campus Central" 
- Ver que solo aparecen espacios de esa área

**2. Filtrar por Franja Horaria:**
- Toca "Slot ▼"
- Selecciona "C 11:40 - 13:10"
- Ver reservas disponibles en esa franja

**3. Filtrar por Tipo:**
- Toca "Tipo ▼"
- Selecciona "Sala"
- Ver solo salas

---

### **Pantalla 3: Crear Reserva** ✨

**Acción:** Selecciona un espacio → Toca **[Reservar →]**

```
┌──────────────────────────────┐
│ 📋 RESERVAR SALA A           │
├──────────────────────────────┤
│                              │
│ Espacio: SALA A              │
│ Franja: A (08:10 - 09:40)    │
│ Fecha: 2026-05-06            │
│ Área: Campus Central         │
│                              │
│ [CONFIRMAR RESERVA]          │
│ [CANCELAR]                   │
│                              │
└──────────────────────────────┘
```

**Acción:** Toca **[CONFIRMAR RESERVA]**

**Resultado esperado:**
```
✅ ¡Reserva creada exitosamente!
   ID: [uuid generado]
```

---

### **Pantalla 4: Historial** 📋

**Acción:** Navega a la pestaña "Historial"

```
┌──────────────────────────────┐
│ MIS RESERVAS                 │
├──────────────────────────────┤
│ ✅ SALA A - 2026-05-06       │
│    Estado: Reservada         │
│    Franja: A (08:10-09:40)   │
│                              │
│ ✅ AULA MULTIMEDIA - 2026-05-07
│    Estado: Reservada         │
│    Franja: B (09:55-11:25)   │
│                              │
│ (Más reservas...)            │
└──────────────────────────────┘
```

**Verifica:**
- Las reservas creadas aparecen aquí
- Muestra la información correcta
- Datos se cargan desde el backend ✅

---

## 🔧 Detalles Técnicos

### **Arquitectura de Datos**

**Backend responde con:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "spaceTitle": "SALA A",
  "spaceDescription": "Sala de reuniones",
  "reservationDate": "2026-05-06",
  "reservationSlot": "A",
  "area": "Campus Central",
  "tipo": "Sala"
}
```

**Mobile mapea a:**
```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "SALA A",           // ← De spaceTitle
  description: "Sala de reuniones",
  date: "2026-05-06",        // ← De reservationDate
  slot: "A",                 // ← De reservationSlot
  area: "Campus Central",
  tipo: "Sala"
}
```

### **Datos de Ejemplo en BD**

| Espacio | Fecha | Franja | Área | Tipo |
|---------|-------|--------|------|------|
| Sala A | 2026-05-06 | A | Campus Central | Sala |
| Sala B | 2026-05-06 | B | Campus Central | Sala |
| Aula Multimedia A | 2026-05-06 | C | Edificio 2 | Aula |
| Sala Individual 1 | 2026-05-06 | D | Biblioteca | Sala |
| Sala C | 2026-05-06 | E | Campus Central | Sala |
| Sala D | 2026-05-06 | F | Campus Central | Sala |
| Laboratorio Informática | 2026-05-06 | G | Edificio 3 | Laboratorio |
| Biblioteca Norte | 2026-05-06 | H | Biblioteca | Biblioteca |
| Laboratorio Creativo | 2026-05-06 | A | Edificio 4 | Laboratorio |

---

## ✅ Checklist de Demostración

- [ ] Docker PostgreSQL corriendo
- [ ] Backend NestJS iniciado (puerto 3000)
- [ ] App mobile abierta en Expo Go
- [ ] Login exitoso con Google
- [ ] Se cargan las 9 reservas de ejemplo
- [ ] Filtros funcionan:
  - [ ] Filtro por Área
  - [ ] Filtro por Franja Horaria
  - [ ] Filtro por Tipo
- [ ] Crear reserva exitosa
- [ ] Nueva reserva aparece en Historial
- [ ] Datos coinciden entre backend y mobile

---

## 🐛 Troubleshooting

### **"Network request failed" en Expo Go**
```bash
# Verifica tu IP local
ipconfig | findstr "IPv4"

# Relanza con la IP correcta
EXPO_PUBLIC_API_URL="http://TU_IP:3000" npm start
```

### **Port 3000 already in use**
```bash
# Mata proceso en puerto 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### **PostgreSQL no conecta**
```bash
# Verifica contenedor
docker ps | grep db
docker logs ecin_ucn-reserveproject-db-1

# Reinicia
docker-compose restart db
```

---

## 📊 Métricas del Proyecto

- **Endpoints API:** 8+
- **Pantallas Mobile:** 3 principales (Login, Reservas, Historial)
- **Datos de Ejemplo:** 9 espacios precargados
- **Tiempo de Carga:** <2s (backend + BD)
- **Filtros Disponibles:** 4 tipos

---

## 🎉 Conclusión

Este proyecto demuestra:
- ✅ Full-stack development (Backend + Mobile)
- ✅ Integración con OAuth2 (Google)
- ✅ Arquitectura en capas (Controller → Service → Entity)
- ✅ Real-time data sync entre app y BD
- ✅ UI/UX profesional con React Native
- ✅ Manejo de estado y filtros complejos

**¡Listo para demostrar! 🚀**
