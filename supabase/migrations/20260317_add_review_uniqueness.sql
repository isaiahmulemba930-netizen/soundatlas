create unique index if not exists reviews_user_entity_unique_idx
on public.reviews (user_id, entity_type, entity_id);
