-- Los proyectos nuevos de Supabase ya no conceden permisos automáticos sobre las tablas
-- creadas por SQL. Solo el servidor (rol service_role, clave secreta) accede a los datos;
-- anon y authenticated no tienen permisos y además RLS está activado sin políticas.

grant usage on schema public to service_role;
grant select, insert, update, delete on public.analyses, public.episodes, public.usage_events to service_role;
grant execute on function public.increment_plays(text) to service_role;

revoke all on public.analyses, public.episodes, public.usage_events from anon, authenticated;
revoke execute on function public.increment_plays(text) from public, anon, authenticated;
