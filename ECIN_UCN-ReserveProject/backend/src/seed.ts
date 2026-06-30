import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User, UserRole } from './users/entities/user.entity';
import { Space, SpaceType } from './spaces/entities/space.entity';
import { Reservation, ReservationStatus } from './reservations/entities/reservation.entity';
import { SpaceBlock } from './reservations/entities/space-block.entity';
import { BlockConfig } from './reservations/entities/block-config.entity';
import { AdminSetting } from './reservations/entities/admin-setting.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('Iniciando el sembrado de la base de datos...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  console.log('Limpiando base de datos anterior...');
  // Limpiamos todas las tablas en orden para evitar conflictos de claves foráneas
  await queryRunner.query('TRUNCATE TABLE reservations, space_blocks, user_penalties, user_warnings, spaces, users, block_configs, admin_settings CASCADE;');

  // Repositorios
  const userRepository = dataSource.getRepository(User);
  const spaceRepository = dataSource.getRepository(Space);
  const blockConfigRepository = dataSource.getRepository(BlockConfig);
  const adminSettingRepository = dataSource.getRepository(AdminSetting);
  const reservationRepository = dataSource.getRepository(Reservation);
  const spaceBlockRepository = dataSource.getRepository(SpaceBlock);

  // 1. Crear Ajustes Administrativos (AdminSettings)
  console.log('Sembrando configuraciones administrativas...');
  const settings = [
    { key: 'confirm_deadline_days', value: '1' },
    { key: 'max_warnings', value: '3' },
    { key: 'cancel_deadline_days', value: '1' }
  ];
  await adminSettingRepository.save(settings);

  // 2. Crear Configuración de Divisiones de Bloques (BlockConfig)
  console.log('Sembrando configuraciones de bloques...');
  const configs = [
    { effectiveDate: '2026-01-01', divisions: 1 }, // 1 división = Bloques normales de 90 min (A, B, C, C2, D, E, F)
    { effectiveDate: '2026-06-01', divisions: 2 }, // 2 divisiones = Sub-bloques de 45 min
  ];
  await blockConfigRepository.save(configs);

  // 3. Crear Usuarios Iniciales (Admin y Usuarios regulares)
  console.log('Sembrando usuarios de prueba...');
  const adminUser = userRepository.create({
    email: 'admin@ucn.cl',
    firstName: 'Administrador',
    lastName: 'Sistema',
    role: UserRole.ADMIN,
    picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'
  });
  
  const regularUser1 = userRepository.create({
    email: 'juan.perez@alumnos.ucn.cl',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: UserRole.USER,
    picture: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150'
  });

  const regularUser2 = userRepository.create({
    email: 'maria.gomez@alumnos.ucn.cl',
    firstName: 'María',
    lastName: 'Gómez',
    role: UserRole.USER,
    picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150'
  });

  const savedAdmin = await userRepository.save(adminUser);
  const savedUser1 = await userRepository.save(regularUser1);
  const savedUser2 = await userRepository.save(regularUser2);

  // 4. Crear Espacios (Salas de estudio y Mesas de trabajo)
  console.log('Sembrando espacios...');
  const spacesData = [
    // Salas
    { name: 'Sala de Estudio 101', zone: 'Biblioteca - Piso 1', type: SpaceType.ROOM, capacity: 6, description: 'Sala de estudio grupal equipada con pizarra acrílica, TV de 50 pulgadas y puertos HDMI.', imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80', isActive: true },
    { name: 'Sala de Estudio 102', zone: 'Biblioteca - Piso 1', type: SpaceType.ROOM, capacity: 4, description: 'Sala ideal para estudio grupal silencioso, equipada con mesa redonda y enchufes.', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80', isActive: true },
    { name: 'Sala de Reuniones A', zone: 'Pabellón K', type: SpaceType.ROOM, capacity: 10, description: 'Sala de reuniones formal para proyectos de investigación. Cuenta con pizarra acrílica y proyector de alta definición.', imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=800&q=80', isActive: true },
    
    // Mesas
    { name: 'Mesa de Trabajo A1', zone: 'Biblioteca - Central', type: SpaceType.TABLE, capacity: 4, description: 'Mesa abierta con iluminación dedicada y 4 conexiones eléctricas y USB independientes.', imageUrl: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=800&q=80', isActive: true },
    { name: 'Mesa de Trabajo A2', zone: 'Biblioteca - Central', type: SpaceType.TABLE, capacity: 4, description: 'Mesa de trabajo compartida y abierta en el ala central de biblioteca.', imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80', isActive: true },
    { name: 'Mesa de Estudio B1', zone: 'Biblioteca - Piso 2', type: SpaceType.TABLE, capacity: 2, description: 'Mesa en el segundo piso, sector de absoluto silencio. Ideal para concentración.', imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80', isActive: true },
    { name: 'Módulo Individual Y1', zone: 'Pabellón Y', type: SpaceType.TABLE, capacity: 1, description: 'Cubículo individual diseñado para estudio y concentración personal.', imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80', isActive: true }
  ];

  const savedSpaces: Space[] = [];
  for (const s of spacesData) {
    const space = spaceRepository.create(s);
    savedSpaces.push(await spaceRepository.save(space));
  }

  // 5. Crear Reservas de Ejemplo (con fechas dinámicas relativas al día de hoy)
  console.log('Sembrando reservas de prueba...');
  const today = new Date();
  const formatToDateString = (d: Date) => d.toISOString().split('T')[0];
  
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(today.getDate() + 2);

  const reservations = [
    // 1. Reserva pasada completada
    {
      date: formatToDateString(yesterday),
      startTime: '08:10',
      endTime: '09:40',
      status: ReservationStatus.COMPLETED,
      space: savedSpaces[0], // Sala 101
      user: savedUser1
    },
    // 2. Reserva de hoy pendiente
    {
      date: formatToDateString(today),
      startTime: '09:55',
      endTime: '11:25',
      status: ReservationStatus.PENDING,
      space: savedSpaces[1], // Sala 102
      user: savedUser1
    },
    // 3. Reserva de mañana confirmada/activa
    {
      date: formatToDateString(tomorrow),
      startTime: '11:40',
      endTime: '13:10',
      status: ReservationStatus.ACTIVE,
      space: savedSpaces[3], // Mesa A1
      user: savedUser2
    },
    // 4. Reserva futura pendiente para el día siguiente
    {
      date: formatToDateString(dayAfterTomorrow),
      startTime: '14:30',
      endTime: '16:00',
      status: ReservationStatus.PENDING,
      space: savedSpaces[4], // Mesa A2
      user: savedUser1
    }
  ];

  for (const r of reservations) {
    const res = reservationRepository.create(r);
    await reservationRepository.save(res);
  }

  // 6. Crear un Bloqueo Administrativo (SpaceBlock) para la Sala de Reuniones A
  console.log('Sembrando bloqueos de espacio...');
  const block = spaceBlockRepository.create({
    space: savedSpaces[2], // Sala de Reuniones A
    startDate: formatToDateString(today),
    endDate: formatToDateString(tomorrow),
    startTime: '14:30',
    endTime: '19:30',
    reason: 'Mantenimiento del proyector multimedia y reemplazo de iluminación led'
  });
  await spaceBlockRepository.save(block);

  await queryRunner.release();
  console.log('¡Sembrado de base de datos finalizado exitosamente!');
  await app.close();
}

bootstrap().catch(err => {
  console.error('Error durante el sembrado de la base de datos:', err);
  process.exit(1);
});
