-- Insert sample reservation data
-- User ID: 8779dfd9-7e26-4d69-b0e8-7348ac68b572

INSERT INTO reservations ("id", "spaceTitle", "spaceDescription", "reservationDate", "reservationSlot", "area", "tipo", "space", "filtersApplied", "userId", "createdAt")
VALUES
-- Sala A
(
  gen_random_uuid(),
  'Sala A',
  'Capacidad 10. Proyector disponible. Acceso a mesas compartidas.',
  '2026-05-06',
  'A',
  'Edificio 1',
  'Sala',
  '{"id": "1", "title": "Sala A", "description": "Espacio principal para clases y reuniones medianas.", "area": "Edificio 1", "tipo": "Sala", "isSubspace": false}',
  '{"date": "2026-05-06", "slot": "A", "area": "Edificio 1", "tipo": "Sala"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
-- Sala B
(
  gen_random_uuid(),
  'Sala B',
  'Capacidad 6. Videoconferencia. Configuración básica editable.',
  '2026-05-06',
  'B',
  'Edificio 2',
  'Aula',
  '{"id": "2", "title": "Sala B", "description": "Espacio pensado para trabajo colaborativo y reuniones cortas.", "area": "Edificio 2", "tipo": "Aula", "isSubspace": false}',
  '{"date": "2026-05-06", "slot": "B", "area": "Edificio 2", "tipo": "Aula"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
-- Sala C
(
  gen_random_uuid(),
  'Sala C',
  'Capacidad 4. Sin equipamiento. Puede ampliarse con subespacios.',
  '2026-05-07',
  'D',
  'Edificio 1',
  'Sala',
  '{"id": "3", "title": "Sala C", "description": "Espacio sencillo para reuniones pequeñas.", "area": "Edificio 1", "tipo": "Sala", "isSubspace": false}',
  '{"date": "2026-05-07", "slot": "D", "area": "Edificio 1", "tipo": "Sala"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
-- Sala D
(
  gen_random_uuid(),
  'Sala D',
  'Capacidad 12. Laboratorio con área externa para mesas.',
  '2026-05-08',
  'E',
  'Edificio 3',
  'Laboratorio',
  '{"id": "4", "title": "Sala D", "description": "Laboratorio con posibilidad de reservar estaciones internas.", "area": "Edificio 3", "tipo": "Laboratorio", "isSubspace": false}',
  '{"date": "2026-05-08", "slot": "E", "area": "Edificio 3", "tipo": "Laboratorio"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
-- Biblioteca Norte
(
  gen_random_uuid(),
  'Biblioteca Norte',
  'Zona silenciosa con salas de estudio y cubículos reservables.',
  '2026-05-09',
  'F',
  'Biblioteca',
  'Zona de estudio',
  '{"id": "5", "title": "Biblioteca Norte", "description": "Espacio amplio con subáreas para estudio individual y grupal.", "area": "Biblioteca", "tipo": "Zona de estudio", "isSubspace": false}',
  '{"date": "2026-05-09", "slot": "F", "area": "Biblioteca", "tipo": "Zona de estudio"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
-- Laboratorio Creativo
(
  gen_random_uuid(),
  'Laboratorio Creativo',
  'Espacio de prototipado con estaciones internas y equipamiento compartido.',
  '2026-05-10',
  'C2',
  'Edificio 4',
  'Laboratorio',
  '{"id": "6", "title": "Laboratorio Creativo", "description": "Laboratorio con puestos reservables y una sala de apoyo.", "area": "Edificio 4", "tipo": "Laboratorio", "isSubspace": false}',
  '{"date": "2026-05-10", "slot": "C2", "area": "Edificio 4", "tipo": "Laboratorio"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
-- Additional variations for testing filters
(
  gen_random_uuid(),
  'Aula Multimedia A',
  'Equipada con pantalla grande y sistema de audio profesional.',
  '2026-05-06',
  'C',
  'Edificio 2',
  'Aula',
  '{"id": "7", "title": "Aula Multimedia A", "description": "Sala con tecnología audiovisual avanzada.", "area": "Edificio 2", "tipo": "Aula", "isSubspace": false}',
  '{"date": "2026-05-06", "slot": "C", "area": "Edificio 2", "tipo": "Aula"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
(
  gen_random_uuid(),
  'Sala Individual 1',
  'Pequeño espacio para trabajo individual sin interrupciones.',
  '2026-05-07',
  'B',
  'Edificio 1',
  'Sala',
  '{"id": "8", "title": "Sala Individual 1", "description": "Espacio tranquilo para concentración y trabajo personal.", "area": "Edificio 1", "tipo": "Sala", "isSubspace": false}',
  '{"date": "2026-05-07", "slot": "B", "area": "Edificio 1", "tipo": "Sala"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
),
(
  gen_random_uuid(),
  'Laboratorio de Informática',
  'Estaciones de trabajo con computadoras y software especializado.',
  '2026-05-09',
  'D',
  'Edificio 3',
  'Laboratorio',
  '{"id": "9", "title": "Laboratorio de Informática", "description": "Lab equipado con equipos de cómputo modernos.", "area": "Edificio 3", "tipo": "Laboratorio", "isSubspace": false}',
  '{"date": "2026-05-09", "slot": "D", "area": "Edificio 3", "tipo": "Laboratorio"}',
  '8779dfd9-7e26-4d69-b0e8-7348ac68b572',
  NOW()
);
