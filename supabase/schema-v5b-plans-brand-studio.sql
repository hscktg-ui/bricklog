-- Extend subscription plans: free | brand | studio (legacy `pro` = studio in app)
alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_plan_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_plan_check
  check (plan in ('free', 'brand', 'studio', 'pro'));
