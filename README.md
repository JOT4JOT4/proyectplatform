# 🎓 ECIN UCN - Sistema de Reservas de Espacios Académicos

> Una solución moderna para gestionar reservas de aulas, laboratorios y salas en la Universidad Católica del Norte

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node-18%2B-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

---

## 📋 Documentación Principal

### 📖 Para Empezar Rápido
- **[QUICK_START.md](QUICK_START.md)** - Inicio en 5 minutos ⚡
- **[START_DEMO.bat](START_DEMO.bat)** - Script automático para Windows 🤖

### 🎯 Para Demostración
- **[DEMO.md](DEMO.md)** - Guía completa de demostración 📱
- **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Resumen profesional 📊

### 🔧 Para Técnicos
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detalles técnicos, diagramas y APIs 🏗️

---

## 🚀 Inicio Rápido (3 pasos)

### 1. Ir al directorio del proyecto
```bash
cd ECIN_UCN-ReserveProject
```

### 2. Opción A: Automático (Recomendado)
```bash
START_DEMO.bat
```

### 2. Opción B: Manual
```bash
# Terminal 1: Base de datos
docker-compose up -d

# Terminal 2: Backend
cd backend && npm run start:dev

# Terminal 3: Mobile
cd movil && npm start
```

### 3. Abrir en Expo Go
Escanea el QR que aparece en la terminal con Expo Go en tu dispositivo

---

## ✨ Funcionalidades

- ✅ **Autenticación OAuth2** - Login con Google
- ✅ **9 Espacios de Ejemplo** - Precargados en la BD
- ✅ **Filtros Inteligentes** - Fecha, hora, tipo, ubicación
- ✅ **Crear Reservas** - Con 1 click
- ✅ **Historial** - Ver todas tus reservas
- ✅ **Mobile First** - iOS + Android vía Expo
- ✅ **Tiempo Real** - Datos actualizados al instante
- ✅ **Seguro** - JWT tokens + validaciones

---

## 🏗️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend Mobile** | React Native + Expo + TypeScript |
| **Backend** | NestJS + TypeORM + PostgreSQL |
| **Autenticación** | OAuth2 + JWT |
| **Infraestructura** | Docker + Docker Compose |
| **Testing** | Jest + Supertest |

---

## 📊 Datos de Ejemplo

```
9 espacios precargados para demostración:
├─ 4 Salas (Campus Central)
├─ 1 Aula Multimedia (Edificio 2)
├─ 2 Laboratorios (Edificio 3-4)
├─ 1 Sala Individual (Biblioteca)
└─ 1 Biblioteca (Biblioteca)

Todos disponibles: 2026-05-06
Franjas horarias: A-H (08:10 - 23:00)
```

---

## 📱 Screenshots (Flujo de Demostración)

```
1. Login                 2. Explorar              3. Filtrar
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ Inicia Sesión│        │ 🎓 Sala A    │        │ Área ▼       │
│ Con Google   │   →    │ 🎓 Sala B    │   →    │ Franja ▼     │
│              │        │ 🎓 Lab Info  │        │ Tipo ▼       │
└──────────────┘        └──────────────┘        └──────────────┘
                               ↓
4. Seleccionar              5. Confirmar              6. Historial
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ Sala A       │        │ Reservar     │        │ Mis Reservas │
│ Franja A     │   →    │ ¿Confirmar?  │   →    │ ✅ Sala A    │
│ [Reservar]   │        │ [Sí] [No]    │        │ 2026-05-06   │
└──────────────┘        └──────────────┘        └──────────────┘
```

---

## 🔐 Seguridad

- OAuth2 con Google (sin almacenar contraseñas)
- JWT tokens con expiración automática
- Validación de entrada en todos los endpoints
- Control de acceso basado en roles
- HTTPS en producción

---

## 📈 Requisitos Mínimos

- Node.js 18+
- Docker + Docker Compose
- Conexión a Internet
- Dispositivo/Emulador Android o iOS
- 2GB de espacio en disco

---

## 🆘 Problemas Comunes

### "Port 3000 already in use"
```bash
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### "Network request failed"
Verifica que EXPO_PUBLIC_API_URL esté configurado con tu IP local:
```bash
set EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
npm start
```

### "Can't connect to database"
```bash
docker-compose restart db
```

---

## 📚 Documentación Completa

| Documento | Propósito |
|-----------|-----------|
| [DEMO.md](DEMO.md) | Guía completa de demostración con walkthroughs |
| [QUICK_START.md](QUICK_START.md) | Comienzo rápido en 5 minutos |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detalles técnicos, diagramas, APIs |
| [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) | Resumen ejecutivo para stakeholders |
| [README.md](README.md) | Este archivo (overview general) |

---

## 🎯 Flujo de Demostración (5 minutos)

1. **Login** (30 seg) → Toca "Inicia Sesión con Google"
2. **Ver Datos** (1 min) → Se cargan 9 espacios automáticamente
3. **Filtrar** (1 min) → Aplica filtros por área, hora, tipo
4. **Crear Reserva** (1 min) → Selecciona espacio → Confirma
5. **Ver Historial** (1 min) → Navega a pestaña "Historial"

**Total: ~5 minutos de demostración completa**

---

## 🗂️ Estructura del Proyecto

```
.
├── ECIN_UCN-ReserveProject/
│   ├── backend/                # NestJS API (puerto 3000)
│   ├── movil/                  # React Native + Expo (iPhone/Android)
│   ├── web/                    # React + Vite (opcional)
│   ├── docker-compose.yml      # PostgreSQL + pgAdmin
│   └── README.md
│
├── DEMO.md                     # 📖 Guía de demostración
├── QUICK_START.md              # ⚡ Inicio rápido
├── ARCHITECTURE.md             # 🏗️ Detalles técnicos
├── EXECUTIVE_SUMMARY.md        # 📊 Resumen ejecutivo
├── START_DEMO.bat              # 🤖 Script automático
└── README.md                   # 📄 Este archivo
```

---

## 💡 Features Principales

### Autenticación
- ✅ OAuth2 con Google
- ✅ JWT tokens
- ✅ Sesión persistente

### Reservas
- ✅ Crear reservas
- ✅ Ver disponibilidad
- ✅ Cancelar reservas
- ✅ Historial completo

### Filtros
- ✅ Por fecha
- ✅ Por franja horaria (A-H)
- ✅ Por área/ubicación
- ✅ Por tipo de espacio
- ✅ Combinaciones múltiples

---

## 🚀 URLs y Puertos

| Servicio | URL | Port |
|----------|-----|------|
| Backend API | http://localhost:3000 | 3000 |
| PostgreSQL | localhost | 5433 |
| pgAdmin | http://localhost:5050 | 5050 |
| Mobile | Expo Go (QR) | - |

---

## 🎉 ¿Listo?

### Opción 1: Automático
```bash
cd ECIN_UCN-ReserveProject
START_DEMO.bat
```

### Opción 2: Rápido
```bash
# Lee la guía rápida
cat QUICK_START.md
```

### Opción 3: Detallado
```bash
# Lee la guía completa
cat DEMO.md
```

---

**🌟 Sistema listo para producción y demostración - 2026-05-06**
