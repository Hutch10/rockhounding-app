-- Sprint 1 cert blocker: RLS policies exist but anon/authenticated lack table SELECT grants.
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT SELECT ON public.location_materials TO anon, authenticated;
GRANT SELECT ON public.materials TO anon, authenticated;
GRANT SELECT ON public.location_rulesets TO anon, authenticated;
GRANT SELECT ON public.rulesets TO anon, authenticated;
