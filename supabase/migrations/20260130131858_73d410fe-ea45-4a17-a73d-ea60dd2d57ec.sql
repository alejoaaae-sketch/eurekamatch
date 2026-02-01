-- Add CHECK constraints for input validation on picks table

-- Length constraint for picked_name (1-100 characters)
ALTER TABLE public.picks 
ADD CONSTRAINT valid_picked_name_length 
CHECK (length(picked_name) >= 1 AND length(picked_name) <= 100);

-- Length constraint for picked_identifier (3-100 characters)
ALTER TABLE public.picks 
ADD CONSTRAINT valid_picked_identifier_length 
CHECK (length(picked_identifier) >= 3 AND length(picked_identifier) <= 100);

-- Phone format validation (8-20 chars when identifier_type is 'phone')
ALTER TABLE public.picks 
ADD CONSTRAINT valid_phone_identifier 
CHECK (identifier_type != 'phone' OR (length(picked_identifier) >= 8 AND length(picked_identifier) <= 20));