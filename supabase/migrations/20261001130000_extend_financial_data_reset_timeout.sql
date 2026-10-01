-- Give the public reset RPC a bounded execution budget without changing role defaults.
alter function public.reset_user_financial_data()
  set statement_timeout = '30s';

notify pgrst, 'reload schema';
