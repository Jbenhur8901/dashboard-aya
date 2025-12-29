-- Function PostgreSQL pour le suivi des codes promo
-- Cette fonction agrège les souscriptions par code promo et calcule les statistiques

CREATE OR REPLACE FUNCTION get_promo_code_tracking()
RETURNS TABLE (
  code_promo TEXT,
  subscription_count BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.codepromo, 'Sans code') as code_promo,
    COUNT(s.id) as subscription_count,
    COALESCE(SUM(s.prime_ttc), 0) as total_revenue
  FROM souscriptions s
  WHERE s.status = 'valide'  -- Seulement les souscriptions validées
  GROUP BY s.codepromo
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Pour utiliser cette fonction dans Supabase, exécutez ce SQL dans l'éditeur SQL de Supabase
-- Ensuite, vous pourrez l'appeler avec: supabase.rpc('get_promo_code_tracking')
