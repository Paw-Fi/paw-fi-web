SELECT u.email, u.full_name
FROM public.users AS u
WHERE u.email NOT LIKE 'gpt-%@guest.moneko'
ORDER BY u.created_at;