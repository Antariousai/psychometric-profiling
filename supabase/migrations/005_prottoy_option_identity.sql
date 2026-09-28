-- True/false items all use option ids affirm/deny (SPEC §7.3).
-- Those ids are unique per item, not across the bank.
ALTER TABLE public.prottoy_options DROP CONSTRAINT IF EXISTS prottoy_options_pkey;
ALTER TABLE public.prottoy_options ADD PRIMARY KEY (item_id, id);
