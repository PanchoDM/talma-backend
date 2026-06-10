-- PollaMundial2026 - Datos iniciales: 6 partidos reales del Mundial 2026
INSERT INTO partidos (equipo_local, equipo_visitante, fecha_partido, estado, apuestas_abiertas) VALUES
  ('Mexico',          'Sudafrica',           '2026-06-11 14:00:00', 'pendiente', TRUE),
  ('Corea del Sur',   'Republica Checa',     '2026-06-11 21:00:00', 'pendiente', TRUE),
  ('Canada',          'Bosnia y Herzegovina','2026-06-12 14:00:00', 'pendiente', TRUE),
  ('Estados Unidos',  'Paraguay',            '2026-06-12 20:00:00', 'pendiente', TRUE),
  ('Qatar',           'Suiza',               '2026-06-13 14:00:00', 'pendiente', TRUE),
  ('Brasil',          'Marruecos',           '2026-06-13 17:00:00', 'pendiente', TRUE)
ON CONFLICT DO NOTHING;
