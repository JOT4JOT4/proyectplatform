# 🚀 Quick Start - Demo

## Opción 1: Automático (Recomendado)

```bash
# Desde la carpeta raíz del proyecto
cd c:\Users\juanX\Documents\proyectplatform
START_DEMO.bat
```

Esto inicia:
1. ✅ Docker PostgreSQL
2. ✅ Backend NestJS (puerto 3000)
3. ✅ Mobile Expo

---

## Opción 2: Manual (Paso a Paso)

### Terminal 1: Base de Datos
```bash
cd ECIN_UCN-ReserveProject
docker-compose up -d
```

### Terminal 2: Backend
```bash
cd ECIN_UCN-ReserveProject/backend
npm run start:dev
```

**Espera a ver:**
```
[Nest] #### - 06/05/2026, 12:XX:XX LOG [NestApplication] Nest application successfully started
```

### Terminal 3: Mobile
```bash
cd ECIN_UCN-ReserveProject/movil

# Primero, obtén tu IP local:
ipconfig | findstr "IPv4"  # Ej: 192.168.1.100

# Luego inicia con tu IP:
set EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
npm start
```

---

## 📱 En Expo Go

1. Abre **Expo Go** en tu dispositivo o emulador
2. Escanea el **QR code** de la terminal
3. Espera a que se cargue la app (~10 segundos)

---

## ✨ Flujo de Demo (5 minutos)

### 1. **Login** (30 seg)
   - Toca "Inicia Sesión con Google"
   - Elige una cuenta Google
   - Se abre la app

### 2. **Ver Reservas** (1 min)
   - La pantalla muestra 9 espacios de ejemplo
   - Scrollea para ver todos

### 3. **Aplicar Filtros** (1 min)
   - Toca "Área ▼" → Selecciona "Campus Central"
   - Toca "Slot ▼" → Selecciona "A (08:10-09:40)"
   - Toca "Tipo ▼" → Selecciona "Sala"
   - Ver cómo se filtran los resultados

### 4. **Crear Reserva** (1 min)
   - Selecciona cualquier espacio
   - Toca **[Reservar →]**
   - Toca **[CONFIRMAR RESERVA]**
   - Ver mensaje de éxito: ✅ "¡Reserva creada exitosamente!"

### 5. **Ver Historial** (1 min)
   - Navega a la pestaña "Historial"
   - Verifica que aparezca la reserva que acabas de crear
   - Muestra: Espacio, fecha, estado

---

## 🧪 Casos de Uso para Demostrar

### Caso 1: Usuario nuevo
```
1. Login con Google
2. Ve todas las 9 reservas disponibles
3. Filtra por "Campus Central" → 4 espacios
4. Crea una reserva
5. Ve su reserva en Historial
```

### Caso 2: Búsqueda inteligente
```
1. Necesito un laboratorio en la mañana
2. Filtro: Tipo = "Laboratorio"
3. Filtro: Slot = "A" (08:10-09:40)
4. Se muestran solo laboratorios en esa franja
5. Selecciona "Laboratorio de Informática"
6. Crea la reserva
```

### Caso 3: Gestión de reservas
```
1. Ve el Historial
2. Verifica todas tus reservas creadas
3. Cada una muestra: espacio, fecha, estado
```

---

## 🔍 Qué Verificar

| Feature | Cómo Probar | Resultado Esperado |
|---------|------------|-------------------|
| **Login** | Toca botón de Google | Redirige a Google, luego abre la app |
| **Cargar datos** | Al abrir app | Ve 9 espacios en ~2 segundos |
| **Filtros** | Aplica cada filtro | Se actualiza la lista en tiempo real |
| **Crear reserva** | Selecciona espacio → Confirma | ✅ Mensaje de éxito |
| **Historial** | Navega a pestaña | Muestra reservas creadas |
| **Backend** | Abre http://localhost:3000 | Responde con {"message":"Hello"} |

---

## 🆘 Problemas Comunes

### "Network request failed"
**Solución:** Verifica que la IP sea correcta
```bash
ipconfig | findstr "IPv4"  # Obtén tu IP
set EXPO_PUBLIC_API_URL=http://YOUR_IP:3000  # Úsala aquí
```

### "Port 3000 already in use"
**Solución:** Mata el proceso
```bash
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### "Can't connect to PostgreSQL"
**Solución:** Verifica Docker
```bash
docker ps | findstr db  # Debe mostrar el contenedor
docker logs ecin_ucn-reserveproject-db-1  # Revisa los logs
```

---

## 📊 Datos Precargados

9 espacios de ejemplo en la BD (tabla `reservations`):

```
1. Sala A           - Campus Central - Franja A
2. Sala B           - Campus Central - Franja B
3. Aula Multimedia  - Edificio 2      - Franja C
4. Sala Individual  - Biblioteca      - Franja D
5. Sala C           - Campus Central  - Franja E
6. Sala D           - Campus Central  - Franja F
7. Lab Informática  - Edificio 3      - Franja G
8. Biblioteca Norte - Biblioteca      - Franja H
9. Lab Creativo     - Edificio 4      - Franja A
```

Todos disponibles para el 2026-05-06

---

## 💡 Tips para la Demo

✅ **Prepara con anticipación:**
- Verifica que Docker esté corriendo
- Comprueba que tengas npm/Node.js
- Ten Expo Go instalado

✅ **Durante la demo:**
- Muestra primero los datos cargados (9 espacios)
- Demuestra cada filtro por separado
- Crea 1-2 reservas
- Muestra el Historial

✅ **Mejora la presentación:**
- Maximiza la fuente en la terminal
- Usa un simulador/dispositivo conectado a proyector
- Ten la documentación lista para preguntas

---

## 🎯 Estructura del Proyecto

```
ECIN_UCN-ReserveProject/
├── backend/               # NestJS + TypeORM
│   ├── src/
│   │   ├── reservations/  # Lógica de reservas
│   │   ├── auth/          # Autenticación OAuth2
│   │   └── users/         # Gestión de usuarios
│   └── package.json
│
├── movil/                 # React Native + Expo
│   ├── src/
│   │   ├── screens/       # Pantallas (Login, Reservas, Historial)
│   │   ├── services/      # API client
│   │   └── contexts/      # AuthContext
│   └── package.json
│
├── docker-compose.yml     # PostgreSQL + pgAdmin
└── DEMO.md               # Esta guía completa
```

---

## 📞 Contacto / Preguntas

Si hay algún problema:
1. Revisa los logs de cada servicio
2. Verifica que Docker esté corriendo
3. Asegúrate de que Node.js está instalado
4. Prueba a limpiar y reinstalar dependencias:
   ```bash
   rm -r node_modules
   npm install
   ```

---

**¡Listo para mostrar el proyecto! 🎉**
