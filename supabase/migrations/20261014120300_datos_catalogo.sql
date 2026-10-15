-- =====================================================================
-- Treeve · [S1] TEC-02 · Migración 4/4 · Datos de referencia (catálogos)
-- Los catálogos son parte del esquema funcional, por eso van versionados.
-- =====================================================================
insert into public.emociones (codigo, nombre, descripcion) values
  ('alegria',  'Alegría',  'Me siento contento/a y con energía.'),
  ('tristeza', 'Tristeza', 'Me siento decaído/a o con ganas de llorar.'),
  ('ansiedad', 'Ansiedad', 'Siento inquietud o preocupación constante.'),
  ('enojo',    'Enojo',    'Siento rabia o frustración.'),
  ('miedo',    'Miedo',    'Siento temor ante algo que ocurre o podría ocurrir.'),
  ('calma',    'Calma',    'Me siento en paz y tranquilo/a.'),
  ('soledad',  'Soledad',  'Siento que no tengo con quién compartir lo que siento.'),
  ('estres',   'Estrés',   'Siento que las exigencias me superan.')
on conflict (codigo) do nothing;

insert into public.mensaje_apoyo (emocion_id, texto)
select e.id, m.texto
from (values
  ('alegria',  'Qué bueno que lo compartas. Date un momento para disfrutarlo.'),
  ('tristeza', 'Sentir tristeza es válido. Gracias por escribirlo; no tienes que cargarlo solo/a.'),
  ('ansiedad', 'Respira despacio. Estás poniendo en palabras lo que sientes, y eso ya es un paso.'),
  ('enojo',    'Tu enojo tiene un porqué. Soltarlo aquí es una forma segura de darle espacio.'),
  ('miedo',    'Es normal sentir miedo. Estás haciendo algo valiente al expresarlo.'),
  ('calma',    'Disfruta esta calma; también es parte de tu proceso.'),
  ('soledad',  'Aquí tus palabras tienen un lugar. Quizá hoy sea buen día para escribirle a alguien de confianza.'),
  ('estres',   'Una cosa a la vez. Escribirlo ayuda a ordenar lo que pesa.')
) as m (codigo, texto)
join public.emociones e on e.codigo = m.codigo
where not exists (select 1 from public.mensaje_apoyo x where x.emocion_id = e.id and x.texto = m.texto);
