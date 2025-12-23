-- ================================================================
-- CLEANUP: Remove Automatic Document Numbering Functions
-- ================================================================
-- Since we've reverted to manual invoice number entry,
-- these database functions are no longer needed
-- ================================================================

-- Drop the automatic numbering functions
DROP FUNCTION IF EXISTS public.preview_next_document_number(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.preview_next_document_number(uuid, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.preview_next_document_number(uuid, varchar, varchar) CASCADE;

DROP FUNCTION IF EXISTS public.get_next_document_number(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_next_document_number(uuid, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.get_next_document_number(uuid, varchar, varchar) CASCADE;

-- Verify they're removed
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE proname IN ('preview_next_document_number', 'get_next_document_number')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Should return 0 rows (no functions found)
