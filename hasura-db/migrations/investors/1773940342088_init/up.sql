\restrict hasura
SET transaction_timeout = 0;
SET check_function_bodies = false;
CREATE SCHEMA ai;
CREATE SCHEMA google_vacuum_mgmt;
CREATE SCHEMA propertyradar_agent;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';
CREATE EXTENSION IF NOT EXISTS cube WITH SCHEMA public;
COMMENT ON EXTENSION cube IS 'data type for multidimensional cubes';
CREATE EXTENSION IF NOT EXISTS earthdistance WITH SCHEMA public;
COMMENT ON EXTENSION earthdistance IS 'calculate great-circle distances on the surface of the Earth';
CREATE EXTENSION IF NOT EXISTS google_vacuum_mgmt WITH SCHEMA google_vacuum_mgmt;
COMMENT ON EXTENSION google_vacuum_mgmt IS 'extension for assistive operational tooling';
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';
CREATE TYPE public.enum_disposition_strategy_module_name AS ENUM (
    'lead',
    'deal'
);
CREATE TYPE public.enum_investors_investor_status AS ENUM (
    'WARM',
    'COLD'
);
CREATE TYPE public.enum_property_documents_document_type AS ENUM (
    'Lease Agreement',
    'Closing Statement (HUD, ALTA)',
    'Lien search',
    'Title commitment',
    'Estoppel Letter',
    'Rules & Regulations CCRRS',
    'Bylaws',
    'Declarations',
    'Mortgage Payoff',
    'Satisfaction Letters',
    'Lien Release(s)',
    'Foreclosure Notice',
    'Judgement Release',
    'Tax Payoff',
    'Memorandum payoff (If any)',
    'Deed',
    'Probate Results (If any)',
    'Survey',
    'Appraisal',
    'Pippin Title check',
    'NOCs & Release of NOCs'
);
CREATE TYPE public.enum_transaction_coordinator_files_document_type AS ENUM (
    'HOA Bylaws',
    'HOA CC''s & Rs',
    'ID',
    'Judgment Release',
    'Lease Agreement',
    'Bankruptcy Filing',
    'Closing Deed',
    'Closing Statement (HUD, ALTA)',
    'Lien search',
    'Title commitment',
    'Deed upon Death Transfer',
    'Death Certificate',
    'Divorce Decree',
    'Estoppel Letter',
    'Rules & Regulations CCRRS',
    'Bylaws',
    'Copy of the will',
    'Declarations',
    'Mortgage Payoff',
    'Pippin Title Check',
    'Title Check (Search Package)',
    'Probate Results',
    'Property Condition Disclosure',
    'Satisfaction Letters',
    'Lead Based Paint Disclosure',
    'Lien Release(s)',
    'Foreclosure Notice',
    'Judgement Release',
    'Tax Payoff',
    'Memorandum payoff (If any)',
    'Deed',
    'Probate Results (If any)',
    'Secondary Loan/Mtg Payoff',
    'Survey',
    'Appraisal',
    'Pippin Title check',
    'Lien Search',
    'Memorandum Payoff',
    'Mortgage Payoff Balance Statement',
    'NOCs & Release of NOCs',
    'Title Commitment',
    'Title Precheck (Search Package)',
    'Unclassified',
    'Purchase and Sale Agreement (PSA)',
    'Assignment of Contract',
    'Addendum',
    'Financing addendum',
    'EMD',
    'Non Tortious agreement',
    'Inspection Document',
    'Loan Quote'
);
CREATE TYPE public.mst_buybox_status_enum AS ENUM (
    'completed',
    'pre-buybox',
    'no-buybox'
);
CREATE TYPE public.mst_campaign_status_enum AS ENUM (
    'active',
    'paused',
    'completed',
    'draft'
);
CREATE TYPE public.mst_channel_type_enum AS ENUM (
    'email',
    'sms',
    'cold_calling',
    'social_media',
    'paid_media_facebook',
    'paid_media_google',
    'paid_media_reddit',
    'website',
    'il_campaigns',
    'custom'
);
CREATE TYPE public.mst_datasource_type_enum AS ENUM (
    'lead_provider',
    'crm',
    'property_data',
    'analytics',
    'data_enrichment',
    'custom'
);
CREATE TYPE public.mst_deal_status_enum AS ENUM (
    'active',
    'pending',
    'closed_won',
    'lost'
);
CREATE TYPE public.mst_investor_category_enum AS ENUM (
    'diamond',
    'platinum',
    'gold',
    'silver',
    'bronze'
);
CREATE TYPE public.mst_investor_status_enum AS ENUM (
    'warm',
    'cold',
    'active',
    'inactive'
);
CREATE TYPE public.mst_investor_type_enum AS ENUM (
    'fund',
    'mom-pop',
    'middle-market',
    'realtor',
    'other'
);
CREATE TYPE public.mst_market_type_enum AS ENUM (
    'state',
    'city',
    'msa',
    'national'
);
CREATE TYPE public.mst_offer_status_enum AS ENUM (
    'pending',
    'accepted',
    'rejected'
);
CREATE TYPE public.mst_sync_frequency_enum AS ENUM (
    'realtime',
    'hourly',
    'daily',
    'weekly'
);
CREATE TYPE public.property_investor_stats_row AS (
	total_investors integer,
	total_cold integer,
	total_warm integer,
	up_to_creation integer,
	cold_up_to_creation integer,
	warm_up_to_creation integer,
	after_creation integer,
	cold_after_creation integer,
	warm_after_creation integer
);
CREATE FUNCTION public.calculate_match_score(criteria jsonb, property jsonb) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    criterion jsonb;
    matched_count int := 0;
    total_count int := 0;
    val text;
    arr jsonb;
    i int;
BEGIN
    total_count := jsonb_array_length(criteria);
    FOR criterion IN SELECT * FROM jsonb_array_elements(criteria)
    LOOP
        val := property ->> (criterion->>'field_name');
        CASE criterion->>'operator'
            WHEN 'BETWEEN' THEN
                IF val::numeric BETWEEN (criterion->'value'->>0)::numeric 
                                    AND (criterion->'value'->>1)::numeric THEN
                    matched_count := matched_count + 1;
                END IF;
            WHEN '=' THEN
                IF val = (criterion->>'value') THEN
                    matched_count := matched_count + 1;
                END IF;
            WHEN '>=' THEN
                IF val::numeric >= (criterion->>'value')::numeric THEN
                    matched_count := matched_count + 1;
                END IF;
            WHEN '<=' THEN
                IF val::numeric <= (criterion->>'value')::numeric THEN
                    matched_count := matched_count + 1;
                END IF;
            WHEN 'IN' THEN
                arr := criterion->'value';
                IF jsonb_typeof(arr) = 'array' THEN
                    FOR i IN 0..jsonb_array_length(arr)-1 LOOP
                        IF val = arr->>i THEN
                            matched_count := matched_count + 1;
                            EXIT;
                        END IF;
                    END LOOP;
                ELSE
                    IF val = arr::text THEN
                        matched_count := matched_count + 1;
                    END IF;
                END IF;
        END CASE;
    END LOOP;
    IF total_count > 0 THEN
        RETURN matched_count::numeric / total_count;
    ELSE
        RETURN 0;
    END IF;
END;
$$;
CREATE FUNCTION public.calculate_match_score_state_only(p_buybox_criteria_jsonb jsonb, property_state text) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    score numeric := 0;
    total_criteria integer := 0;
    criterion RECORD;
    matches boolean;
BEGIN
    -- Loop through each criterion from the passed JSONB array
    FOR criterion IN SELECT * FROM jsonb_to_recordset(p_buybox_criteria_jsonb) as x(field_name text, operator text, value jsonb)
    LOOP
        -- We only care about the 'state' field
        IF criterion.field_name = 'state' THEN
            total_criteria := total_criteria + 1;
            matches := false;
            CASE criterion.operator
                WHEN 'IN' THEN
                    IF jsonb_typeof(criterion.value) = 'array' THEN
                        -- Check for the 'ALL' value specifically
                        IF criterion.value ? 'ALL' THEN
                            matches := true;
                        ELSE
                            matches := LOWER(TRIM(property_state)) = ANY(SELECT LOWER(TRIM(jsonb_array_elements_text(criterion.value))));
                        END IF;
                    END IF;
                WHEN '=' THEN
                    matches := LOWER(TRIM(property_state)) = LOWER(TRIM(criterion.value #>> '{}'));
                WHEN 'ILIKE' THEN
                    matches := property_state ILIKE '%' || (criterion.value #>> '{}') || '%';
                WHEN 'LIKE' THEN
                    matches := property_state LIKE '%' || (criterion.value #>> '{}') || '%';
            END CASE;
            IF matches THEN
                score := score + 1;
            END IF;
        END IF;
    END LOOP;
    -- Return the percentage score
    IF total_criteria > 0 THEN
        RETURN score / total_criteria;
    ELSE
        RETURN 0;
    END IF;
END;
$$;
CREATE FUNCTION public.deal_harmony_update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
CREATE FUNCTION public.get_buybox_analytics_for_investor(p_investor_id integer) RETURNS TABLE(total_matches bigint, viewed_matches bigint, saved_matches bigint, average_match_score numeric, top_cities jsonb, price_distribution jsonb)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE pmv.is_viewed = true) as viewed_matches,
        COUNT(*) FILTER (WHERE pmv.is_saved = true) as saved_matches,
        ROUND(AVG(pmv.match_score), 3) as average_match_score,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'city', city_stats.city,
                    'count', city_stats.count,
                    'averagePrice', city_stats.avg_price
                )
            )
            FROM (
                SELECT 
                    pmv2.city,
                    COUNT(*) as count,
                    ROUND(AVG(pmv2.price), 0) as avg_price
                FROM property_matches_view pmv2
                WHERE pmv2.investor_id = p_investor_id
                GROUP BY pmv2.city
                ORDER BY count DESC
                LIMIT 10
            ) city_stats
        ) as top_cities,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'range', price_ranges.range,
                    'count', price_ranges.count
                )
            )
            FROM (
                SELECT 
                    CASE 
                        WHEN pmv3.price < 100000 THEN 'Under $100K'
                        WHEN pmv3.price < 200000 THEN '$100K - $200K'
                        WHEN pmv3.price < 300000 THEN '$200K - $300K'
                        WHEN pmv3.price < 500000 THEN '$300K - $500K'
                        WHEN pmv3.price < 750000 THEN '$500K - $750K'
                        ELSE 'Over $750K'
                    END as range,
                    COUNT(*) as count
                FROM property_matches_view pmv3
                WHERE pmv3.investor_id = p_investor_id
                GROUP BY range
                ORDER BY 
                    CASE range
                        WHEN 'Under $100K' THEN 1
                        WHEN '$100K - $200K' THEN 2
                        WHEN '$200K - $300K' THEN 3
                        WHEN '$300K - $500K' THEN 4
                        WHEN '$500K - $750K' THEN 5
                        ELSE 6
                    END
            ) price_ranges
        ) as price_distribution
    FROM property_matches_view pmv
    WHERE pmv.investor_id = p_investor_id;
END;
$_$;
CREATE FUNCTION public.get_buybox_criteria_as_jsonb(p_buybox_id integer) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    criteria_array jsonb := '[]'::jsonb;
    criterion RECORD;
BEGIN
    FOR criterion IN 
        SELECT field_name, operator, value 
        FROM buybox_criteria 
        WHERE buybox_id = p_buybox_id
    LOOP
        criteria_array := criteria_array || jsonb_build_object(
            'fieldName', criterion.field_name,
            'operator', criterion.operator,
            'value', criterion.value
        );
    END LOOP;
    RETURN criteria_array;
END;
$$;
CREATE FUNCTION public.get_month_from_week(p_year integer, p_week integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN CEIL(p_week / 4.33)::INTEGER;
END;
$$;
CREATE TABLE public.property_investor_stats (
    total_investors bigint,
    total_cold bigint,
    total_warm bigint,
    up_to_creation bigint,
    cold_up_to_creation bigint,
    warm_up_to_creation bigint,
    after_creation bigint,
    cold_after_creation bigint,
    warm_after_creation bigint,
    contacted_investors bigint
);
CREATE FUNCTION public.get_property_investor_stats(p_property_id text, p_creation_date timestamp without time zone, p_current_date timestamp without time zone) RETURNS SETOF public.property_investor_stats
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT i.investor_id) AS total_investors,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.investor_status ILIKE 'cold')
      AS total_cold,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.investor_status ILIKE 'warm')
      AS total_warm,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.created_at <= p_creation_date)
      AS up_to_creation,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.created_at <= p_creation_date
              AND i.investor_status ILIKE 'cold')
      AS cold_up_to_creation,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.created_at <= p_creation_date
              AND i.investor_status ILIKE 'warm')
      AS warm_up_to_creation,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.created_at > p_creation_date
              AND i.created_at <= p_current_date)
      AS after_creation,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.created_at > p_creation_date
              AND i.created_at <= p_current_date
              AND i.investor_status ILIKE 'cold')
      AS cold_after_creation,
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE i.created_at > p_creation_date
              AND i.created_at <= p_current_date
              AND i.investor_status ILIKE 'warm')
      AS warm_after_creation,
    -- NUEVO: investors contactados (marketing.investor_contacted = 'Yes')
    COUNT(DISTINCT i.investor_id)
      FILTER (WHERE m.investor_contacted = 'Yes')
      AS contacted_investors
  FROM public.property_buybox_matches pm
  JOIN public.investors i ON pm.investor_id = i.investor_id
  LEFT JOIN public.marketing m ON m.investor_id = i.investor_id
  WHERE pm.property_id = p_property_id;
END;
$$;
CREATE FUNCTION public.get_property_matches_for_investor(p_investor_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id text, buybox_id integer, property_id text, match_score numeric, matched_at timestamp without time zone, is_viewed boolean, is_saved boolean, property jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.buybox_id,
        pm.property_id,
        pm.match_score,
        pm.matched_at,
        pm.is_viewed,
        pm.is_saved,
        pm.property
    FROM property_matches pm
    WHERE pm.investor_id = p_investor_id
    ORDER BY pm.match_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
CREATE FUNCTION public.get_quarter_from_week(p_week integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN CEIL(p_week / 13.0)::INTEGER;
END;
$$;
CREATE FUNCTION public.log_stage_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO mst_sellers_stage_history (
      pipeline_id,
      old_stage,
      new_stage,
      changed_at
    )
    VALUES (
      OLD.id,
      OLD.stage,
      NEW.stage,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.pipeline_from_property() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO mst_sellers_properties_pipeline (property_radar_id)
  VALUES (NEW.id)
  ON CONFLICT (property_radar_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.pipeline_from_skip_tracing() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_property_id BIGINT;
BEGIN
  SELECT pr.id
  INTO v_property_id
  FROM mst_properties_property_radar pr
  WHERE
    upper(trim(pr.address)) = upper(trim(NEW.address))
    AND upper(trim(pr.city)) = upper(trim(NEW.city))
    AND upper(pr.state::text) = upper(NEW.state::text)
    AND pr.zip_five = NEW.zip_five::bpchar
  LIMIT 1;
  IF v_property_id IS NOT NULL THEN
    INSERT INTO mst_sellers_properties_pipeline (
      property_radar_id,
      skip_tracing_id,
      updated_at
    )
    VALUES (
      v_property_id,
      NEW.id,
      now()
    )
    ON CONFLICT (property_radar_id)
    DO UPDATE SET
      skip_tracing_id = EXCLUDED.skip_tracing_id,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.refresh_property_matches_for_investor(p_investor_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    r RECORD;
BEGIN
    DELETE FROM property_matches WHERE investor_id = p_investor_id;
    FOR r IN
        SELECT 
            bb.id AS buybox_id,
            bb.investor_id,
            p.id AS property_id,
            calculate_match_score(
                bb.id,
                p.price,
                p.bedrooms,
                p.bathrooms,
                p.sqft,
                p.property_type,
                p.city,
                p.state,
                p.zip_code,
                p.cap_rate,
                p.monthly_rent,
                p.year_built
            ) AS match_score,
            p.*
        FROM properties p
        JOIN LATERAL (
            SELECT bb.*
            FROM buyboxes bb
            WHERE bb.investor_id = p_investor_id
              AND bb.is_active = true
              AND EXISTS (
                SELECT 1 FROM buybox_criteria bc
                WHERE bc.buybox_id = bb.id
                  AND bc.field_name IN ('city', 'state', 'zip_code')
                  AND (
                    (bc.field_name = 'city' AND p.city = ANY(SELECT jsonb_array_elements_text(bc.value)))
                    OR (bc.field_name = 'state' AND p.state = ANY(SELECT jsonb_array_elements_text(bc.value)))
                    OR (bc.field_name = 'zip_code' AND p.zip_code = ANY(SELECT jsonb_array_elements_text(bc.value)))
                  )
              )
        ) bb ON true
        WHERE p.listing_status = 'active'
    LOOP
        IF r.match_score > 0.3 THEN
            INSERT INTO property_matches (
                id,
                buybox_id,
                investor_id,
                property_id,
                match_score,
                matched_at,
                is_viewed,
                is_saved,
                property
            ) VALUES (
                CONCAT('match_', r.buybox_id, '_', r.property_id),
                r.buybox_id,
                r.investor_id,
                r.property_id,
                r.match_score,
                NOW(),
                FALSE,
                FALSE,
                jsonb_build_object(
                    'id', r.property_id,
                    'address', r.address,
                    'city', r.city,
                    'state', r.state,
                    'zipCode', r.zip_code,
                    'price', r.price,
                    'bedrooms', r.bedrooms,
                    'bathrooms', r.bathrooms,
                    'sqft', r.sqft,
                    'propertyType', r.property_type,
                    'yearBuilt', r.year_built,
                    'capRate', r.cap_rate,
                    'monthlyRent', r.monthly_rent,
                    'listingStatus', r.listing_status,
                    'createdAt', r.created_at,
                    'updatedAt', r.updated_at
                )
            );
        END IF;
    END LOOP;
END;
$$;
CREATE FUNCTION public.set_analyze_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Calculate the next analyze_version based on how many rows exist for this property_id
  SELECT COALESCE(MAX(analyze_version), 0) + 1
  INTO NEW.analyze_version
  FROM public.transaction_coordinator_analysis
  WHERE property_id = NEW.property_id;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.set_updated_at_properties() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_expense_tool_mappings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_expenses_paid_media_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_expenses_per_deal_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_modified_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (NEW != OLD) THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$;
CREATE FUNCTION public.update_skip_trace_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$;
CREATE TABLE ai.agno_component_configs (
    component_id character varying NOT NULL,
    version integer NOT NULL,
    label character varying,
    stage character varying NOT NULL,
    config jsonb NOT NULL,
    notes text,
    created_at bigint NOT NULL,
    updated_at bigint,
    deleted_at bigint
);
CREATE TABLE ai.agno_component_links (
    parent_component_id character varying NOT NULL,
    parent_version integer NOT NULL,
    link_kind character varying NOT NULL,
    link_key character varying NOT NULL,
    child_component_id character varying NOT NULL,
    child_version integer,
    "position" integer NOT NULL,
    meta jsonb,
    created_at bigint,
    updated_at bigint
);
CREATE TABLE ai.agno_components (
    component_id character varying NOT NULL,
    component_type character varying NOT NULL,
    name character varying,
    description text,
    current_version integer,
    metadata jsonb,
    created_at bigint NOT NULL,
    updated_at bigint,
    deleted_at bigint
);
CREATE TABLE ai.agno_eval_runs (
    run_id character varying NOT NULL,
    eval_type character varying NOT NULL,
    eval_data jsonb NOT NULL,
    eval_input jsonb NOT NULL,
    name character varying,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    model_id character varying,
    model_provider character varying,
    evaluated_component_name character varying,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE ai.agno_knowledge (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    type character varying,
    size bigint,
    linked_to character varying,
    access_count bigint,
    status character varying,
    status_message text,
    created_at bigint,
    updated_at bigint,
    external_id character varying
);
CREATE TABLE ai.agno_learnings (
    learning_id character varying NOT NULL,
    learning_type character varying NOT NULL,
    namespace character varying,
    user_id character varying,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    session_id character varying,
    entity_id character varying,
    entity_type character varying,
    content jsonb NOT NULL,
    metadata jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE ai.agno_memories (
    memory_id character varying NOT NULL,
    memory jsonb NOT NULL,
    feedback text,
    input text,
    agent_id character varying,
    team_id character varying,
    user_id character varying,
    topics jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE ai.agno_metrics (
    id character varying NOT NULL,
    agent_runs_count bigint NOT NULL,
    team_runs_count bigint NOT NULL,
    workflow_runs_count bigint NOT NULL,
    agent_sessions_count bigint NOT NULL,
    team_sessions_count bigint NOT NULL,
    workflow_sessions_count bigint NOT NULL,
    users_count bigint NOT NULL,
    token_metrics jsonb NOT NULL,
    model_metrics jsonb NOT NULL,
    date date NOT NULL,
    aggregation_period character varying NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint,
    completed boolean NOT NULL
);
CREATE TABLE ai.agno_schema_versions (
    table_name character varying NOT NULL,
    version character varying NOT NULL,
    created_at character varying NOT NULL,
    updated_at character varying
);
CREATE TABLE ai.agno_sessions (
    session_id character varying NOT NULL,
    session_type character varying NOT NULL,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    user_id character varying,
    session_data jsonb,
    agent_data jsonb,
    team_data jsonb,
    workflow_data jsonb,
    metadata jsonb,
    runs jsonb,
    summary jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE propertyradar_agent.agno_component_configs (
    component_id character varying NOT NULL,
    version integer NOT NULL,
    label character varying,
    stage character varying NOT NULL,
    config jsonb NOT NULL,
    notes text,
    created_at bigint NOT NULL,
    updated_at bigint,
    deleted_at bigint
);
CREATE TABLE propertyradar_agent.agno_component_links (
    parent_component_id character varying NOT NULL,
    parent_version integer NOT NULL,
    link_kind character varying NOT NULL,
    link_key character varying NOT NULL,
    child_component_id character varying NOT NULL,
    child_version integer,
    "position" integer NOT NULL,
    meta jsonb,
    created_at bigint,
    updated_at bigint
);
CREATE TABLE propertyradar_agent.agno_components (
    component_id character varying NOT NULL,
    component_type character varying NOT NULL,
    name character varying,
    description text,
    current_version integer,
    metadata jsonb,
    created_at bigint NOT NULL,
    updated_at bigint,
    deleted_at bigint
);
CREATE TABLE propertyradar_agent.agno_eval_runs (
    run_id character varying NOT NULL,
    eval_type character varying NOT NULL,
    eval_data jsonb NOT NULL,
    eval_input jsonb NOT NULL,
    name character varying,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    model_id character varying,
    model_provider character varying,
    evaluated_component_name character varying,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE propertyradar_agent.agno_knowledge (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    type character varying,
    size bigint,
    linked_to character varying,
    access_count bigint,
    status character varying,
    status_message text,
    created_at bigint,
    updated_at bigint,
    external_id character varying
);
CREATE TABLE propertyradar_agent.agno_learnings (
    learning_id character varying NOT NULL,
    learning_type character varying NOT NULL,
    namespace character varying,
    user_id character varying,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    session_id character varying,
    entity_id character varying,
    entity_type character varying,
    content jsonb NOT NULL,
    metadata jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE propertyradar_agent.agno_memories (
    memory_id character varying NOT NULL,
    memory jsonb NOT NULL,
    feedback text,
    input text,
    agent_id character varying,
    team_id character varying,
    user_id character varying,
    topics jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE propertyradar_agent.agno_metrics (
    id character varying NOT NULL,
    agent_runs_count bigint NOT NULL,
    team_runs_count bigint NOT NULL,
    workflow_runs_count bigint NOT NULL,
    agent_sessions_count bigint NOT NULL,
    team_sessions_count bigint NOT NULL,
    workflow_sessions_count bigint NOT NULL,
    users_count bigint NOT NULL,
    token_metrics jsonb NOT NULL,
    model_metrics jsonb NOT NULL,
    date date NOT NULL,
    aggregation_period character varying NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint,
    completed boolean NOT NULL
);
CREATE TABLE propertyradar_agent.agno_schema_versions (
    table_name character varying NOT NULL,
    version character varying NOT NULL,
    created_at character varying NOT NULL,
    updated_at character varying
);
CREATE TABLE propertyradar_agent.agno_sessions (
    session_id character varying NOT NULL,
    session_type character varying NOT NULL,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    user_id character varying,
    session_data jsonb,
    agent_data jsonb,
    team_data jsonb,
    workflow_data jsonb,
    metadata jsonb,
    runs jsonb,
    summary jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE public.agno_approvals (
    id character varying NOT NULL,
    run_id character varying NOT NULL,
    session_id character varying NOT NULL,
    status character varying NOT NULL,
    source_type character varying NOT NULL,
    approval_type character varying,
    pause_type character varying NOT NULL,
    tool_name character varying,
    tool_args jsonb,
    expires_at bigint,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    user_id character varying,
    schedule_id character varying,
    schedule_run_id character varying,
    source_name character varying,
    requirements jsonb,
    context jsonb,
    resolution_data jsonb,
    resolved_by character varying,
    resolved_at bigint,
    created_at bigint NOT NULL,
    updated_at bigint,
    run_status character varying
);
CREATE TABLE public.agno_component_configs (
    component_id character varying NOT NULL,
    version integer NOT NULL,
    label character varying,
    stage character varying NOT NULL,
    config jsonb NOT NULL,
    notes text,
    created_at bigint NOT NULL,
    updated_at bigint,
    deleted_at bigint
);
CREATE TABLE public.agno_component_links (
    parent_component_id character varying NOT NULL,
    parent_version integer NOT NULL,
    link_kind character varying NOT NULL,
    link_key character varying NOT NULL,
    child_component_id character varying NOT NULL,
    child_version integer,
    "position" integer NOT NULL,
    meta jsonb,
    created_at bigint,
    updated_at bigint
);
CREATE TABLE public.agno_components (
    component_id character varying NOT NULL,
    component_type character varying NOT NULL,
    name character varying,
    description text,
    current_version integer,
    metadata jsonb,
    created_at bigint NOT NULL,
    updated_at bigint,
    deleted_at bigint
);
CREATE TABLE public.agno_eval_runs (
    run_id character varying NOT NULL,
    eval_type character varying NOT NULL,
    eval_data jsonb NOT NULL,
    eval_input jsonb NOT NULL,
    name character varying,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    model_id character varying,
    model_provider character varying,
    evaluated_component_name character varying,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE public.agno_knowledge (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    type character varying,
    size bigint,
    linked_to character varying,
    access_count bigint,
    status character varying,
    status_message text,
    created_at bigint,
    updated_at bigint,
    external_id character varying
);
CREATE TABLE public.agno_learnings (
    learning_id character varying NOT NULL,
    learning_type character varying NOT NULL,
    namespace character varying,
    user_id character varying,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    session_id character varying,
    entity_id character varying,
    entity_type character varying,
    content jsonb NOT NULL,
    metadata jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE public.agno_memories (
    memory_id character varying NOT NULL,
    memory jsonb NOT NULL,
    feedback text,
    input text,
    agent_id character varying,
    team_id character varying,
    user_id character varying,
    topics jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE public.agno_metrics (
    id character varying NOT NULL,
    agent_runs_count bigint NOT NULL,
    team_runs_count bigint NOT NULL,
    workflow_runs_count bigint NOT NULL,
    agent_sessions_count bigint NOT NULL,
    team_sessions_count bigint NOT NULL,
    workflow_sessions_count bigint NOT NULL,
    users_count bigint NOT NULL,
    token_metrics jsonb NOT NULL,
    model_metrics jsonb NOT NULL,
    date date NOT NULL,
    aggregation_period character varying NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint,
    completed boolean NOT NULL
);
CREATE TABLE public.agno_schedule_runs (
    id character varying NOT NULL,
    schedule_id character varying NOT NULL,
    attempt bigint NOT NULL,
    triggered_at bigint,
    completed_at bigint,
    status character varying NOT NULL,
    status_code bigint,
    run_id character varying,
    session_id character varying,
    error text,
    input jsonb,
    output jsonb,
    requirements jsonb,
    created_at bigint NOT NULL
);
CREATE TABLE public.agno_schedules (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    method character varying NOT NULL,
    endpoint character varying NOT NULL,
    payload jsonb,
    cron_expr character varying NOT NULL,
    timezone character varying NOT NULL,
    timeout_seconds bigint NOT NULL,
    max_retries bigint NOT NULL,
    retry_delay_seconds bigint NOT NULL,
    enabled boolean NOT NULL,
    next_run_at bigint,
    locked_by character varying,
    locked_at bigint,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE public.agno_schema_versions (
    table_name character varying NOT NULL,
    version character varying NOT NULL,
    created_at character varying NOT NULL,
    updated_at character varying
);
CREATE TABLE public.agno_sessions (
    session_id character varying NOT NULL,
    session_type character varying NOT NULL,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    user_id character varying,
    session_data jsonb,
    agent_data jsonb,
    team_data jsonb,
    workflow_data jsonb,
    metadata jsonb,
    runs jsonb,
    summary jsonb,
    created_at bigint NOT NULL,
    updated_at bigint
);
CREATE TABLE public.agno_spans (
    span_id character varying NOT NULL,
    trace_id character varying NOT NULL,
    parent_span_id character varying,
    name character varying NOT NULL,
    span_kind character varying NOT NULL,
    status_code character varying NOT NULL,
    status_message text,
    start_time character varying NOT NULL,
    end_time character varying NOT NULL,
    duration_ms bigint NOT NULL,
    attributes jsonb,
    created_at character varying NOT NULL
);
CREATE TABLE public.agno_traces (
    trace_id character varying NOT NULL,
    name character varying NOT NULL,
    status character varying NOT NULL,
    start_time character varying NOT NULL,
    end_time character varying NOT NULL,
    duration_ms bigint NOT NULL,
    run_id character varying,
    session_id character varying,
    user_id character varying,
    agent_id character varying,
    team_id character varying,
    workflow_id character varying,
    created_at character varying NOT NULL
);
CREATE TABLE public.buybox_criteria (
    id integer NOT NULL,
    buybox_id integer NOT NULL,
    field_name text NOT NULL,
    operator text NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);
CREATE SEQUENCE public.buybox_criteria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.buybox_criteria_id_seq OWNED BY public.buybox_criteria.id;
CREATE TABLE public.buyboxes (
    id integer NOT NULL,
    investor_id integer NOT NULL,
    name text DEFAULT 'My Buy Box'::text NOT NULL,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    buybox_type character varying(50) DEFAULT 'AUTO'::character varying,
    buybox_source character varying(50) DEFAULT 'MANUAL'::character varying
);
CREATE SEQUENCE public.buyboxes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.buyboxes_id_seq OWNED BY public.buyboxes.id;
CREATE TABLE public.condition_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(20) NOT NULL,
    description text,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.crm_ac_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.crm_activities (
    id integer NOT NULL,
    property_id text,
    lead_id text,
    activity_type_id integer,
    notes text,
    due_date timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.crm_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_activities_id_seq OWNED BY public.crm_activities.id;
CREATE TABLE public.crm_activity_types (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_activity_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_activity_types_id_seq OWNED BY public.crm_activity_types.id;
CREATE TABLE public.crm_calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    title character varying(255),
    description text,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    google_event_id text,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.crm_campaign_mediums (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_campaign_mediums_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_campaign_mediums_id_seq OWNED BY public.crm_campaign_mediums.id;
CREATE TABLE public.crm_campaign_sources (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_campaign_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_campaign_sources_id_seq OWNED BY public.crm_campaign_sources.id;
CREATE TABLE public.crm_campaigns (
    id integer NOT NULL,
    name text,
    source_id integer,
    medium_id integer,
    created_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.crm_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_campaigns_id_seq OWNED BY public.crm_campaigns.id;
CREATE TABLE public.crm_deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_number integer NOT NULL,
    lead_id uuid NOT NULL,
    stage_id uuid,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    status_label character varying(100),
    view_on_marketplace boolean DEFAULT false,
    fill_info_status character varying(50),
    offer_value numeric(12,2),
    proposed_rent numeric(10,2),
    gross_cap_rate numeric(5,2),
    annual_taxes numeric(10,2),
    insurance_quote numeric(10,2),
    prepaid_rent_value numeric(12,2),
    price_vs_market_value numeric(5,2),
    desired_lease_period integer,
    prepaid_months integer,
    security_deposit numeric(10,2),
    s2r_estimated_market_value numeric(12,2),
    discount_to_market_pct numeric(5,2),
    psa_value numeric(12,2),
    s2r_rent_value numeric(10,2),
    market_type character varying(20),
    investor_score_crm integer,
    investor_score_sfr integer,
    investor_score_lift integer,
    investor_score_base integer,
    offer_presented_date date,
    offer_accepted_date date,
    psa_execution_date date,
    psa_expiration_date date,
    deal_launching_date date,
    contract_assigned_date date,
    inspection_period_exp_date date,
    emd_received_date date,
    estimated_closing_date date,
    actual_closing_date date,
    noc_recorded_date date,
    seller_advisor_id uuid,
    investor_advisor_id uuid,
    transaction_coordinator_id uuid,
    last_note text,
    days_in_current_stage integer DEFAULT 0,
    stage_entered_at timestamp with time zone DEFAULT now(),
    tags jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_deals_market_type_check CHECK (((market_type)::text = ANY ((ARRAY['Primary'::character varying, 'Secondary'::character varying, 'Tertiary'::character varying])::text[])))
);
CREATE SEQUENCE public.crm_deals_deal_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_deals_deal_number_seq OWNED BY public.crm_deals.deal_number;
CREATE TABLE public.crm_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    file_name character varying(255),
    file_url text,
    uploaded_by integer,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.crm_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    role_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    employee_code character varying(20),
    initials character varying(5),
    department character varying(50),
    manager_id uuid,
    monthly_goal integer DEFAULT 5,
    quarterly_goal integer DEFAULT 15,
    yearly_goal integer DEFAULT 60,
    hire_date date,
    is_active boolean DEFAULT true,
    google_calendar_id character varying(255),
    google_refresh_token text,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.crm_files (
    id integer NOT NULL,
    file_name text,
    file_url text,
    uploaded_by integer,
    created_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.crm_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_files_id_seq OWNED BY public.crm_files.id;
CREATE TABLE public.crm_foundation_types (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_foundation_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_foundation_types_id_seq OWNED BY public.crm_foundation_types.id;
CREATE TABLE public.crm_heating_types (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_heating_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_heating_types_id_seq OWNED BY public.crm_heating_types.id;
CREATE TABLE public.crm_lead_status (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_lead_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_lead_status_id_seq OWNED BY public.crm_lead_status.id;
CREATE TABLE public.crm_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_number integer NOT NULL,
    property_id text,
    stage_id uuid NOT NULL,
    previous_stage_id uuid,
    result character varying(20),
    pipeline_type character varying(20),
    is_hot boolean DEFAULT false,
    lead_score integer DEFAULT 0,
    seller_subscore integer DEFAULT 0,
    property_subscore integer DEFAULT 0,
    transaction_subscore integer DEFAULT 0,
    investor_subscore integer DEFAULT 0,
    lead_initial_score integer,
    lead_final_score integer,
    s2r_net_revenue numeric(12,2) DEFAULT 0,
    contract_price numeric(12,2),
    cap_rate numeric(5,2),
    sellers_gross_equity numeric(12,2),
    marketing_source character varying(100),
    campaign_medium character varying(100),
    campaign_name character varying(255),
    where_did_you_hear character varying(255),
    referral_source character varying(255),
    referral_name character varying(255),
    seller_advisor_id uuid,
    seller_manager_id uuid,
    investor_advisor_id uuid,
    cold_outreach_specialist_id uuid,
    transaction_coordinator_id uuid,
    lead_notes text,
    seller_segment character varying(50),
    reason_for_failure text,
    past_reason_for_failure text,
    date_created timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    last_contact_date timestamp with time zone,
    follow_up_date timestamp with time zone,
    days_in_current_stage integer DEFAULT 0,
    total_days_in_pipeline integer DEFAULT 0,
    stage_entered_at timestamp with time zone DEFAULT now(),
    revival_attempt_date timestamp with time zone,
    revived_campaign_content text,
    scheduled_meeting_date timestamp with time zone,
    scheduled_booking_date timestamp with time zone,
    re_booking_scheduled_date timestamp with time zone,
    pippin_status character varying(50),
    pippin_order_id character varying(100),
    pippin_order_tracking_url text,
    pippin_100_payment boolean DEFAULT false,
    pippin_60_payment boolean DEFAULT false,
    tags jsonb DEFAULT '[]'::jsonb,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crm_leads_pipeline_type_check CHECK (((pipeline_type)::text = ANY ((ARRAY['new'::character varying, 'follow-up'::character varying])::text[]))),
    CONSTRAINT crm_leads_result_check CHECK (((result)::text = ANY ((ARRAY['amazing'::character varying, 'good'::character varying, 'neutral'::character varying, 'bad'::character varying])::text[])))
);
CREATE SEQUENCE public.crm_leads_lead_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_leads_lead_number_seq OWNED BY public.crm_leads.lead_number;
CREATE TABLE public.crm_notification_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100)
);
CREATE TABLE public.crm_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    notification_type_id uuid,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.crm_occupancy_types (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_occupancy_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_occupancy_types_id_seq OWNED BY public.crm_occupancy_types.id;
CREATE TABLE public.crm_offer_status (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_offer_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_offer_status_id_seq OWNED BY public.crm_offer_status.id;
CREATE TABLE public.crm_property_comps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id text,
    comp_address text,
    comp_price numeric(12,2),
    comp_sqft integer,
    comp_beds integer,
    comp_baths numeric(3,1),
    comp_distance numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.crm_property_files (
    id integer NOT NULL,
    property_id text,
    file_id integer
);
CREATE SEQUENCE public.crm_property_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_property_files_id_seq OWNED BY public.crm_property_files.id;
CREATE TABLE public.crm_property_financials (
    id integer NOT NULL,
    property_id text,
    arv numeric(12,2),
    rehab_estimate numeric(12,2),
    mao numeric(12,2),
    estimated_rent numeric(12,2),
    created_at timestamp without time zone DEFAULT now(),
    mtg_remaining_balance numeric(12,2),
    mtg_monthly_payment numeric(10,2),
    second_mtg_balance numeric(12,2),
    second_mtg_monthly_payment numeric(10,2),
    interest_rate numeric(5,3),
    va_fha_mortgage character varying(20),
    batch_data_mtg text,
    home_insurance_yearly numeric(10,2),
    taxes_per_year numeric(10,2),
    tax_debt numeric(12,2),
    financed_solar_balance numeric(12,2),
    solar_monthly_payment numeric(10,2),
    hei_in_place boolean DEFAULT false,
    home_equity_investor_info text,
    other_liens text,
    debt_total numeric(12,2),
    total_payoff_value numeric(12,2),
    is_in_foreclosure boolean DEFAULT false,
    estimated_foreclosure_date date,
    foreclosure_attorney text,
    block_foreclosure character varying(100),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.crm_property_financials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_property_financials_id_seq OWNED BY public.crm_property_financials.id;
CREATE TABLE public.crm_property_foreclosures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id text NOT NULL,
    foreclosure_status character varying(50),
    estimated_sale_date date,
    foreclosure_attorney character varying(255),
    block_foreclosure_method character varying(100),
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.crm_property_investor_offers (
    id integer NOT NULL,
    property_id text,
    investor_id bigint,
    offer_price numeric(12,2),
    offer_date date,
    status_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.crm_property_investor_offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_property_investor_offers_id_seq OWNED BY public.crm_property_investor_offers.id;
CREATE TABLE public.crm_property_liens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id text NOT NULL,
    lien_type character varying(100),
    lien_holder character varying(255),
    lien_amount numeric(12,2),
    lien_recorded_date date,
    lien_status character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.crm_property_mortgages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id text NOT NULL,
    lender_name character varying(255),
    loan_type character varying(50),
    loan_balance numeric(12,2),
    monthly_payment numeric(10,2),
    interest_rate numeric(5,3),
    start_date date,
    maturity_date date,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.crm_property_realtor_info (
    id integer NOT NULL,
    property_id text,
    listed_realtor boolean DEFAULT false,
    realtor_name text,
    realtor_phone text,
    realtor_email text,
    realtor_company text,
    listing_price numeric,
    days_on_market integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.crm_property_realtor_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_property_realtor_info_id_seq OWNED BY public.crm_property_realtor_info.id;
CREATE TABLE public.crm_property_sellers (
    id integer NOT NULL,
    property_id text,
    seller_id integer,
    is_primary boolean DEFAULT false
);
CREATE SEQUENCE public.crm_property_sellers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_property_sellers_id_seq OWNED BY public.crm_property_sellers.id;
CREATE TABLE public.crm_property_types (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_property_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_property_types_id_seq OWNED BY public.crm_property_types.id;
CREATE TABLE public.crm_property_valuations (
    id integer NOT NULL,
    property_id text,
    house_canary numeric,
    batch_data_arv numeric,
    arv_after_repair numeric,
    zillow_estimate numeric,
    redfin_estimate numeric,
    appraisal_value numeric,
    appraisal_date date,
    price_per_sqft numeric,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.crm_roles (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE TABLE public.crm_roof_types (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.crm_roof_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_roof_types_id_seq OWNED BY public.crm_roof_types.id;
CREATE TABLE public.crm_sellers (
    id integer NOT NULL,
    first_name text,
    last_name text,
    phone text,
    email text,
    created_at timestamp without time zone DEFAULT now(),
    lead_id uuid,
    mobile character varying(20),
    alt_phone character varying(20),
    alt_email character varying(255),
    preferred_contact_method character varying(50),
    best_time_to_call character varying(50),
    language character varying(20) DEFAULT 'English'::character varying,
    mailing_address character varying(255),
    mailing_city character varying(100),
    mailing_state character varying(50),
    mailing_zip character varying(10),
    second_seller_first_name character varying(100),
    second_seller_last_name character varying(100),
    second_seller_email character varying(255),
    second_seller_phone character varying(20),
    second_seller_relationship character varying(50),
    date_of_birth date,
    age integer,
    gender character varying(20),
    occupation character varying(100),
    employer character varying(255),
    employment_status character varying(50),
    years_employed integer,
    military_status character varying(50),
    is_veteran boolean DEFAULT false,
    relationship_to_property character varying(50),
    ownership_type character varying(50),
    motivation character varying(255),
    urgency character varying(50),
    reason_for_selling text,
    timeline_flexibility character varying(50),
    desired_timeline character varying(100),
    wants_or_needs text,
    ultimate_seller_goals text,
    need_to_sell_by date,
    current_marriage_status character varying(50),
    spouse_name character varying(255),
    divorce_status character varying(50),
    divorce_attorney character varying(255),
    probate_status character varying(50),
    estate_attorney character varying(255),
    has_power_of_attorney boolean DEFAULT false,
    poa_name character varying(255),
    poa_relationship character varying(50),
    criminal_records boolean DEFAULT false,
    criminal_records_details text,
    asking_price numeric(12,2),
    minimum_acceptable_price numeric(12,2),
    seller_annual_income numeric(12,2),
    total_household_income numeric(12,2),
    credit_score_range character varying(50),
    monthly_debts numeric(12,2),
    debt_to_income_ratio numeric(5,2),
    is_in_bankruptcy boolean DEFAULT false,
    bankruptcy_type character varying(50),
    bankruptcy_status character varying(50),
    bankruptcy_discharge_date date,
    sales_proceeds_needed numeric(12,2),
    equity_needed numeric(12,2),
    years_lived_at_property integer,
    occupants_count integer,
    occupant_details text,
    has_pets boolean DEFAULT false,
    pet_types character varying(100),
    pet_count integer,
    desired_leaseback_period integer,
    max_monthly_rent numeric(10,2),
    preferred_move_out_date date,
    open_to_leaseback boolean DEFAULT true,
    leaseback_terms text,
    idenfy_status character varying(50),
    idenfy_session_id character varying(100),
    opt_out_dnc boolean DEFAULT false,
    text_opt_out boolean DEFAULT false,
    email_opt_out boolean DEFAULT false,
    notes text,
    story text,
    communication_notes text,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.crm_sellers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_sellers_id_seq OWNED BY public.crm_sellers.id;
CREATE TABLE public.crm_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    stage_type character varying(50),
    "position" integer,
    is_terminal boolean DEFAULT false
);
CREATE TABLE public.crm_transactions (
    id integer NOT NULL,
    property_id text,
    investor_id bigint,
    price numeric(12,2),
    closed_at date
);
CREATE SEQUENCE public.crm_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.crm_transactions_id_seq OWNED BY public.crm_transactions.id;
CREATE TABLE public.crm_user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    role_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by integer
);
CREATE TABLE public.crm_users_roles (
    id uuid NOT NULL,
    user_id integer,
    role_id uuid
);
CREATE TABLE public.crm_workflow_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid,
    entity_id uuid,
    executed_at timestamp without time zone DEFAULT now(),
    status character varying(50)
);
CREATE TABLE public.crm_workflow_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255),
    entity_type character varying(50),
    trigger_event character varying(100),
    conditions jsonb,
    actions jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);
CREATE TABLE public.csv_mapping_configurations (
    config_id bigint NOT NULL,
    config_name character varying(255) NOT NULL,
    description text,
    mapping_json jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);
CREATE SEQUENCE public.csv_mapping_configurations_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.csv_mapping_configurations_config_id_seq OWNED BY public.csv_mapping_configurations.config_id;
CREATE TABLE public.deal_harmony_custom_expenses (
    id bigint NOT NULL,
    deal_harmony_property_id bigint,
    scenario_id bigint,
    expense_name character varying(200) NOT NULL,
    expense_amount numeric(10,2) NOT NULL,
    frequency character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.deal_harmony_custom_expenses IS 'Additional expenses for properties or scenarios';
CREATE SEQUENCE public.deal_harmony_custom_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.deal_harmony_custom_expenses_id_seq OWNED BY public.deal_harmony_custom_expenses.id;
CREATE TABLE public.deal_harmony_custom_scenarios (
    id bigint NOT NULL,
    deal_harmony_property_id bigint NOT NULL,
    scenario_name character varying(200) NOT NULL,
    description text,
    prepaid_months integer DEFAULT 0 NOT NULL,
    lease_length integer DEFAULT 12 NOT NULL,
    duration integer NOT NULL,
    unit character varying(10) NOT NULL,
    include_cash_out_refinance boolean DEFAULT false,
    refi_timing integer,
    refi_ltv numeric(5,2),
    interest_rate numeric(5,3),
    loan_term integer,
    disposition_method character varying(50) NOT NULL,
    selling_costs numeric(5,2),
    monthly_rent numeric(10,2) NOT NULL,
    annual_rent_increase numeric(5,2) DEFAULT 3.00,
    property_mgmt_fee numeric(5,2) DEFAULT 0,
    property_taxes_yearly numeric(10,2),
    insurance_yearly numeric(10,2),
    hoa_fees_yearly numeric(10,2),
    maintenance_reserve_mo numeric(10,2),
    vacancy_rate numeric(5,2) DEFAULT 5.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);
COMMENT ON TABLE public.deal_harmony_custom_scenarios IS 'User-defined investment analysis scenarios';
CREATE SEQUENCE public.deal_harmony_custom_scenarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.deal_harmony_custom_scenarios_id_seq OWNED BY public.deal_harmony_custom_scenarios.id;
CREATE TABLE public.deal_harmony_documents (
    id bigint NOT NULL,
    deal_harmony_property_id bigint NOT NULL,
    document_type character varying(50) NOT NULL,
    document_name character varying(255) NOT NULL,
    file_path text,
    file_size_bytes bigint,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    generated_by uuid,
    CONSTRAINT chk_deal_harmony_document_type CHECK (((document_type)::text = ANY ((ARRAY['seller_binder'::character varying, 'investor_binder'::character varying, 'loan_estimate'::character varying, 'other'::character varying])::text[])))
);
COMMENT ON TABLE public.deal_harmony_documents IS 'Tracks generated PDF documents';
CREATE SEQUENCE public.deal_harmony_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.deal_harmony_documents_id_seq OWNED BY public.deal_harmony_documents.id;
CREATE TABLE public.deal_harmony_offers (
    id bigint NOT NULL,
    deal_harmony_property_id bigint NOT NULL,
    offer_type character varying(20) NOT NULL,
    sell2rent_fee numeric(12,2),
    psa_value numeric(12,2) DEFAULT 0 NOT NULL,
    sell2rent_rent_value numeric(10,2) DEFAULT 0 NOT NULL,
    leaseback_length integer DEFAULT 0 NOT NULL,
    offer_security_deposit numeric(10,2) DEFAULT 0 NOT NULL,
    prepaid_rent numeric(12,2) DEFAULT 0 NOT NULL,
    sell2rent_fee_estimate numeric(12,2),
    raise_offer_by numeric(12,2),
    home_value_appreciation numeric(5,2),
    loan_to_value numeric(5,2) DEFAULT 80.00 NOT NULL,
    interest_rate numeric(5,3) DEFAULT 6.630 NOT NULL,
    loan_term integer DEFAULT 360 NOT NULL,
    est_emd numeric(10,2) DEFAULT 5000,
    ctc_security_deposit numeric(10,2) DEFAULT 0 NOT NULL,
    origination_fee numeric(10,2) DEFAULT 0 NOT NULL,
    misc_closing_costs numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'draft'::character varying,
    contract_price numeric(12,2),
    refi_interest_rate numeric(5,3),
    refi_loan_term integer,
    refi_loan_to_value numeric(5,2),
    refi_dscr numeric,
    refi_month integer
);
COMMENT ON TABLE public.deal_harmony_offers IS 'Stores initial, final, and future custom offers with all related data (cash to close, loan details) in one table';
COMMENT ON COLUMN public.deal_harmony_offers.offer_security_deposit IS 'Security deposit from offer comparison (separate from cash to close)';
COMMENT ON COLUMN public.deal_harmony_offers.ctc_security_deposit IS 'Security deposit for cash to close calculation (separate from offer)';
CREATE SEQUENCE public.deal_harmony_offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.deal_harmony_offers_id_seq OWNED BY public.deal_harmony_offers.id;
CREATE TABLE public.deal_harmony_properties (
    id bigint NOT NULL,
    property_id text NOT NULL,
    user_id uuid,
    zoho_link text,
    zillow_link text,
    story text,
    comments text,
    estimated_market_value numeric(12,2) DEFAULT 0 NOT NULL,
    monthly_rental numeric(10,2),
    current_mortgage_balance numeric(12,2) DEFAULT 0 NOT NULL,
    other_debts_liens numeric(12,2) DEFAULT 0 NOT NULL,
    has_debts_liens boolean DEFAULT false,
    yearly_property_taxes numeric(12,2) DEFAULT 0 NOT NULL,
    yearly_insurance numeric(12,2) DEFAULT 0 NOT NULL,
    yearly_hoa_fees numeric(12,2) DEFAULT 0 NOT NULL,
    has_hoa boolean DEFAULT false,
    seller_cash_at_closing numeric(12,2) DEFAULT 0,
    properties_management_fee numeric(5,2) DEFAULT 0,
    do_seller_cash_at_closing numeric(12,2) DEFAULT 0,
    do_total_roi numeric(8,2),
    do_investor_min_equity_multiple numeric(8,4),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.deal_harmony_properties IS 'Deal analysis data linked to existing properties table. Includes deal optimizer configuration.';
COMMENT ON COLUMN public.deal_harmony_properties.property_id IS 'Foreign key to existing properties.id table';
COMMENT ON COLUMN public.deal_harmony_properties.do_total_roi IS 'Target or calculated total ROI for deal optimizer';
COMMENT ON COLUMN public.deal_harmony_properties.do_investor_min_equity_multiple IS 'Minimum equity multiple target for deal optimizer';
CREATE SEQUENCE public.deal_harmony_properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.deal_harmony_properties_id_seq OWNED BY public.deal_harmony_properties.id;
CREATE TABLE public.dialpad_call_events (
    id uuid NOT NULL,
    property_id uuid,
    call_id bigint NOT NULL,
    state text NOT NULL,
    direction text NOT NULL,
    event_timestamp bigint,
    date_started bigint,
    date_connected bigint,
    date_ended bigint,
    date_rang bigint,
    duration bigint,
    total_duration bigint,
    external_number text,
    internal_number text,
    was_recorded boolean DEFAULT false NOT NULL,
    is_transferred boolean DEFAULT false NOT NULL,
    master_call_id bigint,
    entry_point_call_id bigint,
    operator_call_id bigint,
    group_id text,
    custom_data text,
    transcription_text text,
    voicemail_link text,
    recap_summary text,
    recap_outcome text,
    recap_purposes jsonb,
    recap_action_items jsonb,
    pcsat_score integer,
    csat_score integer,
    target jsonb,
    contact jsonb,
    entry_point_target jsonb,
    proxy_target jsonb,
    recording_details jsonb,
    screen_recording_urls jsonb,
    csat_recording_urls jsonb,
    csat_transcriptions jsonb,
    call_dispositions jsonb,
    raw_payload jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);
CREATE TABLE public.dialpad_sms_events (
    id uuid NOT NULL,
    property_id uuid,
    external_id bigint NOT NULL,
    direction text NOT NULL,
    sender_id bigint,
    from_number text,
    to_numbers jsonb DEFAULT '[]'::jsonb NOT NULL,
    mms boolean DEFAULT false NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    message_status text,
    message_delivery_result text,
    text text,
    text_content text,
    mms_url text,
    created_date_ms bigint,
    event_timestamp_ms bigint,
    target jsonb,
    contact jsonb,
    raw_payload jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);
CREATE TABLE public.disposition_strategy (
    id integer NOT NULL,
    module_name text NOT NULL,
    sellers_name text,
    address text,
    details text,
    cold_investors_video text,
    investor_data_source text,
    mailing_address text,
    company_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    flair_template character varying(1000),
    disposition_url character varying(500),
    CONSTRAINT disposition_strategy_module_name_check CHECK ((module_name = ANY (ARRAY['lead'::text, 'deal'::text])))
);
ALTER TABLE public.disposition_strategy ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.disposition_strategy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE public.disposition_strategy_jobs (
    id bigint NOT NULL,
    user_id integer,
    filename text,
    status text,
    created_at timestamp(6) without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text),
    updated_at timestamp(6) without time zone DEFAULT (now() AT TIME ZONE 'UTC'::text)
);
CREATE SEQUENCE public.disposition_strategy_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.disposition_strategy_jobs_id_seq OWNED BY public.disposition_strategy_jobs.id;
CREATE TABLE public.expense_tool_mappings (
    id integer NOT NULL,
    fixed_expense_id integer NOT NULL,
    source_table text NOT NULL,
    usage_column text NOT NULL,
    deal_relation_column text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.expense_tool_mappings IS 'Configuration for tools that fetch usage data from campaign tables';
CREATE SEQUENCE public.expense_tool_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.expense_tool_mappings_id_seq OWNED BY public.expense_tool_mappings.id;
CREATE TABLE public.expenses_paid_media (
    id integer NOT NULL,
    tool_name text NOT NULL,
    created_at date DEFAULT now() NOT NULL,
    number_of_conversions bigint NOT NULL,
    cost_per_conversion numeric(15,2) NOT NULL,
    total_cost numeric(15,2) NOT NULL,
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.expenses_paid_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.expenses_paid_media_id_seq OWNED BY public.expenses_paid_media.id;
CREATE TABLE public.expenses_per_deal (
    id integer NOT NULL,
    deal_id text NOT NULL,
    tool_name text NOT NULL,
    tool_type text NOT NULL,
    token_used bigint,
    cost numeric(15,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_auto_calculated boolean DEFAULT false,
    source_expense_id integer,
    fixed_cost numeric(15,4)
);
COMMENT ON TABLE public.expenses_per_deal IS 'Variable expenses per deal - tracks tool usage and costs for individual property campaigns';
COMMENT ON COLUMN public.expenses_per_deal.cost IS 'Cost per token - supports up to 4 decimal places for precision';
COMMENT ON COLUMN public.expenses_per_deal.is_auto_calculated IS 'True if expense was auto-calculated from campaign tables or fixed expense division';
COMMENT ON COLUMN public.expenses_per_deal.source_expense_id IS 'Reference to general_expenses.id - the fixed expense that generated this variable expense (NULL for manual entries)';
COMMENT ON COLUMN public.expenses_per_deal.fixed_cost IS 'Fixed cost allocated to this deal - supports up to 4 decimal places for precision';
CREATE SEQUENCE public.expenses_per_deal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.expenses_per_deal_id_seq OWNED BY public.expenses_per_deal.id;
CREATE TABLE public.expenses_variable_history (
    id integer NOT NULL,
    deal_id text NOT NULL,
    tool_name text NOT NULL,
    tool_type text NOT NULL,
    token_used bigint,
    cost numeric(15,2),
    is_auto_calculated boolean DEFAULT false,
    snapshot_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.expenses_variable_history IS 'Historical snapshots of variable expenses per deal - captured daily';
CREATE SEQUENCE public.expenses_variable_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.expenses_variable_history_id_seq OWNED BY public.expenses_variable_history.id;
CREATE TABLE public.filename_jobs (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    filename text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    total_chunks integer NOT NULL,
    processed_chunks integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
ALTER TABLE public.filename_jobs ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.filename_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE public.flood_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.ga4_weekly_data (
    id integer NOT NULL,
    year integer NOT NULL,
    week integer NOT NULL,
    week_label character varying(10) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    channel character varying(20) NOT NULL,
    sessions integer DEFAULT 0,
    users integer DEFAULT 0,
    conversions numeric(10,2) DEFAULT 0,
    bounce_rate numeric(5,2) DEFAULT 0,
    page_views integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ga4_weekly_data_channel_check CHECK (((channel)::text = ANY ((ARRAY['Direct'::character varying, 'Organic Search'::character varying, 'Organic Social'::character varying])::text[])))
);
CREATE SEQUENCE public.ga4_weekly_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.ga4_weekly_data_id_seq OWNED BY public.ga4_weekly_data.id;
CREATE TABLE public.general_expenses (
    id integer NOT NULL,
    tool_name text NOT NULL,
    type_of_tool text NOT NULL,
    fixed_cost numeric(15,2) NOT NULL,
    tokens_available bigint NOT NULL,
    cost_per_token numeric(15,6) NOT NULL,
    start_date date DEFAULT now() NOT NULL,
    end_date date,
    active boolean NOT NULL
);
CREATE SEQUENCE public.general_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.general_expenses_id_seq OWNED BY public.general_expenses.id;
CREATE TABLE public.hoa_frequencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(20) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.investor_emails (
    email_id bigint NOT NULL,
    investor_id bigint,
    email character varying(255) NOT NULL
);
CREATE SEQUENCE public.investor_emails_email_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.investor_emails_email_id_seq OWNED BY public.investor_emails.email_id;
CREATE TABLE public.investor_phones (
    phone_id bigint NOT NULL,
    investor_id bigint,
    phone character varying(255) NOT NULL
);
CREATE SEQUENCE public.investor_phones_phone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.investor_phones_phone_id_seq OWNED BY public.investor_phones.phone_id;
CREATE TABLE public.investors (
    investor_id bigint NOT NULL,
    username character varying(255),
    company_name character varying(255),
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    address_line_1 character varying(255),
    address_line_2 character varying(255),
    city character varying(255),
    state character varying(255),
    zip_code character varying(255),
    account_status boolean DEFAULT true,
    investor_status character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_synced_at timestamp without time zone,
    website character varying(255),
    investor_type character varying(100),
    investment_stage character varying(100),
    investment_size character varying(100),
    investor_source character varying(250),
    zoho_stage character varying(255),
    type_of_buyer text,
    properties_count integer,
    active_buyer boolean DEFAULT false,
    investor_advisor integer,
    made_offers_95_asking_price boolean DEFAULT false,
    has_done_property_walkthrough boolean DEFAULT false
);
CREATE SEQUENCE public.investors_investor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.investors_investor_id_seq OWNED BY public.investors.investor_id;
CREATE TABLE public.leads (
    id uuid NOT NULL,
    date timestamp with time zone,
    street text,
    city text,
    state text,
    zip_code text,
    transaction_type text,
    property_type text,
    estimated_home_value numeric(15,2),
    mortgage_balance numeric(15,2),
    owner_estimated_rent text,
    credit_score_level text,
    annual_income text,
    lead_origination text,
    situation_category text,
    first_name text,
    last_name text,
    email text,
    phone text,
    revival_attempt_at timestamp with time zone,
    revived_lead_source text,
    revived_campaign_medium text,
    revived_campaign_name text,
    revived_at timestamp with time zone,
    campaign text,
    lead_source text,
    referrer text,
    campaigns_source text,
    campaign_medium text,
    gclid text,
    content text,
    intake_form_or_source text,
    refer2win_code text,
    lead_status text,
    original_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lead_id text,
    desired_lease_period_months text,
    other_liens integer,
    campaign_id integer
);
CREATE TABLE public.marketing (
    id integer NOT NULL,
    investor_contacted text,
    call_result text,
    investor_id integer NOT NULL,
    disposition_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    investor_source character varying(255),
    reg_campaign_medium character varying(255),
    campaign_name character varying(255)
);
ALTER TABLE public.marketing ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.marketing_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE public.mst_campaign_ai_calling (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id text NOT NULL,
    total_number_of_calls integer DEFAULT 0,
    pick_up_calls integer DEFAULT 0,
    pick_up_rate numeric(10,4),
    number_of_registrations integer DEFAULT 0,
    cvr numeric(10,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    campaign_name character varying(255),
    lead_type character varying(50),
    cpl numeric(10,2),
    campaing_created_at timestamp without time zone,
    deal_id integer,
    cost_per_registrations numeric
);
CREATE TABLE public.mst_campaign_email_hubspot (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id text NOT NULL,
    report_date date DEFAULT CURRENT_DATE,
    used_credits integer DEFAULT 0,
    total_sent integer DEFAULT 0,
    response_count integer DEFAULT 0,
    open_rate numeric(10,4),
    click_rate numeric(10,4),
    bounce_rate numeric(10,4),
    success_rate numeric(10,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    campaign_name text,
    deal_number integer,
    delivered numeric,
    delivery_rate numeric,
    unsubscribe_rate numeric,
    spams_reports numeric
);
CREATE TABLE public.mst_campaign_human_calling (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE,
    total_calls integer DEFAULT 0,
    pick_up_calls integer DEFAULT 0,
    pick_up_rate numeric(10,4),
    registrations integer DEFAULT 0,
    cvr numeric(10,4),
    dnc_count integer DEFAULT 0,
    phone_number_issues integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_campaign_investor_lift (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_name text NOT NULL,
    price numeric(15,2),
    "totalSMSSent" numeric DEFAULT 0,
    "smsSuccessRate" numeric(10,4),
    "totalEmailsSent" numeric(10,4),
    "smsClicks" numeric(10,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "buyerResponsePercentage" numeric,
    type text,
    "emailClicks" numeric,
    "emailCTR" numeric,
    "smsCTR" numeric,
    status text,
    campaign_start_time text,
    campaign_created_at text,
    "emailSuccessRate" numeric,
    deal_id integer,
    registrations numeric,
    "CVR" numeric,
    "CPL" numeric
);
CREATE TABLE public.mst_campaign_investors_batch_leads (
    id bigint NOT NULL,
    deal_number integer NOT NULL,
    amount_of_investors numeric NOT NULL,
    cost_per_token numeric(15,6) NOT NULL,
    total_spend numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    amount_of_files integer
);
CREATE SEQUENCE public.mst_campaign_investors_batch_leads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_investors_batch_leads_id_seq OWNED BY public.mst_campaign_investors_batch_leads.id;
CREATE TABLE public.mst_campaign_investors_deal_machine (
    id bigint NOT NULL,
    deal_number integer NOT NULL,
    amount_of_investors numeric NOT NULL,
    cost_per_token numeric(15,6) NOT NULL,
    total_spend numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    amount_of_files integer
);
CREATE SEQUENCE public.mst_campaign_investors_deal_machine_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_investors_deal_machine_id_seq OWNED BY public.mst_campaign_investors_deal_machine.id;
CREATE TABLE public.mst_campaign_investors_investorbase (
    id bigint NOT NULL,
    deal_number integer NOT NULL,
    amount_of_investors numeric NOT NULL,
    cost_per_token numeric(15,6) NOT NULL,
    total_spend numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    amount_of_files integer
);
CREATE SEQUENCE public.mst_campaign_investors_investorbase_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_investors_investorbase_id_seq OWNED BY public.mst_campaign_investors_investorbase.id;
CREATE TABLE public.mst_campaign_investors_investorlift (
    id integer NOT NULL,
    deal_number integer NOT NULL,
    amount_of_investors integer DEFAULT 0 NOT NULL,
    amount_of_files integer DEFAULT 0 NOT NULL,
    cost_per_token real DEFAULT 0 NOT NULL,
    total_spend real DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.mst_campaign_investors_investorlift_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_investors_investorlift_id_seq OWNED BY public.mst_campaign_investors_investorlift.id;
CREATE TABLE public.mst_campaign_investors_propstream (
    id bigint NOT NULL,
    deal_number integer NOT NULL,
    amount_of_investors numeric NOT NULL,
    cost_per_token numeric(15,6) NOT NULL,
    total_spend numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    amount_of_files integer
);
CREATE SEQUENCE public.mst_campaign_investors_propstream_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_investors_propstream_id_seq OWNED BY public.mst_campaign_investors_propstream.id;
CREATE TABLE public.mst_campaign_investors_sfr_analytics (
    id bigint NOT NULL,
    deal_number integer NOT NULL,
    amount_of_investors numeric NOT NULL,
    cost_per_token numeric(15,6) NOT NULL,
    total_spend numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    amount_of_files integer
);
CREATE SEQUENCE public.mst_campaign_investors_sfr_analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_investors_sfr_analytics_id_seq OWNED BY public.mst_campaign_investors_sfr_analytics.id;
CREATE TABLE public.mst_campaign_paid_media_facebook (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id text NOT NULL,
    campaign_name text,
    report_date date DEFAULT CURRENT_DATE,
    ad_spend numeric DEFAULT 0,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    registrations integer DEFAULT 0,
    video_views integer DEFAULT 0,
    ctr numeric,
    cvr numeric,
    cpl numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_campaign_paid_media_google_ads (
    id integer NOT NULL,
    campaign_id bigint NOT NULL,
    campaign_name text,
    report_date date NOT NULL,
    ad_spend numeric DEFAULT 0,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    ctr numeric DEFAULT 0,
    registrations integer DEFAULT 0,
    cvr numeric DEFAULT 0,
    cpl numeric DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.mst_campaign_paid_media_google_ads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_paid_media_google_ads_id_seq OWNED BY public.mst_campaign_paid_media_google_ads.id;
CREATE TABLE public.mst_campaign_paid_media_google_analytics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    report_date date DEFAULT CURRENT_DATE,
    ctr numeric(10,4),
    cvr numeric(10,4),
    cpl numeric(15,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    website_traffic numeric,
    organic_traffic numeric,
    total_users numeric,
    form_visits numeric,
    number_of_registrations numeric,
    source text,
    medium text,
    campaign text,
    new_users integer DEFAULT 0,
    engagement_rate numeric(5,2),
    average_engagement_time numeric(10,2)
);
CREATE TABLE public.mst_campaign_paid_media_reddit (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE,
    ad_spend numeric(15,2) DEFAULT 0,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    registrations integer DEFAULT 0,
    upvotes integer DEFAULT 0,
    ctr numeric(10,4),
    cvr numeric(10,4),
    cpl numeric(15,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_campaign_quickemail (
    id integer NOT NULL,
    campaign_id text,
    report_date date,
    used_credits integer,
    total_sent integer,
    response_count integer,
    open_rate numeric(5,2),
    click_rate numeric(5,2),
    bounce_rate numeric(5,2),
    success_rate numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deal_number integer,
    campaign_name text
);
CREATE SEQUENCE public.mst_campaign_quickemail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_quickemail_id_seq OWNED BY public.mst_campaign_quickemail.id;
CREATE TABLE public.mst_campaign_sms_hubspot (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE,
    used_message_segments integer DEFAULT 0,
    total_sent integer DEFAULT 0,
    response_count integer DEFAULT 0,
    fallback_clicks integer DEFAULT 0,
    unsubscribes integer DEFAULT 0,
    delivery_rate numeric(10,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sms_name text,
    deal_number integer,
    delivered numeric
);
CREATE TABLE public.mst_campaign_sms_simpletexting (
    id integer NOT NULL,
    campaign_id text,
    report_date date,
    used_credits integer,
    total_sent integer,
    response_count integer,
    fallback_clicks integer,
    unsubscribes integer,
    success_rate numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    clicked numeric,
    campaign_name text,
    fallback_sent integer,
    "CVR" numeric(10,4),
    "CPL" numeric(15,2),
    "CTR" numeric,
    bounce_rate numeric,
    registrations numeric,
    deal_number integer
);
CREATE SEQUENCE public.mst_campaign_sms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_sms_id_seq OWNED BY public.mst_campaign_sms_simpletexting.id;
CREATE TABLE public.mst_campaign_sms_simpletexting_phone_numbers (
    id integer NOT NULL,
    phone character varying NOT NULL,
    status character varying NOT NULL,
    city character varying NOT NULL,
    updated_at date DEFAULT now() NOT NULL,
    created_at date DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_campaign_sms_simpletexting_phone_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_campaign_sms_simpletexting_phone_numbers_id_seq OWNED BY public.mst_campaign_sms_simpletexting_phone_numbers.id;
CREATE TABLE public.mst_campaign_social_network (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id text,
    report_date date DEFAULT CURRENT_DATE,
    social_network character varying(50) NOT NULL,
    followers integer DEFAULT 0,
    posts integer DEFAULT 0,
    impressions integer DEFAULT 0,
    engagement_count numeric DEFAULT 0,
    interactions integer DEFAULT 0,
    likes integer DEFAULT 0,
    clicks integer DEFAULT 0,
    ctr numeric(10,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    followers_usa numeric,
    followers_other numeric
);
CREATE TABLE public.mst_campaign_website (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    campaign_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE,
    website_traffic integer DEFAULT 0,
    organic_traffic integer DEFAULT 0,
    total_users integer DEFAULT 0,
    new_users integer DEFAULT 0,
    form_visits integer DEFAULT 0,
    registrations integer DEFAULT 0,
    engagement_rate numeric(10,4),
    avg_engagement_time_seconds integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_campaigns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    channel_id uuid NOT NULL,
    data_source_id uuid,
    deal_id uuid,
    launch_date timestamp with time zone NOT NULL,
    status character varying(50) NOT NULL,
    total_budget numeric(15,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_channels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    provider character varying(255),
    sync_frequency character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_cold_campaign_sms (
    id integer NOT NULL,
    campaign_name character varying(255) NOT NULL,
    campaign_date date NOT NULL,
    success_rate numeric(5,2),
    fallback_clicks integer DEFAULT 0,
    total_sent integer DEFAULT 0,
    used_credits integer DEFAULT 0,
    clicked integer DEFAULT 0,
    response_count integer DEFAULT 0,
    unsubscribes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    bounce_rate numeric
);
CREATE SEQUENCE public.mst_cold_campaign_sms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_campaign_sms_id_seq OWNED BY public.mst_cold_campaign_sms.id;
CREATE TABLE public.mst_cold_data_sources (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    provider character varying(255) DEFAULT ''::character varying NOT NULL,
    access_type character varying(50) DEFAULT 'On demand'::character varying NOT NULL,
    api_key text,
    enabled boolean DEFAULT true NOT NULL,
    status character varying(100) DEFAULT 'Ready'::character varying NOT NULL,
    icon character varying(20) DEFAULT ''::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_cold_data_sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_data_sources_id_seq OWNED BY public.mst_cold_data_sources.id;
CREATE TABLE public.mst_cold_direct_mail (
    id bigint NOT NULL,
    delivery_request_id bigint NOT NULL,
    delivery_name character varying(255) NOT NULL,
    percent_total_delivered numeric(5,2) NOT NULL,
    quantity_delivered integer NOT NULL,
    quantity_mailed integer NOT NULL,
    report_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.mst_cold_direct_mail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_direct_mail_id_seq OWNED BY public.mst_cold_direct_mail.id;
CREATE TABLE public.mst_cold_emails_icomm (
    id bigint NOT NULL,
    report_date date NOT NULL,
    campaign_name text NOT NULL,
    delivery integer NOT NULL,
    bounce integer NOT NULL,
    delivery_rate integer NOT NULL,
    removed integer NOT NULL,
    views integer NOT NULL,
    click integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_cold_emails_icomm_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_emails_icomm_id_seq OWNED BY public.mst_cold_emails_icomm.id;
CREATE TABLE public.mst_cold_expenses_per_campaign (
    id bigint NOT NULL,
    campaign_id bigint NOT NULL,
    tool_name character varying(255) NOT NULL,
    tool_type character varying(100) DEFAULT 'Marketing Channel'::character varying NOT NULL,
    token_used bigint DEFAULT 0 NOT NULL,
    cost numeric(15,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_cold_expenses_per_campaign_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_expenses_per_campaign_id_seq OWNED BY public.mst_cold_expenses_per_campaign.id;
CREATE TABLE public.mst_cold_fixed_expenses (
    id bigint NOT NULL,
    tool_name character varying(255) NOT NULL,
    type character varying(100) DEFAULT 'Marketing Channel'::character varying NOT NULL,
    fixed_cost numeric(12,2) DEFAULT 0 NOT NULL,
    tokens_available numeric(14,2),
    cost_per_token numeric(12,6),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    campaign_cost_type character varying(50),
    tokens_per_unit integer,
    requires_campaign_opt_in boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_cold_fixed_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_fixed_expenses_id_seq OWNED BY public.mst_cold_fixed_expenses.id;
CREATE TABLE public.mst_cold_marketing_channels (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    channel_type character varying(100) DEFAULT 'Email'::character varying NOT NULL,
    provider character varying(255) DEFAULT ''::character varying NOT NULL,
    frequency character varying(50) DEFAULT 'Hourly'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    status character varying(100) DEFAULT 'No sync history'::character varying NOT NULL,
    icon character varying(20) DEFAULT ''::character varying,
    records_count integer DEFAULT 0 NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_cold_marketing_channels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_marketing_channels_id_seq OWNED BY public.mst_cold_marketing_channels.id;
CREATE TABLE public.mst_cold_markets (
    id bigint NOT NULL,
    msa_name character varying(500) NOT NULL,
    state character varying(10) NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_cold_markets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_markets_id_seq OWNED BY public.mst_cold_markets.id;
CREATE TABLE public.mst_cold_variable_expenses (
    id bigint NOT NULL,
    tool_name character varying(255) NOT NULL,
    number_of_conversions integer DEFAULT 0 NOT NULL,
    cost_per_conversion numeric(12,2) DEFAULT 0 NOT NULL,
    total_cost numeric(12,2) GENERATED ALWAYS AS (((number_of_conversions)::numeric * cost_per_conversion)) STORED,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.mst_cold_variable_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_cold_variable_expenses_id_seq OWNED BY public.mst_cold_variable_expenses.id;
CREATE TABLE public.mst_data_sources (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    api_key character varying(255),
    api_endpoint text,
    sync_frequency character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_fb_meta_ads (
    id character varying(255),
    campaign_name character varying(255),
    updated_at timestamp without time zone,
    impressions integer,
    reach integer,
    clicks integer,
    conversions integer,
    results integer,
    cpm numeric,
    cpc numeric,
    ctr numeric,
    conversion_value numeric,
    roas numeric,
    spent numeric,
    post_interactions integer,
    page_interactions integer,
    outbound_click integer,
    link_clicks integer,
    video_views integer,
    estimated_ad_recallers integer,
    estimated_ad_recall_rate numeric,
    cost_per_estimated_ad_recallers numeric,
    video_total_views integer,
    thruplays integer,
    post_reactions integer,
    post_interaction_gross integer,
    onsite_conversion_messaging_block integer,
    submit_application_website integer,
    submit_application_total integer,
    omni_landing_page_view integer,
    landing_page_views integer,
    offsite_custom integer,
    custom_644750487584994 integer,
    custom_617234827261451 integer,
    custom_1889246284806067 integer,
    provider_campaign_id text,
    report_date date
);
CREATE TABLE public.mst_field_mappings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    data_source_id uuid NOT NULL,
    source_field character varying(255) NOT NULL,
    target_field character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_leads_for_metrics (
    id character varying(255) NOT NULL,
    type character varying(10) NOT NULL,
    street character varying(500),
    city character varying(255),
    state character varying(100),
    zip_code character varying(20),
    campaigns_source character varying(255),
    campaign_medium character varying(255),
    lead_status character varying(255),
    lead_initial_score numeric(10,2),
    situation_category character varying(255),
    promote_status character varying(255),
    mql_lead character varying(10),
    sql_lead character varying(10),
    first_name character varying(255),
    last_name character varying(255),
    lead_name character varying(511),
    created_time timestamp without time zone,
    revival_attempt_date timestamp without time zone,
    revived_date timestamp without time zone,
    closing_date timestamp without time zone,
    offer_accepted_date timestamp without time zone,
    revived_campaign_medium character varying(255),
    revived_campaign_content text,
    reason_for_failure_detail text,
    value numeric(15,2),
    days_in_new_lead_stage_formula numeric(10,2),
    days_in_initial_booking_stage_formula numeric(10,2),
    days_in_underwriting_stage_formula numeric(10,2),
    days_in_propose_to_seller_sql_stage_formula numeric(10,2),
    days_in_psa_execution_stage_formula numeric(10,2),
    days_in_analyze_and_qualify_stage_formula numeric(10,2),
    tags jsonb,
    synced_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mst_leads_for_metrics_type_check CHECK (((type)::text = ANY ((ARRAY['lead'::character varying, 'deal'::character varying])::text[])))
);
CREATE TABLE public.mst_offers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    deal_id uuid NOT NULL,
    investor_id uuid NOT NULL,
    offer_amount numeric(15,2) NOT NULL,
    asking_price numeric(15,2) NOT NULL,
    status character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.mst_properties_property_radar (
    id bigint NOT NULL,
    address text,
    city text,
    state character(2),
    zip_five character(5),
    county text,
    school_district text,
    advanced_property_type text,
    sqft integer,
    lot_size integer,
    lot_size_acres numeric(10,4),
    beds integer,
    baths numeric(3,1),
    year_built integer,
    has_pool boolean,
    has_air_cond boolean,
    same_mailing_or_exempt boolean,
    high_equity boolean,
    deceased_property boolean,
    avm_value numeric(14,2),
    assessed_value numeric(14,2),
    equity_percent numeric(5,2),
    available_equity numeric(14,2),
    total_loan_balance numeric(14,2),
    annual_taxes numeric(14,2),
    estimated_rent numeric(14,2),
    comp_sales_price numeric(14,2),
    first_loan_purpose text,
    first_loan_type text,
    first_loan_date date,
    first_loan_amount numeric(14,2),
    first_loan_rate numeric(5,3),
    building_quality text,
    second_loan_purpose text,
    second_loan_type text,
    second_loan_date date,
    second_loan_amount numeric(14,2),
    second_loan_rate numeric(5,3),
    in_foreclosure boolean,
    pre_foreclosure boolean,
    tax_delinquent boolean,
    in_divorce boolean,
    in_bankruptcy boolean,
    has_open_liens boolean,
    has_open_person_liens boolean,
    foreclosure_stage text,
    last_transfer_record_date date,
    listing_status text,
    days_on_market integer,
    comparables_count integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    radar_id character varying,
    status text DEFAULT 'new'::text NOT NULL
);
CREATE SEQUENCE public.mst_properties_property_radar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_properties_property_radar_id_seq OWNED BY public.mst_properties_property_radar.id;
CREATE TABLE public.mst_skip_tracing_batch_data (
    id integer NOT NULL,
    address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(2) NOT NULL,
    zip_five character varying(10) NOT NULL,
    zip_plus_4 character varying(4),
    county character varying(100),
    address_hash character varying(100),
    address_validity character varying(50),
    owner_first_name character varying(100),
    owner_middle_name character varying(100),
    owner_last_name character varying(100),
    owner_full_name character varying(255),
    phone_numbers jsonb,
    best_phone character varying(20),
    best_phone_type character varying(20),
    best_phone_carrier character varying(255),
    emails jsonb,
    best_email character varying(255),
    mailing_address_street character varying(255),
    mailing_address_city character varying(100),
    mailing_address_state character varying(2),
    mailing_address_zip character varying(10),
    mailing_address_zip_plus_4 character varying(4),
    mailing_address_county character varying(100),
    is_deceased boolean DEFAULT false,
    is_litigator boolean DEFAULT false,
    is_tcpa_dnc boolean DEFAULT false,
    has_bankruptcy boolean DEFAULT false,
    has_involuntary_lien boolean DEFAULT false,
    batchdata_property_id character varying(100),
    batchdata_request_id character varying(100),
    matched boolean DEFAULT false,
    error boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE VIEW public.mst_properties_with_skip_trace AS
 SELECT pr.id AS pr_id,
    pr.address,
    pr.city,
    pr.state,
    pr.zip_five,
    pr.county,
    pr.school_district,
    pr.advanced_property_type,
    pr.sqft,
    pr.lot_size,
    pr.lot_size_acres,
    pr.beds,
    pr.baths,
    pr.year_built,
    pr.has_pool,
    pr.has_air_cond,
    pr.same_mailing_or_exempt,
    pr.high_equity,
    pr.deceased_property,
    pr.avm_value,
    pr.assessed_value,
    pr.equity_percent,
    pr.available_equity,
    pr.total_loan_balance,
    pr.annual_taxes,
    pr.estimated_rent,
    pr.comp_sales_price,
    pr.first_loan_purpose,
    pr.first_loan_type,
    pr.first_loan_date,
    pr.first_loan_amount,
    pr.first_loan_rate,
    pr.building_quality,
    pr.second_loan_purpose,
    pr.second_loan_type,
    pr.second_loan_date,
    pr.second_loan_amount,
    pr.second_loan_rate,
    pr.in_foreclosure,
    pr.pre_foreclosure,
    pr.tax_delinquent,
    pr.in_divorce,
    pr.in_bankruptcy,
    pr.has_open_liens,
    pr.has_open_person_liens,
    pr.foreclosure_stage,
    pr.last_transfer_record_date,
    pr.listing_status,
    pr.days_on_market,
    pr.comparables_count,
    pr.created_at AS pr_created_at,
    pr.updated_at AS pr_updated_at,
    pr.radar_id,
    st.id AS st_id,
    st.zip_plus_4,
    st.address_hash,
    st.address_validity,
    st.owner_first_name,
    st.owner_middle_name,
    st.owner_last_name,
    st.owner_full_name,
    st.phone_numbers,
    st.best_phone,
    st.best_phone_type,
    st.best_phone_carrier,
    st.emails,
    st.best_email,
    st.mailing_address_street,
    st.mailing_address_city,
    st.mailing_address_state,
    st.mailing_address_zip,
    st.mailing_address_zip_plus_4,
    st.mailing_address_county,
    st.is_deceased,
    st.is_litigator,
    st.is_tcpa_dnc,
    st.has_bankruptcy,
    st.has_involuntary_lien,
    st.batchdata_property_id,
    st.batchdata_request_id,
    st.matched,
    st.error,
    st.created_at AS st_created_at,
    st.updated_at AS st_updated_at
   FROM (public.mst_properties_property_radar pr
     LEFT JOIN public.mst_skip_tracing_batch_data st ON (((pr.address = (st.address)::text) AND (pr.city = (st.city)::text) AND (pr.state = (st.state)::bpchar) AND (pr.zip_five = (st.zip_five)::bpchar))));
CREATE TABLE public.mst_property_radar_lists (
    list_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    count integer DEFAULT 0 NOT NULL
);
CREATE TABLE public.mst_sellers_properties_pipeline (
    id bigint NOT NULL,
    property_radar_id bigint,
    skip_tracing_id bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    stage text DEFAULT 'Cold Not Contacted'::text,
    lead_score numeric(5,2) DEFAULT 0,
    attributes jsonb DEFAULT '{}'::jsonb,
    cold_lead_id text
);
CREATE SEQUENCE public.mst_sellers_properties_pipeline_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_sellers_properties_pipeline_id_seq OWNED BY public.mst_sellers_properties_pipeline.id;
CREATE TABLE public.mst_sellers_stage_history (
    id bigint NOT NULL,
    pipeline_id bigint NOT NULL,
    old_stage text,
    new_stage text NOT NULL,
    changed_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.mst_sellers_stage_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_sellers_stage_history_id_seq OWNED BY public.mst_sellers_stage_history.id;
CREATE SEQUENCE public.mst_skip_tracing_batch_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_skip_tracing_batch_data_id_seq OWNED BY public.mst_skip_tracing_batch_data.id;
CREATE TABLE public.mst_sonar_campaign_sellers (
    id bigint NOT NULL,
    campaign_id bigint NOT NULL,
    seller_id bigint NOT NULL,
    active boolean DEFAULT true,
    stage text DEFAULT 'To be Contacted'::text,
    status text DEFAULT 'Cold Not Contacted'::text,
    days integer DEFAULT 0,
    call_attempt_day date,
    how_many_call_attempts integer DEFAULT 0,
    pick_up boolean DEFAULT false,
    call_attempt_day_2 date,
    how_many_call_attempts_2 integer DEFAULT 0,
    sms_1 date,
    sms_2 date,
    sms_3 date,
    email_1 date,
    email_2 date,
    email_3 date,
    direct_mail date,
    pick_up_status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.mst_sonar_campaign_sellers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_sonar_campaign_sellers_id_seq OWNED BY public.mst_sonar_campaign_sellers.id;
CREATE TABLE public.mst_sonar_campaigns (
    id bigint NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text,
    channel_sms boolean DEFAULT false,
    channel_email boolean DEFAULT false,
    channel_phone boolean DEFAULT false,
    channel_direct_mail boolean DEFAULT false,
    list_size integer DEFAULT 0,
    cold_leads integer DEFAULT 0,
    contacted integer DEFAULT 0,
    interested integer DEFAULT 0,
    converted integer DEFAULT 0,
    response_rate numeric(5,2) DEFAULT 0,
    cost numeric(12,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    use_print_mail boolean DEFAULT false NOT NULL,
    CONSTRAINT mst_sonar_campaigns_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'draft'::text, 'completed'::text])))
);
CREATE SEQUENCE public.mst_sonar_campaigns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_sonar_campaigns_id_seq OWNED BY public.mst_sonar_campaigns.id;
CREATE TABLE public.mst_sonar_monthly_expenses (
    id bigint NOT NULL,
    month date NOT NULL,
    fixed_expenses numeric(12,2) DEFAULT 0,
    variable_expenses numeric(12,2) DEFAULT 0,
    campaign_costs numeric(12,2) DEFAULT 0,
    total_expenses numeric(12,2) DEFAULT 0,
    campaign_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.mst_sonar_monthly_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.mst_sonar_monthly_expenses_id_seq OWNED BY public.mst_sonar_monthly_expenses.id;
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.offers (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    property_id character varying(255) NOT NULL,
    offer_name character varying(255) NOT NULL,
    offer_date timestamp with time zone NOT NULL,
    sale_offer numeric(10,2) NOT NULL,
    proposed_rent_value numeric(10,2) NOT NULL,
    required_security_deposit integer,
    required_rent_pre_payment integer,
    financing_needed boolean DEFAULT false NOT NULL,
    buyer_escrow_amount numeric(10,2) NOT NULL,
    details text,
    win boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);
CREATE SEQUENCE public.offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;
CREATE TABLE public.platform_metrics (
    id integer NOT NULL,
    metric_name character varying(100) NOT NULL,
    value numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    date date,
    mst_json jsonb
);
CREATE SEQUENCE public.platform_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.platform_metrics_id_seq OWNED BY public.platform_metrics.id;
CREATE TABLE public.platform_performance_monthly (
    id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    month_name character varying(20) NOT NULL,
    metric_name character varying(100) NOT NULL,
    value numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.platform_performance_monthly_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.platform_performance_monthly_id_seq OWNED BY public.platform_performance_monthly.id;
CREATE TABLE public.properties (
    id text NOT NULL,
    address text NOT NULL,
    city text,
    state text,
    zip_code text,
    price integer,
    bedrooms integer,
    bathrooms numeric(3,1),
    sqft integer,
    property_type text,
    year_built integer,
    cap_rate numeric(10,2),
    monthly_rent integer,
    listing_status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    title text,
    slug text,
    featured boolean,
    stage text,
    offers_deadline_date date,
    hoa_costs_yearly numeric,
    signature_name text,
    signature_email text,
    signature_title text,
    signature_phone text,
    signature_picture text,
    prepaid_rent_value numeric,
    asking_price_from_market_value numeric,
    prepaid_months_at_closing integer,
    contract_price_below_above_market_value numeric,
    main_photos text[],
    property_gallery_photos text[],
    feature_image text[],
    current_source_type text,
    current_source_id text,
    seller_name character varying(255),
    deal_number integer,
    number_of_half_bathrooms integer,
    lot_acres numeric(10,2),
    pool boolean,
    basement text,
    air_conditioning_type text,
    ac_age integer,
    home_owners_association text,
    what_are_the_repairs_required text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    taxes_per_year integer,
    home_insurance_yr integer,
    desired_lease_period_years integer,
    rental_security_deposit_months integer,
    number_of_years_seller_on_the_property text,
    electrical_condition text,
    loan text,
    hoa text,
    hoa_fee text,
    frequency_of_hoa text,
    rental_restrictions text,
    estimated_closing_date date,
    noc_recorded_date date,
    insurance_quote text,
    psa_execution_date date,
    property_drive text,
    psa_files jsonb,
    pippin_title_files jsonb,
    inspection_report_files jsonb,
    deal_creation_date timestamp without time zone,
    s2r_revenue integer,
    campaign_source text,
    campaign_name text,
    campaign_medium text,
    closed_with_noc text,
    total_days_in_deals integer,
    property_type_id integer,
    heating_type_id integer,
    roof_type_id integer,
    foundation_type_id integer,
    occupancy_type_id integer,
    ac_type_id uuid,
    flood_zone_id uuid,
    zoning_type_id uuid,
    condition_rating_id uuid,
    solar_ownership_id uuid,
    hoa_frequency_id uuid,
    mls_number character varying(50),
    external_id character varying(100),
    folio_number_apn character varying(100),
    stories integer,
    garage text,
    garage_cars integer,
    carport boolean,
    roof_age integer,
    roof_type text,
    plumbing_condition text,
    hvac_condition text,
    overall_condition text,
    roof_condition text,
    any_upgrades boolean,
    list_of_upgrades text,
    heating_system text,
    water_heater_type text,
    water_heater_age integer,
    flooring_type text,
    construction_type text,
    sewer_type text,
    water_source text,
    exterior_type text,
    county text,
    closest_big_city text,
    school_district text,
    elementary_rate numeric,
    middle_school_rate numeric,
    high_school_rate numeric,
    median_home_price numeric,
    median_income numeric,
    population_msa integer,
    crime_rate text,
    neighborhood_selling_pts text,
    city_selling_pts text,
    CONSTRAINT properties_current_source_type_check CHECK ((current_source_type = ANY (ARRAY['lead'::text, 'deal'::text])))
);
CREATE SEQUENCE public.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;
CREATE TABLE public.properties_lead_scoring (
    id integer NOT NULL,
    property_id text NOT NULL,
    section text,
    seller_score numeric,
    property_score numeric,
    transaction_score numeric,
    investor_score numeric,
    s2r_fee numeric
);
CREATE SEQUENCE public.properties_lead_scoring_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.properties_lead_scoring_id_seq OWNED BY public.properties_lead_scoring.id;
CREATE TABLE public.transaction_coordinator_analysis (
    id integer NOT NULL,
    property_id text,
    analyze_version integer,
    stage text,
    "analyze" text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id text
);
CREATE SEQUENCE public.property_analysis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.property_analysis_id_seq OWNED BY public.transaction_coordinator_analysis.id;
CREATE VIEW public.property_buybox_matches AS
 SELECT DISTINCT ON (bb.investor_id, p.id) bb.id AS buybox_id,
    bb.investor_id,
    p.id AS property_id,
    p.address,
    p.city,
    p.state,
    p.zip_code,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.sqft,
    p.property_type,
    p.year_built,
    p.cap_rate,
    p.monthly_rent,
    p.listing_status,
    p.created_at AS property_created_at,
    p.updated_at AS property_updated_at,
    public.calculate_match_score(( SELECT jsonb_agg(jsonb_build_object('field_name', bc.field_name, 'operator', bc.operator, 'value', bc.value)) AS jsonb_agg
           FROM public.buybox_criteria bc
          WHERE (bc.buybox_id = bb.id)), to_jsonb(p.*)) AS match_score,
    now() AS matched_at,
    false AS is_viewed,
    false AS is_saved
   FROM (public.properties p
     JOIN public.buyboxes bb ON ((bb.is_active = true)))
  WHERE ((p.listing_status = ANY (ARRAY['active'::text, 'PUBLISHED'::text, 'PSA Execution'::text, 'Analyze and Qualify'::text])) AND (public.calculate_match_score(( SELECT jsonb_agg(jsonb_build_object('field_name', bc.field_name, 'operator', bc.operator, 'value', bc.value)) AS jsonb_agg
           FROM public.buybox_criteria bc
          WHERE (bc.buybox_id = bb.id)), to_jsonb(p.*)) > (0)::numeric))
  ORDER BY bb.investor_id, p.id, (public.calculate_match_score(( SELECT jsonb_agg(jsonb_build_object('field_name', bc.field_name, 'operator', bc.operator, 'value', bc.value)) AS jsonb_agg
           FROM public.buybox_criteria bc
          WHERE (bc.buybox_id = bb.id)), to_jsonb(p.*))) DESC;
CREATE TABLE public.property_documents (
    id integer NOT NULL,
    property_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size bigint,
    document_type public.enum_property_documents_document_type NOT NULL,
    signed_url text,
    uploaded_at timestamp with time zone,
    status character varying(255) DEFAULT 'pending'::character varying,
    processed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);
CREATE SEQUENCE public.property_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.property_documents_id_seq OWNED BY public.property_documents.id;
CREATE TABLE public.property_matches (
    id text NOT NULL,
    buybox_id integer NOT NULL,
    investor_id integer NOT NULL,
    property_id text NOT NULL,
    match_score numeric NOT NULL,
    matched_at timestamp without time zone DEFAULT now(),
    is_viewed boolean DEFAULT false,
    is_saved boolean DEFAULT false,
    property jsonb NOT NULL
);
CREATE TABLE public.property_origins (
    id uuid NOT NULL,
    property_id text,
    source_type text,
    source_id text,
    event_type text,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_current boolean DEFAULT true,
    CONSTRAINT property_origins_event_type_check CHECK ((event_type = ANY (ARRAY['created_from_lead'::text, 'updated_from_lead'::text, 'created_from_deal'::text, 'updated_from_deal'::text]))),
    CONSTRAINT property_origins_source_type_check CHECK ((source_type = ANY (ARRAY['lead'::text, 'deal'::text])))
);
CREATE TABLE public.property_top_buyers (
    id integer NOT NULL,
    property_id text NOT NULL,
    investor_id bigint NOT NULL,
    sfr_score numeric,
    abodemine_score numeric,
    investorlift_score integer,
    dealmachine_score integer
);
CREATE SEQUENCE public.property_top_buyers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.property_top_buyers_id_seq OWNED BY public.property_top_buyers.id;
CREATE SEQUENCE public.property_valuations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.property_valuations_id_seq OWNED BY public.crm_property_valuations.id;
CREATE TABLE public.provider_hubspot (
    id bigint NOT NULL,
    name text,
    email text,
    phone text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company text,
    title text,
    status text,
    tags text[],
    original_data jsonb NOT NULL,
    external_id character varying(255) NOT NULL,
    investor_id bigint NOT NULL,
    updated_at timestamp without time zone
);
ALTER TABLE public.provider_hubspot ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.provider_hubspot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE public.provider_smartleads (
    id bigint NOT NULL,
    name text,
    email text,
    phone text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company text,
    original_data jsonb,
    external_id character varying(255),
    investor_id bigint,
    updated_at timestamp without time zone
);
ALTER TABLE public.provider_smartleads ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.provider_smartleads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    revoked boolean DEFAULT false
);
CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;
CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_system_role boolean DEFAULT false,
    can_view_all boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.round_robin_state (
    id integer NOT NULL,
    context character varying(100) NOT NULL,
    last_assigned_user_id integer,
    last_assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.round_robin_state IS 'Tracks the last assigned user for round robin distribution';
CREATE SEQUENCE public.round_robin_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.round_robin_state_id_seq OWNED BY public.round_robin_state.id;
CREATE TABLE public.seller_mst_google_analytics (
    id integer NOT NULL,
    channel text NOT NULL,
    sessions integer NOT NULL,
    engaged_sessions integer NOT NULL,
    engagement_rate numeric NOT NULL,
    time_per_session time with time zone NOT NULL,
    events_per_session numeric NOT NULL,
    event_count integer NOT NULL,
    key_events numeric NOT NULL,
    session_key_event_rate numeric NOT NULL,
    total_revenue numeric NOT NULL,
    bounce_rate numeric NOT NULL,
    views_per_session numeric NOT NULL,
    report_date date
);
CREATE SEQUENCE public.seller_mst_google_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.seller_mst_google_analytics_id_seq OWNED BY public.seller_mst_google_analytics.id;
CREATE TABLE public.solar_ownership_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.sonar_cold_leads (
    id integer NOT NULL,
    zoho_id character varying(50),
    lead_id character varying(50),
    property_id text,
    user_id integer DEFAULT 1,
    cold_lead_number character varying(50),
    name character varying(255),
    cold_lead_first_name character varying(255),
    cold_lead_last_name character varying(255),
    cold_lead_full_name character varying(255),
    cold_lead_status character varying(50),
    converted character varying(50),
    conversion_time timestamp without time zone,
    conversion_button_actioned_by character varying(255),
    converted_lead jsonb,
    email character varying(255),
    secondary_email character varying(255),
    phone character varying(50),
    email_opt_out boolean DEFAULT false,
    do_not_call boolean DEFAULT false,
    opt_out_dnc boolean DEFAULT false,
    street character varying(255),
    city character varying(255),
    state character varying(100),
    zip_code character varying(20),
    county character varying(255),
    property_address character varying(500),
    property_address_full character varying(500),
    latitude character varying(50),
    longitude character varying(50),
    folio_number character varying(100),
    property_type character varying(100),
    batch_data_property_type character varying(100),
    construction_type character varying(100),
    property_condition text,
    property_pre_qualification character varying(100),
    property_financial_filter character varying(100),
    square_footage integer,
    lot_size_acres numeric(10,4),
    number_of_bedrooms integer,
    number_of_full_baths integer,
    number_of_half_baths integer,
    year_built integer,
    year_bought integer,
    years_lived_at_the_property character varying(50),
    basement character varying(100),
    air_conditioning_type character varying(100),
    heating_system character varying(100),
    existing_garage character varying(100),
    existing_carport character varying(100),
    septic_or_sewer character varying(100),
    flood_zone_type character varying(100),
    mtg_balance numeric(15,2),
    mtg_pmts numeric(15,2),
    mtg_remaining_balance numeric(15,2),
    mtg_remaining_balance_sheet character varying(100),
    nd_mtg_balance numeric(15,2),
    nd_mtg_pmts numeric(15,2),
    batch_data_mtg numeric(15,2),
    asking_price character varying(100),
    owner_sales_value numeric(15,2),
    owner_rent_value numeric(15,2),
    attom_sales_value_est character varying(100),
    batch_sales_value_est numeric(15,2),
    initial_equity_est numeric(15,2),
    taxes_per_year numeric(15,2),
    sales_proceeds_needed character varying(100),
    hoa character varying(50),
    hoa_name character varying(255),
    hoa_fee numeric(15,2),
    foreclosure character varying(50),
    foreclosure_attom_batch_data character varying(50),
    estimated_foreclosure_date date,
    closest_big_city character varying(255),
    median_home_price_city numeric(15,2),
    median_income_city numeric(15,2),
    population_city integer,
    population_20_mile_radius integer,
    neighborhood_crime_rate character varying(100),
    elementary_rate character varying(50),
    middle_school_rate character varying(50),
    highschool_rate character varying(50),
    state_info character varying(100),
    seller_intention character varying(100),
    seller_segment_s character varying(255),
    seller_annual_income numeric(15,2),
    current_property_ownership character varying(100),
    homeowner_verified character varying(50),
    listed_with_a_realtor character varying(50),
    pets character varying(50),
    desired_lease_period_months integer,
    credit_score character varying(50),
    credit_score_lendingtree integer,
    campaign jsonb,
    campaign_name character varying(255),
    campaigns_source character varying(255),
    campaign_medium character varying(255),
    cold_lead_source_campaign character varying(100),
    cold_lead_medium_conversion character varying(100),
    call_attempt character varying(50),
    contact_attempt character varying(50),
    contact_result character varying(100),
    contact_id character varying(100),
    appointment_date_and_time_ex character varying(255),
    schedule_meeting_at timestamp without time zone,
    telemarks_appointment_date character varying(255),
    telemarks_note character varying(500),
    booking_url character varying(500),
    enter_workflow boolean DEFAULT false,
    enter_encouragement boolean DEFAULT false,
    journey boolean DEFAULT false,
    cold_leads_sequence character varying(50),
    sms_sequence character varying(50),
    new_sequence_email boolean DEFAULT false,
    protocol_day character varying(50),
    reason_for_failure character varying(100),
    reason_for_failure_details character varying(100),
    reason_for_failure_set_time timestamp without time zone,
    lead_external_id_lending_tree character varying(255),
    lending_tree_loan_request_purposes character varying(255),
    lending_tree_campaign_type character varying(255),
    lendingtree_url character varying(500),
    requeste_id_lending_tree character varying(255),
    tracking_num_lending_tree character varying(255),
    stage_of_journey_lending_tree character varying(255),
    address_ai boolean DEFAULT false,
    marketing_ab character varying(100),
    tag jsonb,
    transaction_id character varying(255),
    fill_info_status character varying(100),
    update_field boolean DEFAULT false,
    owner jsonb,
    host jsonb,
    point_of_contact_lookup jsonb,
    connected_to jsonb,
    currency character varying(10),
    exchange_rate numeric(15,6),
    cold_lead_created_time timestamp without time zone,
    lead_created_time timestamp without time zone,
    created_by jsonb,
    modified_by jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    connected_to_s jsonb
);
COMMENT ON TABLE public.sonar_cold_leads IS 'Cold leads synchronized from Zoho CRM';
COMMENT ON COLUMN public.sonar_cold_leads.cold_lead_status IS 'Mapped from Zoho: Cold New becomes Cold Contacted';
CREATE SEQUENCE public.sonar_cold_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.sonar_cold_leads_id_seq OWNED BY public.sonar_cold_leads.id;
CREATE TABLE public.sonar_company_default_filters (
    id integer NOT NULL,
    property_type character varying(50),
    max_lot_size integer,
    max_property_value integer,
    min_property_value integer,
    vacant_land boolean,
    min_year_built integer,
    min_sale_date date,
    min_equity integer,
    min_bathroom integer,
    min_bedroom integer,
    owner_occupied boolean DEFAULT true NOT NULL,
    off_market boolean DEFAULT true,
    number_of_properties_owned integer
);
CREATE SEQUENCE public.sonar_company_default_filters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.sonar_company_default_filters_id_seq OWNED BY public.sonar_company_default_filters.id;
CREATE TABLE public.sonar_marketing_campaigns_metrics (
    id integer NOT NULL,
    new_leads integer DEFAULT 0,
    new_leads_last_month integer DEFAULT 0,
    paid_media_leads integer DEFAULT 0,
    paid_media_leads_last_month integer DEFAULT 0,
    organic_leads numeric(10,2) DEFAULT 0,
    organic_leads_last_month numeric(10,2) DEFAULT 0,
    cold_sms_leads integer DEFAULT 0,
    cold_sms_leads_last_month integer DEFAULT 0,
    cold_email_leads numeric(10,2) DEFAULT 0,
    cold_email_leads_last_month numeric(10,2) DEFAULT 0,
    cold_call_leads numeric(10,2) DEFAULT 0,
    cold_call_leads_last_month numeric(10,2) DEFAULT 0,
    direct_mail_leads integer DEFAULT 0,
    direct_mail_leads_last_month integer DEFAULT 0,
    avg_days_to_assignment numeric(5,1) DEFAULT 0,
    avg_days_to_assignment_last_month numeric(5,1) DEFAULT 0,
    deals_created numeric(5,1) DEFAULT 0,
    deals_created_last_month numeric(5,1) DEFAULT 0,
    deals_closed integer DEFAULT 0,
    deals_closed_last_month integer DEFAULT 0,
    sales_qualified_leads integer DEFAULT 0,
    sales_qualified_leads_last_month integer DEFAULT 0,
    total_marketing_spend numeric(10,2) DEFAULT 0,
    total_marketing_spend_last_month numeric(10,2) DEFAULT 0,
    cost_per_deal numeric(10,2) DEFAULT 0,
    cost_per_deal_last_month numeric(10,2) DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    conversion_rate_last_month numeric(5,2) DEFAULT 0,
    avg_marketing_spend_rate numeric(5,2) DEFAULT 0,
    avg_marketing_spend_rate_last_month numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    new_leads_current_month integer DEFAULT 0,
    paid_media_leads_current_month integer DEFAULT 0,
    organic_leads_current_month numeric(10,2) DEFAULT 0,
    cold_sms_leads_current_month integer DEFAULT 0,
    cold_email_leads_current_month numeric(10,2) DEFAULT 0,
    cold_call_leads_current_month numeric(10,2) DEFAULT 0,
    direct_mail_leads_current_month integer DEFAULT 0,
    avg_days_to_assignment_current_month numeric(5,1) DEFAULT 0,
    deals_created_current_month numeric(5,1) DEFAULT 0,
    deals_closed_current_month integer DEFAULT 0,
    sales_qualified_leads_current_month integer DEFAULT 0,
    total_marketing_spend_current_month numeric(10,2) DEFAULT 0,
    cost_per_deal_current_month numeric(10,2) DEFAULT 0,
    conversion_rate_current_month numeric(5,2) DEFAULT 0,
    avg_marketing_spend_rate_current_month numeric(5,2) DEFAULT 0,
    mql_leads integer DEFAULT 0,
    mql_leads_current_month integer DEFAULT 0,
    mql_leads_last_month integer DEFAULT 0,
    gross_revenue numeric(15,2) DEFAULT 0,
    gross_revenue_current_month numeric(15,2) DEFAULT 0,
    gross_revenue_last_month numeric(15,2) DEFAULT 0,
    net_revenue numeric(15,2) DEFAULT 0,
    net_revenue_current_month numeric(15,2) DEFAULT 0,
    net_revenue_last_month numeric(15,2) DEFAULT 0
);
CREATE SEQUENCE public.sonar_marketing_campaigns_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.sonar_marketing_campaigns_metrics_id_seq OWNED BY public.sonar_marketing_campaigns_metrics.id;
CREATE TABLE public.sync_records (
    id integer NOT NULL,
    sync_session_id character varying(100) NOT NULL,
    investor_id integer,
    external_id character varying(100) NOT NULL,
    operation character varying(20) NOT NULL,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    processed_at timestamp without time zone DEFAULT now(),
    CONSTRAINT sync_records_operation_check CHECK (((operation)::text = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])))
);
CREATE SEQUENCE public.sync_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.sync_records_id_seq OWNED BY public.sync_records.id;
CREATE TABLE public.sync_sessions (
    id character varying(100) NOT NULL,
    source character varying(50) NOT NULL,
    started_at timestamp without time zone NOT NULL,
    completed_at timestamp without time zone,
    status character varying(20) NOT NULL,
    hubspot_total_count integer DEFAULT 0 NOT NULL,
    processed_count integer DEFAULT 0 NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT sync_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[])))
);
CREATE TABLE public.transaction_coordinator_files (
    id integer NOT NULL,
    property_id character varying(255) NOT NULL,
    file_name character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    document_type character varying(255) NOT NULL,
    signed_url text NOT NULL,
    uploaded_at timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'uploaded'::character varying,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    signed_url_expires_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.transaction_coordinator_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.transaction_coordinator_files_id_seq OWNED BY public.transaction_coordinator_files.id;
CREATE TABLE public.transaction_coordinator_mandatory_files (
    property_id text NOT NULL,
    mandatory_file jsonb,
    property_status text,
    created_at date,
    updated_at date
);
CREATE TABLE public.transactions (
    id integer NOT NULL,
    investor_id bigint NOT NULL,
    property_id text NOT NULL,
    transaction_type character varying(50) NOT NULL,
    amount numeric,
    created_at timestamp without time zone DEFAULT now()
);
CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;
CREATE TABLE public.transcribed_conversations (
    id bigint NOT NULL,
    property_id text NOT NULL,
    conversation jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    modified_by integer
);
CREATE SEQUENCE public.transcribed_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.transcribed_conversations_id_seq OWNED BY public.transcribed_conversations.id;
CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    google_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    hubspot_owner_id character varying(255)
);
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
CREATE TABLE public.zoho_token (
    token text NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    modified_date timestamp without time zone NOT NULL
);
CREATE TABLE public.zoning_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE ONLY public.buybox_criteria ALTER COLUMN id SET DEFAULT nextval('public.buybox_criteria_id_seq'::regclass);
ALTER TABLE ONLY public.buyboxes ALTER COLUMN id SET DEFAULT nextval('public.buyboxes_id_seq'::regclass);
ALTER TABLE ONLY public.crm_activities ALTER COLUMN id SET DEFAULT nextval('public.crm_activities_id_seq'::regclass);
ALTER TABLE ONLY public.crm_activity_types ALTER COLUMN id SET DEFAULT nextval('public.crm_activity_types_id_seq'::regclass);
ALTER TABLE ONLY public.crm_campaign_mediums ALTER COLUMN id SET DEFAULT nextval('public.crm_campaign_mediums_id_seq'::regclass);
ALTER TABLE ONLY public.crm_campaign_sources ALTER COLUMN id SET DEFAULT nextval('public.crm_campaign_sources_id_seq'::regclass);
ALTER TABLE ONLY public.crm_campaigns ALTER COLUMN id SET DEFAULT nextval('public.crm_campaigns_id_seq'::regclass);
ALTER TABLE ONLY public.crm_deals ALTER COLUMN deal_number SET DEFAULT nextval('public.crm_deals_deal_number_seq'::regclass);
ALTER TABLE ONLY public.crm_files ALTER COLUMN id SET DEFAULT nextval('public.crm_files_id_seq'::regclass);
ALTER TABLE ONLY public.crm_foundation_types ALTER COLUMN id SET DEFAULT nextval('public.crm_foundation_types_id_seq'::regclass);
ALTER TABLE ONLY public.crm_heating_types ALTER COLUMN id SET DEFAULT nextval('public.crm_heating_types_id_seq'::regclass);
ALTER TABLE ONLY public.crm_lead_status ALTER COLUMN id SET DEFAULT nextval('public.crm_lead_status_id_seq'::regclass);
ALTER TABLE ONLY public.crm_leads ALTER COLUMN lead_number SET DEFAULT nextval('public.crm_leads_lead_number_seq'::regclass);
ALTER TABLE ONLY public.crm_occupancy_types ALTER COLUMN id SET DEFAULT nextval('public.crm_occupancy_types_id_seq'::regclass);
ALTER TABLE ONLY public.crm_offer_status ALTER COLUMN id SET DEFAULT nextval('public.crm_offer_status_id_seq'::regclass);
ALTER TABLE ONLY public.crm_property_files ALTER COLUMN id SET DEFAULT nextval('public.crm_property_files_id_seq'::regclass);
ALTER TABLE ONLY public.crm_property_financials ALTER COLUMN id SET DEFAULT nextval('public.crm_property_financials_id_seq'::regclass);
ALTER TABLE ONLY public.crm_property_investor_offers ALTER COLUMN id SET DEFAULT nextval('public.crm_property_investor_offers_id_seq'::regclass);
ALTER TABLE ONLY public.crm_property_realtor_info ALTER COLUMN id SET DEFAULT nextval('public.crm_property_realtor_info_id_seq'::regclass);
ALTER TABLE ONLY public.crm_property_sellers ALTER COLUMN id SET DEFAULT nextval('public.crm_property_sellers_id_seq'::regclass);
ALTER TABLE ONLY public.crm_property_types ALTER COLUMN id SET DEFAULT nextval('public.crm_property_types_id_seq'::regclass);
ALTER TABLE ONLY public.crm_property_valuations ALTER COLUMN id SET DEFAULT nextval('public.property_valuations_id_seq'::regclass);
ALTER TABLE ONLY public.crm_roof_types ALTER COLUMN id SET DEFAULT nextval('public.crm_roof_types_id_seq'::regclass);
ALTER TABLE ONLY public.crm_sellers ALTER COLUMN id SET DEFAULT nextval('public.crm_sellers_id_seq'::regclass);
ALTER TABLE ONLY public.crm_transactions ALTER COLUMN id SET DEFAULT nextval('public.crm_transactions_id_seq'::regclass);
ALTER TABLE ONLY public.csv_mapping_configurations ALTER COLUMN config_id SET DEFAULT nextval('public.csv_mapping_configurations_config_id_seq'::regclass);
ALTER TABLE ONLY public.deal_harmony_custom_expenses ALTER COLUMN id SET DEFAULT nextval('public.deal_harmony_custom_expenses_id_seq'::regclass);
ALTER TABLE ONLY public.deal_harmony_custom_scenarios ALTER COLUMN id SET DEFAULT nextval('public.deal_harmony_custom_scenarios_id_seq'::regclass);
ALTER TABLE ONLY public.deal_harmony_documents ALTER COLUMN id SET DEFAULT nextval('public.deal_harmony_documents_id_seq'::regclass);
ALTER TABLE ONLY public.deal_harmony_offers ALTER COLUMN id SET DEFAULT nextval('public.deal_harmony_offers_id_seq'::regclass);
ALTER TABLE ONLY public.deal_harmony_properties ALTER COLUMN id SET DEFAULT nextval('public.deal_harmony_properties_id_seq'::regclass);
ALTER TABLE ONLY public.disposition_strategy_jobs ALTER COLUMN id SET DEFAULT nextval('public.disposition_strategy_jobs_id_seq'::regclass);
ALTER TABLE ONLY public.expense_tool_mappings ALTER COLUMN id SET DEFAULT nextval('public.expense_tool_mappings_id_seq'::regclass);
ALTER TABLE ONLY public.expenses_paid_media ALTER COLUMN id SET DEFAULT nextval('public.expenses_paid_media_id_seq'::regclass);
ALTER TABLE ONLY public.expenses_per_deal ALTER COLUMN id SET DEFAULT nextval('public.expenses_per_deal_id_seq'::regclass);
ALTER TABLE ONLY public.expenses_variable_history ALTER COLUMN id SET DEFAULT nextval('public.expenses_variable_history_id_seq'::regclass);
ALTER TABLE ONLY public.ga4_weekly_data ALTER COLUMN id SET DEFAULT nextval('public.ga4_weekly_data_id_seq'::regclass);
ALTER TABLE ONLY public.general_expenses ALTER COLUMN id SET DEFAULT nextval('public.general_expenses_id_seq'::regclass);
ALTER TABLE ONLY public.investor_emails ALTER COLUMN email_id SET DEFAULT nextval('public.investor_emails_email_id_seq'::regclass);
ALTER TABLE ONLY public.investor_phones ALTER COLUMN phone_id SET DEFAULT nextval('public.investor_phones_phone_id_seq'::regclass);
ALTER TABLE ONLY public.investors ALTER COLUMN investor_id SET DEFAULT nextval('public.investors_investor_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_investors_batch_leads ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_investors_batch_leads_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_investors_deal_machine ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_investors_deal_machine_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_investors_investorbase ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_investors_investorbase_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_investors_investorlift ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_investors_investorlift_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_investors_propstream ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_investors_propstream_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_investors_sfr_analytics ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_investors_sfr_analytics_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_paid_media_google_ads ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_paid_media_google_ads_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_quickemail ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_quickemail_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_sms_simpletexting ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_sms_id_seq'::regclass);
ALTER TABLE ONLY public.mst_campaign_sms_simpletexting_phone_numbers ALTER COLUMN id SET DEFAULT nextval('public.mst_campaign_sms_simpletexting_phone_numbers_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_campaign_sms ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_campaign_sms_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_data_sources ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_data_sources_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_direct_mail ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_direct_mail_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_emails_icomm ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_emails_icomm_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_expenses_per_campaign ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_expenses_per_campaign_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_fixed_expenses ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_fixed_expenses_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_marketing_channels ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_marketing_channels_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_markets ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_markets_id_seq'::regclass);
ALTER TABLE ONLY public.mst_cold_variable_expenses ALTER COLUMN id SET DEFAULT nextval('public.mst_cold_variable_expenses_id_seq'::regclass);
ALTER TABLE ONLY public.mst_properties_property_radar ALTER COLUMN id SET DEFAULT nextval('public.mst_properties_property_radar_id_seq'::regclass);
ALTER TABLE ONLY public.mst_sellers_properties_pipeline ALTER COLUMN id SET DEFAULT nextval('public.mst_sellers_properties_pipeline_id_seq'::regclass);
ALTER TABLE ONLY public.mst_sellers_stage_history ALTER COLUMN id SET DEFAULT nextval('public.mst_sellers_stage_history_id_seq'::regclass);
ALTER TABLE ONLY public.mst_skip_tracing_batch_data ALTER COLUMN id SET DEFAULT nextval('public.mst_skip_tracing_batch_data_id_seq'::regclass);
ALTER TABLE ONLY public.mst_sonar_campaign_sellers ALTER COLUMN id SET DEFAULT nextval('public.mst_sonar_campaign_sellers_id_seq'::regclass);
ALTER TABLE ONLY public.mst_sonar_campaigns ALTER COLUMN id SET DEFAULT nextval('public.mst_sonar_campaigns_id_seq'::regclass);
ALTER TABLE ONLY public.mst_sonar_monthly_expenses ALTER COLUMN id SET DEFAULT nextval('public.mst_sonar_monthly_expenses_id_seq'::regclass);
ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);
ALTER TABLE ONLY public.platform_metrics ALTER COLUMN id SET DEFAULT nextval('public.platform_metrics_id_seq'::regclass);
ALTER TABLE ONLY public.platform_performance_monthly ALTER COLUMN id SET DEFAULT nextval('public.platform_performance_monthly_id_seq'::regclass);
ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);
ALTER TABLE ONLY public.properties_lead_scoring ALTER COLUMN id SET DEFAULT nextval('public.properties_lead_scoring_id_seq'::regclass);
ALTER TABLE ONLY public.property_documents ALTER COLUMN id SET DEFAULT nextval('public.property_documents_id_seq'::regclass);
ALTER TABLE ONLY public.property_top_buyers ALTER COLUMN id SET DEFAULT nextval('public.property_top_buyers_id_seq'::regclass);
ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);
ALTER TABLE ONLY public.round_robin_state ALTER COLUMN id SET DEFAULT nextval('public.round_robin_state_id_seq'::regclass);
ALTER TABLE ONLY public.seller_mst_google_analytics ALTER COLUMN id SET DEFAULT nextval('public.seller_mst_google_analytics_id_seq'::regclass);
ALTER TABLE ONLY public.sonar_cold_leads ALTER COLUMN id SET DEFAULT nextval('public.sonar_cold_leads_id_seq'::regclass);
ALTER TABLE ONLY public.sonar_company_default_filters ALTER COLUMN id SET DEFAULT nextval('public.sonar_company_default_filters_id_seq'::regclass);
ALTER TABLE ONLY public.sonar_marketing_campaigns_metrics ALTER COLUMN id SET DEFAULT nextval('public.sonar_marketing_campaigns_metrics_id_seq'::regclass);
ALTER TABLE ONLY public.sync_records ALTER COLUMN id SET DEFAULT nextval('public.sync_records_id_seq'::regclass);
ALTER TABLE ONLY public.transaction_coordinator_analysis ALTER COLUMN id SET DEFAULT nextval('public.property_analysis_id_seq'::regclass);
ALTER TABLE ONLY public.transaction_coordinator_files ALTER COLUMN id SET DEFAULT nextval('public.transaction_coordinator_files_id_seq'::regclass);
ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);
ALTER TABLE ONLY public.transcribed_conversations ALTER COLUMN id SET DEFAULT nextval('public.transcribed_conversations_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY ai.agno_component_configs
    ADD CONSTRAINT agno_component_configs_pkey PRIMARY KEY (component_id, version);
ALTER TABLE ONLY ai.agno_component_links
    ADD CONSTRAINT agno_component_links_pkey PRIMARY KEY (parent_component_id, parent_version, link_kind, link_key);
ALTER TABLE ONLY ai.agno_components
    ADD CONSTRAINT agno_components_pkey PRIMARY KEY (component_id);
ALTER TABLE ONLY ai.agno_eval_runs
    ADD CONSTRAINT agno_eval_runs_pkey PRIMARY KEY (run_id);
ALTER TABLE ONLY ai.agno_knowledge
    ADD CONSTRAINT agno_knowledge_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.agno_learnings
    ADD CONSTRAINT agno_learnings_pkey PRIMARY KEY (learning_id);
ALTER TABLE ONLY ai.agno_memories
    ADD CONSTRAINT agno_memories_pkey PRIMARY KEY (memory_id);
ALTER TABLE ONLY ai.agno_metrics
    ADD CONSTRAINT agno_metrics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.agno_metrics
    ADD CONSTRAINT agno_metrics_uq_metrics_date_period UNIQUE (date, aggregation_period);
ALTER TABLE ONLY ai.agno_schema_versions
    ADD CONSTRAINT agno_schema_versions_pkey PRIMARY KEY (table_name);
ALTER TABLE ONLY ai.agno_sessions
    ADD CONSTRAINT agno_sessions_uq_session_id UNIQUE (session_id);
ALTER TABLE ONLY propertyradar_agent.agno_component_configs
    ADD CONSTRAINT agno_component_configs_pkey PRIMARY KEY (component_id, version);
ALTER TABLE ONLY propertyradar_agent.agno_component_links
    ADD CONSTRAINT agno_component_links_pkey PRIMARY KEY (parent_component_id, parent_version, link_kind, link_key);
ALTER TABLE ONLY propertyradar_agent.agno_components
    ADD CONSTRAINT agno_components_pkey PRIMARY KEY (component_id);
ALTER TABLE ONLY propertyradar_agent.agno_eval_runs
    ADD CONSTRAINT agno_eval_runs_pkey PRIMARY KEY (run_id);
ALTER TABLE ONLY propertyradar_agent.agno_knowledge
    ADD CONSTRAINT agno_knowledge_pkey PRIMARY KEY (id);
ALTER TABLE ONLY propertyradar_agent.agno_learnings
    ADD CONSTRAINT agno_learnings_pkey PRIMARY KEY (learning_id);
ALTER TABLE ONLY propertyradar_agent.agno_memories
    ADD CONSTRAINT agno_memories_pkey PRIMARY KEY (memory_id);
ALTER TABLE ONLY propertyradar_agent.agno_metrics
    ADD CONSTRAINT agno_metrics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY propertyradar_agent.agno_metrics
    ADD CONSTRAINT agno_metrics_uq_metrics_date_period UNIQUE (date, aggregation_period);
ALTER TABLE ONLY propertyradar_agent.agno_schema_versions
    ADD CONSTRAINT agno_schema_versions_pkey PRIMARY KEY (table_name);
ALTER TABLE ONLY propertyradar_agent.agno_sessions
    ADD CONSTRAINT agno_sessions_uq_session_id UNIQUE (session_id);
ALTER TABLE ONLY public.crm_ac_types
    ADD CONSTRAINT ac_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_ac_types
    ADD CONSTRAINT ac_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agno_approvals
    ADD CONSTRAINT agno_approvals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agno_component_configs
    ADD CONSTRAINT agno_component_configs_pkey PRIMARY KEY (component_id, version);
ALTER TABLE ONLY public.agno_component_links
    ADD CONSTRAINT agno_component_links_pkey PRIMARY KEY (parent_component_id, parent_version, link_kind, link_key);
ALTER TABLE ONLY public.agno_components
    ADD CONSTRAINT agno_components_pkey PRIMARY KEY (component_id);
ALTER TABLE ONLY public.agno_eval_runs
    ADD CONSTRAINT agno_eval_runs_pkey PRIMARY KEY (run_id);
ALTER TABLE ONLY public.agno_knowledge
    ADD CONSTRAINT agno_knowledge_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agno_learnings
    ADD CONSTRAINT agno_learnings_pkey PRIMARY KEY (learning_id);
ALTER TABLE ONLY public.agno_memories
    ADD CONSTRAINT agno_memories_pkey PRIMARY KEY (memory_id);
ALTER TABLE ONLY public.agno_metrics
    ADD CONSTRAINT agno_metrics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agno_metrics
    ADD CONSTRAINT agno_metrics_uq_metrics_date_period UNIQUE (date, aggregation_period);
ALTER TABLE ONLY public.agno_schedule_runs
    ADD CONSTRAINT agno_schedule_runs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agno_schedules
    ADD CONSTRAINT agno_schedules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agno_schema_versions
    ADD CONSTRAINT agno_schema_versions_pkey PRIMARY KEY (table_name);
ALTER TABLE ONLY public.agno_sessions
    ADD CONSTRAINT agno_sessions_uq_session_id UNIQUE (session_id);
ALTER TABLE ONLY public.agno_spans
    ADD CONSTRAINT agno_spans_pkey PRIMARY KEY (span_id);
ALTER TABLE ONLY public.agno_traces
    ADD CONSTRAINT agno_traces_pkey PRIMARY KEY (trace_id);
ALTER TABLE ONLY public.buybox_criteria
    ADD CONSTRAINT buybox_criteria_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.buyboxes
    ADD CONSTRAINT buyboxes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.condition_ratings
    ADD CONSTRAINT condition_ratings_name_key UNIQUE (name);
ALTER TABLE ONLY public.condition_ratings
    ADD CONSTRAINT condition_ratings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_activity_types
    ADD CONSTRAINT crm_activity_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_activity_types
    ADD CONSTRAINT crm_activity_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_calendar_events
    ADD CONSTRAINT crm_calendar_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_campaign_mediums
    ADD CONSTRAINT crm_campaign_mediums_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_campaign_mediums
    ADD CONSTRAINT crm_campaign_mediums_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_campaign_sources
    ADD CONSTRAINT crm_campaign_sources_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_campaign_sources
    ADD CONSTRAINT crm_campaign_sources_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_campaigns
    ADD CONSTRAINT crm_campaigns_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_deal_number_key UNIQUE (deal_number);
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_lead_id_key UNIQUE (lead_id);
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_documents
    ADD CONSTRAINT crm_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_employees
    ADD CONSTRAINT crm_employees_employee_code_key UNIQUE (employee_code);
ALTER TABLE ONLY public.crm_employees
    ADD CONSTRAINT crm_employees_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_files
    ADD CONSTRAINT crm_files_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_foundation_types
    ADD CONSTRAINT crm_foundation_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_foundation_types
    ADD CONSTRAINT crm_foundation_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_heating_types
    ADD CONSTRAINT crm_heating_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_heating_types
    ADD CONSTRAINT crm_heating_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_lead_status
    ADD CONSTRAINT crm_lead_status_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_lead_status
    ADD CONSTRAINT crm_lead_status_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_lead_number_key UNIQUE (lead_number);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_notification_types
    ADD CONSTRAINT crm_notification_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_notifications
    ADD CONSTRAINT crm_notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_occupancy_types
    ADD CONSTRAINT crm_occupancy_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_occupancy_types
    ADD CONSTRAINT crm_occupancy_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_offer_status
    ADD CONSTRAINT crm_offer_status_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_offer_status
    ADD CONSTRAINT crm_offer_status_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_comps
    ADD CONSTRAINT crm_property_comps_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_files
    ADD CONSTRAINT crm_property_files_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_financials
    ADD CONSTRAINT crm_property_financials_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_foreclosures
    ADD CONSTRAINT crm_property_foreclosures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_investor_offers
    ADD CONSTRAINT crm_property_investor_offers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_liens
    ADD CONSTRAINT crm_property_liens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_mortgages
    ADD CONSTRAINT crm_property_mortgages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_realtor_info
    ADD CONSTRAINT crm_property_realtor_info_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_sellers
    ADD CONSTRAINT crm_property_sellers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_types
    ADD CONSTRAINT crm_property_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_property_types
    ADD CONSTRAINT crm_property_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_roles
    ADD CONSTRAINT crm_roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_roles
    ADD CONSTRAINT crm_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_roof_types
    ADD CONSTRAINT crm_roof_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.crm_roof_types
    ADD CONSTRAINT crm_roof_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_sellers
    ADD CONSTRAINT crm_sellers_lead_unique UNIQUE (lead_id);
ALTER TABLE ONLY public.crm_sellers
    ADD CONSTRAINT crm_sellers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_stages
    ADD CONSTRAINT crm_stages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_transactions
    ADD CONSTRAINT crm_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_users_roles
    ADD CONSTRAINT crm_users_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_workflow_executions
    ADD CONSTRAINT crm_workflow_executions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_workflow_rules
    ADD CONSTRAINT crm_workflow_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.csv_mapping_configurations
    ADD CONSTRAINT csv_mapping_configurations_pkey PRIMARY KEY (config_id);
ALTER TABLE ONLY public.deal_harmony_custom_expenses
    ADD CONSTRAINT deal_harmony_custom_expenses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deal_harmony_custom_scenarios
    ADD CONSTRAINT deal_harmony_custom_scenarios_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deal_harmony_documents
    ADD CONSTRAINT deal_harmony_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deal_harmony_offers
    ADD CONSTRAINT deal_harmony_offers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deal_harmony_properties
    ADD CONSTRAINT deal_harmony_properties_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dialpad_call_events
    ADD CONSTRAINT dialpad_call_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dialpad_sms_events
    ADD CONSTRAINT dialpad_sms_events_external_id_key UNIQUE (external_id);
ALTER TABLE ONLY public.dialpad_sms_events
    ADD CONSTRAINT dialpad_sms_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.disposition_strategy
    ADD CONSTRAINT disposition_address UNIQUE (address);
ALTER TABLE ONLY public.disposition_strategy_jobs
    ADD CONSTRAINT disposition_strategy_jobs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.disposition_strategy
    ADD CONSTRAINT disposition_strategy_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.expense_tool_mappings
    ADD CONSTRAINT expense_tool_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.expense_tool_mappings
    ADD CONSTRAINT expense_tool_mappings_unique UNIQUE (fixed_expense_id, source_table);
ALTER TABLE ONLY public.expenses_paid_media
    ADD CONSTRAINT expenses_paid_media_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.expenses_per_deal
    ADD CONSTRAINT expenses_per_deal_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.expenses_per_deal
    ADD CONSTRAINT expenses_per_deal_unique UNIQUE (deal_id, tool_name, tool_type);
ALTER TABLE ONLY public.expenses_variable_history
    ADD CONSTRAINT expenses_variable_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.expenses_variable_history
    ADD CONSTRAINT expenses_variable_history_unique UNIQUE (deal_id, tool_name, tool_type, snapshot_date);
ALTER TABLE ONLY public.filename_jobs
    ADD CONSTRAINT filename_jobs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.flood_zones
    ADD CONSTRAINT flood_zones_code_key UNIQUE (code);
ALTER TABLE ONLY public.flood_zones
    ADD CONSTRAINT flood_zones_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ga4_weekly_data
    ADD CONSTRAINT ga4_weekly_data_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.general_expenses
    ADD CONSTRAINT general_expenses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.general_expenses
    ADD CONSTRAINT general_expenses_tool_name_type_of_tool_key UNIQUE (tool_name, type_of_tool);
ALTER TABLE ONLY public.hoa_frequencies
    ADD CONSTRAINT hoa_frequencies_name_key UNIQUE (name);
ALTER TABLE ONLY public.hoa_frequencies
    ADD CONSTRAINT hoa_frequencies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.investor_emails
    ADD CONSTRAINT investor_emails_pkey PRIMARY KEY (email_id);
ALTER TABLE ONLY public.investor_phones
    ADD CONSTRAINT investor_phones_pkey PRIMARY KEY (phone_id);
ALTER TABLE ONLY public.investors
    ADD CONSTRAINT investors_pkey PRIMARY KEY (investor_id);
ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.marketing
    ADD CONSTRAINT marketing_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_ai_calling
    ADD CONSTRAINT mst_campaign_ai_calling_campaign_id_key UNIQUE (campaign_id);
ALTER TABLE ONLY public.mst_campaign_ai_calling
    ADD CONSTRAINT mst_campaign_ai_calling_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_email_hubspot
    ADD CONSTRAINT mst_campaign_email_hubspot_campaign_report_key UNIQUE (campaign_id, report_date);
ALTER TABLE ONLY public.mst_campaign_email_hubspot
    ADD CONSTRAINT mst_campaign_email_hubspot_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_human_calling
    ADD CONSTRAINT mst_campaign_human_calling_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_investor_lift
    ADD CONSTRAINT mst_campaign_investor_lift_deal_campaign_start_uniq UNIQUE (deal_id, campaign_name, campaign_start_time);
ALTER TABLE ONLY public.mst_campaign_investor_lift
    ADD CONSTRAINT mst_campaign_investor_lift_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_investors_batch_leads
    ADD CONSTRAINT mst_campaign_investors_batch_leads_deal_number_key UNIQUE (deal_number);
ALTER TABLE ONLY public.mst_campaign_investors_batch_leads
    ADD CONSTRAINT mst_campaign_investors_batch_leads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_investors_deal_machine
    ADD CONSTRAINT mst_campaign_investors_deal_machine_deal_number_key UNIQUE (deal_number);
ALTER TABLE ONLY public.mst_campaign_investors_deal_machine
    ADD CONSTRAINT mst_campaign_investors_deal_machine_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_investors_investorbase
    ADD CONSTRAINT mst_campaign_investors_investorbase_deal_number_key UNIQUE (deal_number);
ALTER TABLE ONLY public.mst_campaign_investors_investorbase
    ADD CONSTRAINT mst_campaign_investors_investorbase_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_investors_investorlift
    ADD CONSTRAINT mst_campaign_investors_investorlift_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_investors_propstream
    ADD CONSTRAINT mst_campaign_investors_propstream_deal_number_key UNIQUE (deal_number);
ALTER TABLE ONLY public.mst_campaign_investors_propstream
    ADD CONSTRAINT mst_campaign_investors_propstream_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_investors_sfr_analytics
    ADD CONSTRAINT mst_campaign_investors_sfr_analytics_deal_number_key UNIQUE (deal_number);
ALTER TABLE ONLY public.mst_campaign_investors_sfr_analytics
    ADD CONSTRAINT mst_campaign_investors_sfr_analytics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_paid_media_facebook
    ADD CONSTRAINT mst_campaign_paid_media_facebook_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_paid_media_google_ads
    ADD CONSTRAINT mst_campaign_paid_media_google_ads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_paid_media_google_analytics
    ADD CONSTRAINT mst_campaign_paid_media_google_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_paid_media_reddit
    ADD CONSTRAINT mst_campaign_paid_media_reddit_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_quickemail
    ADD CONSTRAINT mst_campaign_quickemail_campaign_id_key UNIQUE (campaign_id);
ALTER TABLE ONLY public.mst_campaign_quickemail
    ADD CONSTRAINT mst_campaign_quickemail_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_sms_simpletexting
    ADD CONSTRAINT mst_campaign_sms_campaign_name_unique UNIQUE (campaign_name);
ALTER TABLE ONLY public.mst_campaign_sms_hubspot
    ADD CONSTRAINT mst_campaign_sms_hubspot_campaign_report_key UNIQUE (campaign_id, report_date);
ALTER TABLE ONLY public.mst_campaign_sms_hubspot
    ADD CONSTRAINT mst_campaign_sms_hubspot_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_sms_simpletexting_phone_numbers
    ADD CONSTRAINT mst_campaign_sms_simpletexting_phone_numbers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_social_network
    ADD CONSTRAINT mst_campaign_social_network_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaign_social_network
    ADD CONSTRAINT mst_campaign_social_network_social_network_report_date_key UNIQUE (social_network, report_date);
ALTER TABLE ONLY public.mst_campaign_website
    ADD CONSTRAINT mst_campaign_website_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_campaigns
    ADD CONSTRAINT mst_campaigns_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_channels
    ADD CONSTRAINT mst_channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_campaign_sms
    ADD CONSTRAINT mst_cold_campaign_sms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_data_sources
    ADD CONSTRAINT mst_cold_data_sources_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_direct_mail
    ADD CONSTRAINT mst_cold_direct_mail_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_emails_icomm
    ADD CONSTRAINT mst_cold_emails_icomm_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_expenses_per_campaign
    ADD CONSTRAINT mst_cold_expenses_per_campaign_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_fixed_expenses
    ADD CONSTRAINT mst_cold_fixed_expenses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_marketing_channels
    ADD CONSTRAINT mst_cold_marketing_channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_markets
    ADD CONSTRAINT mst_cold_markets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_cold_variable_expenses
    ADD CONSTRAINT mst_cold_variable_expenses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_data_sources
    ADD CONSTRAINT mst_data_sources_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_fb_meta_ads
    ADD CONSTRAINT mst_fb_meta_ads_provider_campaign_id_report_date_key UNIQUE (provider_campaign_id, report_date);
ALTER TABLE ONLY public.mst_field_mappings
    ADD CONSTRAINT mst_field_mappings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_leads_for_metrics
    ADD CONSTRAINT mst_leads_for_metrics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_offers
    ADD CONSTRAINT mst_offers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_properties_property_radar
    ADD CONSTRAINT mst_properties_property_radar_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_property_radar_lists
    ADD CONSTRAINT mst_property_radar_lists_pkey PRIMARY KEY (list_id);
ALTER TABLE ONLY public.mst_sellers_properties_pipeline
    ADD CONSTRAINT mst_sellers_properties_pipeline_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_sellers_properties_pipeline
    ADD CONSTRAINT mst_sellers_properties_pipeline_property_radar_id_key UNIQUE (property_radar_id);
ALTER TABLE ONLY public.mst_sellers_stage_history
    ADD CONSTRAINT mst_sellers_stage_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_skip_tracing_batch_data
    ADD CONSTRAINT mst_skip_tracing_batch_data_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_sonar_campaign_sellers
    ADD CONSTRAINT mst_sonar_campaign_sellers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_sonar_campaigns
    ADD CONSTRAINT mst_sonar_campaigns_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mst_sonar_monthly_expenses
    ADD CONSTRAINT mst_sonar_monthly_expenses_month_key UNIQUE (month);
ALTER TABLE ONLY public.mst_sonar_monthly_expenses
    ADD CONSTRAINT mst_sonar_monthly_expenses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_metrics
    ADD CONSTRAINT platform_metrics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_performance_monthly
    ADD CONSTRAINT platform_performance_monthly_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.properties_lead_scoring
    ADD CONSTRAINT properties_lead_scoring_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transaction_coordinator_analysis
    ADD CONSTRAINT property_analysis_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.property_documents
    ADD CONSTRAINT property_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deal_harmony_properties
    ADD CONSTRAINT property_id_unique UNIQUE (property_id);
ALTER TABLE ONLY public.property_matches
    ADD CONSTRAINT property_matches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.property_origins
    ADD CONSTRAINT property_origins_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.property_top_buyers
    ADD CONSTRAINT property_top_buyers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_property_valuations
    ADD CONSTRAINT property_valuations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.provider_hubspot
    ADD CONSTRAINT provider_hubspot_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.provider_smartleads
    ADD CONSTRAINT provider_smartleads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.round_robin_state
    ADD CONSTRAINT round_robin_state_context_key UNIQUE (context);
ALTER TABLE ONLY public.round_robin_state
    ADD CONSTRAINT round_robin_state_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.seller_mst_google_analytics
    ADD CONSTRAINT seller_mst_google_analytics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.seller_mst_google_analytics
    ADD CONSTRAINT seller_mst_google_analytics_report_date_channel_key UNIQUE (report_date, channel);
ALTER TABLE ONLY public.solar_ownership_types
    ADD CONSTRAINT solar_ownership_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.solar_ownership_types
    ADD CONSTRAINT solar_ownership_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sonar_cold_leads
    ADD CONSTRAINT sonar_cold_leads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sonar_cold_leads
    ADD CONSTRAINT sonar_cold_leads_zoho_id_key UNIQUE (zoho_id);
ALTER TABLE ONLY public.sonar_company_default_filters
    ADD CONSTRAINT sonar_company_default_filters_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sonar_marketing_campaigns_metrics
    ADD CONSTRAINT sonar_marketing_campaigns_metrics_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_records
    ADD CONSTRAINT sync_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sync_sessions
    ADD CONSTRAINT sync_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transaction_coordinator_files
    ADD CONSTRAINT transaction_coordinator_files_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transaction_coordinator_mandatory_files
    ADD CONSTRAINT transaction_coordinator_mandatory_files_pkey PRIMARY KEY (property_id);
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transcribed_conversations
    ADD CONSTRAINT transcribed_conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.investor_emails
    ADD CONSTRAINT uk_investor_emails_email UNIQUE (investor_id, email);
ALTER TABLE ONLY public.investor_phones
    ADD CONSTRAINT uk_investor_phones_investor_phone UNIQUE (investor_id, phone);
ALTER TABLE ONLY public.provider_hubspot
    ADD CONSTRAINT uk_provider_hubspot_external_id UNIQUE (external_id);
ALTER TABLE ONLY public.mst_campaign_paid_media_google_ads
    ADD CONSTRAINT unique_ads_campaign_date UNIQUE (campaign_id, report_date, campaign_name);
ALTER TABLE ONLY public.mst_campaign_paid_media_google_analytics
    ADD CONSTRAINT unique_analytics_source_medium_campaign UNIQUE (report_date, source, medium, campaign);
ALTER TABLE ONLY public.mst_campaign_sms_simpletexting
    ADD CONSTRAINT unique_campaign_date UNIQUE (campaign_id, report_date);
ALTER TABLE ONLY public.mst_cold_campaign_sms
    ADD CONSTRAINT unique_campaign_date_cold UNIQUE (campaign_name, campaign_date);
ALTER TABLE ONLY public.mst_sonar_campaign_sellers
    ADD CONSTRAINT unique_campaign_seller UNIQUE (campaign_id, seller_id);
ALTER TABLE ONLY public.mst_cold_expenses_per_campaign
    ADD CONSTRAINT unique_campaign_tool UNIQUE (campaign_id, tool_name);
ALTER TABLE ONLY public.sonar_cold_leads
    ADD CONSTRAINT unique_cold_lead_zoho_id UNIQUE (zoho_id);
ALTER TABLE ONLY public.mst_campaign_paid_media_facebook
    ADD CONSTRAINT unique_facebook_campaign_date UNIQUE (campaign_id, report_date);
ALTER TABLE ONLY public.platform_metrics
    ADD CONSTRAINT unique_metric_date UNIQUE (metric_name, date);
ALTER TABLE ONLY public.platform_performance_monthly
    ADD CONSTRAINT unique_monthly_metric UNIQUE (year, month, metric_name);
ALTER TABLE ONLY public.mst_properties_property_radar
    ADD CONSTRAINT unique_property_address UNIQUE (address, city, state, zip_five);
ALTER TABLE ONLY public.mst_skip_tracing_batch_data
    ADD CONSTRAINT unique_skip_trace_address UNIQUE (address, city, state, zip_five);
ALTER TABLE ONLY public.ga4_weekly_data
    ADD CONSTRAINT unique_week_channel UNIQUE (year, week, channel);
ALTER TABLE ONLY public.mst_cold_direct_mail
    ADD CONSTRAINT uq_delivery_date UNIQUE (delivery_request_id, report_date);
ALTER TABLE ONLY public.mst_cold_emails_icomm
    ADD CONSTRAINT uq_mst_cold_emails_icomm_unique UNIQUE (report_date, campaign_name);
ALTER TABLE ONLY public.crm_user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.crm_user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.zoho_token
    ADD CONSTRAINT zoho_token_pkey PRIMARY KEY (token);
ALTER TABLE ONLY public.zoning_types
    ADD CONSTRAINT zoning_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.zoning_types
    ADD CONSTRAINT zoning_types_pkey PRIMARY KEY (id);
CREATE INDEX idx_agno_component_configs_created_at ON ai.agno_component_configs USING btree (created_at);
CREATE INDEX idx_agno_component_configs_stage ON ai.agno_component_configs USING btree (stage);
CREATE INDEX idx_agno_component_links_created_at ON ai.agno_component_links USING btree (created_at);
CREATE INDEX idx_agno_component_links_link_kind ON ai.agno_component_links USING btree (link_kind);
CREATE INDEX idx_agno_components_component_type ON ai.agno_components USING btree (component_type);
CREATE INDEX idx_agno_components_created_at ON ai.agno_components USING btree (created_at);
CREATE INDEX idx_agno_components_current_version ON ai.agno_components USING btree (current_version);
CREATE INDEX idx_agno_components_name ON ai.agno_components USING btree (name);
CREATE INDEX idx_agno_eval_runs_created_at ON ai.agno_eval_runs USING btree (created_at);
CREATE INDEX idx_agno_learnings_agent_id ON ai.agno_learnings USING btree (agent_id);
CREATE INDEX idx_agno_learnings_created_at ON ai.agno_learnings USING btree (created_at);
CREATE INDEX idx_agno_learnings_entity_id ON ai.agno_learnings USING btree (entity_id);
CREATE INDEX idx_agno_learnings_entity_type ON ai.agno_learnings USING btree (entity_type);
CREATE INDEX idx_agno_learnings_learning_type ON ai.agno_learnings USING btree (learning_type);
CREATE INDEX idx_agno_learnings_namespace ON ai.agno_learnings USING btree (namespace);
CREATE INDEX idx_agno_learnings_session_id ON ai.agno_learnings USING btree (session_id);
CREATE INDEX idx_agno_learnings_team_id ON ai.agno_learnings USING btree (team_id);
CREATE INDEX idx_agno_learnings_user_id ON ai.agno_learnings USING btree (user_id);
CREATE INDEX idx_agno_learnings_workflow_id ON ai.agno_learnings USING btree (workflow_id);
CREATE INDEX idx_agno_memories_created_at ON ai.agno_memories USING btree (created_at);
CREATE INDEX idx_agno_memories_updated_at ON ai.agno_memories USING btree (updated_at);
CREATE INDEX idx_agno_memories_user_id ON ai.agno_memories USING btree (user_id);
CREATE INDEX idx_agno_metrics_date ON ai.agno_metrics USING btree (date);
CREATE INDEX idx_agno_schema_versions_created_at ON ai.agno_schema_versions USING btree (created_at);
CREATE INDEX idx_agno_sessions_created_at ON ai.agno_sessions USING btree (created_at);
CREATE INDEX idx_agno_sessions_session_type ON ai.agno_sessions USING btree (session_type);
CREATE INDEX idx_agno_component_configs_created_at ON propertyradar_agent.agno_component_configs USING btree (created_at);
CREATE INDEX idx_agno_component_configs_stage ON propertyradar_agent.agno_component_configs USING btree (stage);
CREATE INDEX idx_agno_component_links_created_at ON propertyradar_agent.agno_component_links USING btree (created_at);
CREATE INDEX idx_agno_component_links_link_kind ON propertyradar_agent.agno_component_links USING btree (link_kind);
CREATE INDEX idx_agno_components_component_type ON propertyradar_agent.agno_components USING btree (component_type);
CREATE INDEX idx_agno_components_created_at ON propertyradar_agent.agno_components USING btree (created_at);
CREATE INDEX idx_agno_components_current_version ON propertyradar_agent.agno_components USING btree (current_version);
CREATE INDEX idx_agno_components_name ON propertyradar_agent.agno_components USING btree (name);
CREATE INDEX idx_agno_eval_runs_created_at ON propertyradar_agent.agno_eval_runs USING btree (created_at);
CREATE INDEX idx_agno_learnings_agent_id ON propertyradar_agent.agno_learnings USING btree (agent_id);
CREATE INDEX idx_agno_learnings_created_at ON propertyradar_agent.agno_learnings USING btree (created_at);
CREATE INDEX idx_agno_learnings_entity_id ON propertyradar_agent.agno_learnings USING btree (entity_id);
CREATE INDEX idx_agno_learnings_entity_type ON propertyradar_agent.agno_learnings USING btree (entity_type);
CREATE INDEX idx_agno_learnings_learning_type ON propertyradar_agent.agno_learnings USING btree (learning_type);
CREATE INDEX idx_agno_learnings_namespace ON propertyradar_agent.agno_learnings USING btree (namespace);
CREATE INDEX idx_agno_learnings_session_id ON propertyradar_agent.agno_learnings USING btree (session_id);
CREATE INDEX idx_agno_learnings_team_id ON propertyradar_agent.agno_learnings USING btree (team_id);
CREATE INDEX idx_agno_learnings_user_id ON propertyradar_agent.agno_learnings USING btree (user_id);
CREATE INDEX idx_agno_learnings_workflow_id ON propertyradar_agent.agno_learnings USING btree (workflow_id);
CREATE INDEX idx_agno_memories_created_at ON propertyradar_agent.agno_memories USING btree (created_at);
CREATE INDEX idx_agno_memories_updated_at ON propertyradar_agent.agno_memories USING btree (updated_at);
CREATE INDEX idx_agno_memories_user_id ON propertyradar_agent.agno_memories USING btree (user_id);
CREATE INDEX idx_agno_metrics_date ON propertyradar_agent.agno_metrics USING btree (date);
CREATE INDEX idx_agno_schema_versions_created_at ON propertyradar_agent.agno_schema_versions USING btree (created_at);
CREATE INDEX idx_agno_sessions_created_at ON propertyradar_agent.agno_sessions USING btree (created_at);
CREATE INDEX idx_agno_sessions_session_type ON propertyradar_agent.agno_sessions USING btree (session_type);
CREATE INDEX fki_g ON public.investor_phones USING btree (investor_id);
CREATE INDEX idx_agno_approvals_agent_id ON public.agno_approvals USING btree (agent_id);
CREATE INDEX idx_agno_approvals_approval_type ON public.agno_approvals USING btree (approval_type);
CREATE INDEX idx_agno_approvals_created_at ON public.agno_approvals USING btree (created_at);
CREATE INDEX idx_agno_approvals_pause_type ON public.agno_approvals USING btree (pause_type);
CREATE INDEX idx_agno_approvals_run_id ON public.agno_approvals USING btree (run_id);
CREATE INDEX idx_agno_approvals_run_status ON public.agno_approvals USING btree (run_status);
CREATE INDEX idx_agno_approvals_schedule_id ON public.agno_approvals USING btree (schedule_id);
CREATE INDEX idx_agno_approvals_schedule_run_id ON public.agno_approvals USING btree (schedule_run_id);
CREATE INDEX idx_agno_approvals_session_id ON public.agno_approvals USING btree (session_id);
CREATE INDEX idx_agno_approvals_source_type ON public.agno_approvals USING btree (source_type);
CREATE INDEX idx_agno_approvals_status ON public.agno_approvals USING btree (status);
CREATE INDEX idx_agno_approvals_team_id ON public.agno_approvals USING btree (team_id);
CREATE INDEX idx_agno_approvals_user_id ON public.agno_approvals USING btree (user_id);
CREATE INDEX idx_agno_approvals_workflow_id ON public.agno_approvals USING btree (workflow_id);
CREATE INDEX idx_agno_component_configs_created_at ON public.agno_component_configs USING btree (created_at);
CREATE INDEX idx_agno_component_configs_stage ON public.agno_component_configs USING btree (stage);
CREATE INDEX idx_agno_component_links_created_at ON public.agno_component_links USING btree (created_at);
CREATE INDEX idx_agno_component_links_link_kind ON public.agno_component_links USING btree (link_kind);
CREATE INDEX idx_agno_components_component_type ON public.agno_components USING btree (component_type);
CREATE INDEX idx_agno_components_created_at ON public.agno_components USING btree (created_at);
CREATE INDEX idx_agno_components_current_version ON public.agno_components USING btree (current_version);
CREATE INDEX idx_agno_components_name ON public.agno_components USING btree (name);
CREATE INDEX idx_agno_eval_runs_created_at ON public.agno_eval_runs USING btree (created_at);
CREATE INDEX idx_agno_learnings_agent_id ON public.agno_learnings USING btree (agent_id);
CREATE INDEX idx_agno_learnings_created_at ON public.agno_learnings USING btree (created_at);
CREATE INDEX idx_agno_learnings_entity_id ON public.agno_learnings USING btree (entity_id);
CREATE INDEX idx_agno_learnings_entity_type ON public.agno_learnings USING btree (entity_type);
CREATE INDEX idx_agno_learnings_learning_type ON public.agno_learnings USING btree (learning_type);
CREATE INDEX idx_agno_learnings_namespace ON public.agno_learnings USING btree (namespace);
CREATE INDEX idx_agno_learnings_session_id ON public.agno_learnings USING btree (session_id);
CREATE INDEX idx_agno_learnings_team_id ON public.agno_learnings USING btree (team_id);
CREATE INDEX idx_agno_learnings_user_id ON public.agno_learnings USING btree (user_id);
CREATE INDEX idx_agno_learnings_workflow_id ON public.agno_learnings USING btree (workflow_id);
CREATE INDEX idx_agno_memories_created_at ON public.agno_memories USING btree (created_at);
CREATE INDEX idx_agno_memories_updated_at ON public.agno_memories USING btree (updated_at);
CREATE INDEX idx_agno_memories_user_id ON public.agno_memories USING btree (user_id);
CREATE INDEX idx_agno_metrics_date ON public.agno_metrics USING btree (date);
CREATE INDEX idx_agno_schedule_runs_created_at ON public.agno_schedule_runs USING btree (created_at);
CREATE INDEX idx_agno_schedule_runs_schedule_id ON public.agno_schedule_runs USING btree (schedule_id);
CREATE INDEX idx_agno_schedule_runs_status ON public.agno_schedule_runs USING btree (status);
CREATE INDEX idx_agno_schedules_created_at ON public.agno_schedules USING btree (created_at);
CREATE INDEX idx_agno_schedules_enabled_next_run_at ON public.agno_schedules USING btree (enabled, next_run_at);
CREATE INDEX idx_agno_schedules_name ON public.agno_schedules USING btree (name);
CREATE INDEX idx_agno_schedules_next_run_at ON public.agno_schedules USING btree (next_run_at);
CREATE INDEX idx_agno_schema_versions_created_at ON public.agno_schema_versions USING btree (created_at);
CREATE INDEX idx_agno_sessions_created_at ON public.agno_sessions USING btree (created_at);
CREATE INDEX idx_agno_sessions_session_type ON public.agno_sessions USING btree (session_type);
CREATE INDEX idx_agno_spans_created_at ON public.agno_spans USING btree (created_at);
CREATE INDEX idx_agno_spans_parent_span_id ON public.agno_spans USING btree (parent_span_id);
CREATE INDEX idx_agno_spans_start_time ON public.agno_spans USING btree (start_time);
CREATE INDEX idx_agno_spans_trace_id ON public.agno_spans USING btree (trace_id);
CREATE INDEX idx_agno_traces_agent_id ON public.agno_traces USING btree (agent_id);
CREATE INDEX idx_agno_traces_created_at ON public.agno_traces USING btree (created_at);
CREATE INDEX idx_agno_traces_run_id ON public.agno_traces USING btree (run_id);
CREATE INDEX idx_agno_traces_session_id ON public.agno_traces USING btree (session_id);
CREATE INDEX idx_agno_traces_start_time ON public.agno_traces USING btree (start_time);
CREATE INDEX idx_agno_traces_status ON public.agno_traces USING btree (status);
CREATE INDEX idx_agno_traces_team_id ON public.agno_traces USING btree (team_id);
CREATE INDEX idx_agno_traces_user_id ON public.agno_traces USING btree (user_id);
CREATE INDEX idx_agno_traces_workflow_id ON public.agno_traces USING btree (workflow_id);
CREATE INDEX idx_buybox_criteria_buybox_id ON public.buybox_criteria USING btree (buybox_id);
CREATE INDEX idx_buybox_criteria_buybox_id_field_name ON public.buybox_criteria USING btree (buybox_id, field_name);
CREATE INDEX idx_buybox_criteria_field_name ON public.buybox_criteria USING btree (field_name);
CREATE INDEX idx_buybox_criteria_field_name_operator_value ON public.buybox_criteria USING btree (field_name, operator, value);
CREATE INDEX idx_buybox_criteria_value ON public.buybox_criteria USING btree (buybox_id, field_name);
CREATE INDEX idx_buyboxes_investor_active ON public.buyboxes USING btree (investor_id, is_active);
CREATE INDEX idx_buyboxes_investor_id ON public.buyboxes USING btree (investor_id);
CREATE INDEX idx_buyboxes_is_active ON public.buyboxes USING btree (is_active);
CREATE INDEX idx_channel ON public.ga4_weekly_data USING btree (channel);
CREATE INDEX idx_cold_campaign_date ON public.mst_cold_campaign_sms USING btree (campaign_date);
CREATE INDEX idx_cold_campaign_name ON public.mst_cold_campaign_sms USING btree (campaign_name);
CREATE INDEX idx_crm_deals_closing_date ON public.crm_deals USING btree (estimated_closing_date);
CREATE INDEX idx_crm_deals_created ON public.crm_deals USING btree (created_at DESC);
CREATE INDEX idx_crm_deals_investor_advisor ON public.crm_deals USING btree (investor_advisor_id);
CREATE INDEX idx_crm_deals_lead ON public.crm_deals USING btree (lead_id);
CREATE INDEX idx_crm_deals_seller_advisor ON public.crm_deals USING btree (seller_advisor_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals USING btree (stage_id);
CREATE INDEX idx_crm_deals_status ON public.crm_deals USING btree (status);
CREATE INDEX idx_crm_leads_date_created ON public.crm_leads USING btree (date_created DESC);
CREATE INDEX idx_crm_leads_investor_advisor ON public.crm_leads USING btree (investor_advisor_id);
CREATE INDEX idx_crm_leads_is_hot ON public.crm_leads USING btree (is_hot) WHERE (is_hot = true);
CREATE INDEX idx_crm_leads_lead_score ON public.crm_leads USING btree (lead_score DESC);
CREATE INDEX idx_crm_leads_pipeline_type ON public.crm_leads USING btree (pipeline_type);
CREATE INDEX idx_crm_leads_property ON public.crm_leads USING btree (property_id);
CREATE INDEX idx_crm_leads_result ON public.crm_leads USING btree (result);
CREATE INDEX idx_crm_leads_seller_advisor ON public.crm_leads USING btree (seller_advisor_id);
CREATE INDEX idx_crm_leads_seller_manager ON public.crm_leads USING btree (seller_manager_id);
CREATE INDEX idx_crm_leads_stage ON public.crm_leads USING btree (stage_id);
CREATE INDEX idx_crm_leads_stage_entered ON public.crm_leads USING btree (stage_entered_at);
CREATE INDEX idx_crm_leads_stage_pipeline ON public.crm_leads USING btree (stage_id, pipeline_type);
CREATE INDEX idx_crm_property_valuations_property_id ON public.crm_property_valuations USING btree (property_id);
CREATE INDEX idx_crm_sellers_email ON public.crm_sellers USING btree (email);
CREATE INDEX idx_crm_sellers_lead ON public.crm_sellers USING btree (lead_id);
CREATE INDEX idx_crm_sellers_name ON public.crm_sellers USING btree (last_name, first_name);
CREATE INDEX idx_crm_sellers_phone ON public.crm_sellers USING btree (phone);
CREATE INDEX idx_csv_mapping_configurations_active ON public.csv_mapping_configurations USING btree (is_active);
CREATE INDEX idx_csv_mapping_configurations_name ON public.csv_mapping_configurations USING btree (config_name);
CREATE INDEX idx_deal_harmony_documents_property_id ON public.deal_harmony_documents USING btree (deal_harmony_property_id);
CREATE INDEX idx_deal_harmony_documents_type ON public.deal_harmony_documents USING btree (document_type);
CREATE INDEX idx_deal_harmony_expenses_property_id ON public.deal_harmony_custom_expenses USING btree (deal_harmony_property_id) WHERE (deal_harmony_property_id IS NOT NULL);
CREATE INDEX idx_deal_harmony_expenses_scenario_id ON public.deal_harmony_custom_expenses USING btree (scenario_id) WHERE (scenario_id IS NOT NULL);
CREATE INDEX idx_deal_harmony_offers_property_id ON public.deal_harmony_offers USING btree (deal_harmony_property_id);
CREATE INDEX idx_deal_harmony_offers_type ON public.deal_harmony_offers USING btree (offer_type);
CREATE INDEX idx_deal_harmony_properties_created_at ON public.deal_harmony_properties USING btree (created_at DESC);
CREATE INDEX idx_deal_harmony_properties_property_id ON public.deal_harmony_properties USING btree (property_id);
CREATE INDEX idx_deal_harmony_properties_user_id ON public.deal_harmony_properties USING btree (user_id);
CREATE INDEX idx_deal_harmony_scenarios_active ON public.deal_harmony_custom_scenarios USING btree (is_active);
CREATE INDEX idx_deal_harmony_scenarios_property_id ON public.deal_harmony_custom_scenarios USING btree (deal_harmony_property_id);
CREATE INDEX idx_dialpad_call_events_call_id ON public.dialpad_call_events USING btree (call_id);
CREATE INDEX idx_dialpad_call_events_contact_gin ON public.dialpad_call_events USING gin (contact);
CREATE INDEX idx_dialpad_call_events_direction ON public.dialpad_call_events USING btree (direction);
CREATE INDEX idx_dialpad_call_events_entry_point_call_id ON public.dialpad_call_events USING btree (entry_point_call_id);
CREATE INDEX idx_dialpad_call_events_entry_point_target_gin ON public.dialpad_call_events USING gin (entry_point_target);
CREATE INDEX idx_dialpad_call_events_event_timestamp ON public.dialpad_call_events USING btree (event_timestamp);
CREATE INDEX idx_dialpad_call_events_external_number ON public.dialpad_call_events USING btree (external_number);
CREATE INDEX idx_dialpad_call_events_internal_number ON public.dialpad_call_events USING btree (internal_number);
CREATE INDEX idx_dialpad_call_events_master_call_id ON public.dialpad_call_events USING btree (master_call_id);
CREATE INDEX idx_dialpad_call_events_operator_call_id ON public.dialpad_call_events USING btree (operator_call_id);
CREATE INDEX idx_dialpad_call_events_property_id ON public.dialpad_call_events USING btree (property_id);
CREATE INDEX idx_dialpad_call_events_proxy_target_gin ON public.dialpad_call_events USING gin (proxy_target);
CREATE INDEX idx_dialpad_call_events_raw_payload_gin ON public.dialpad_call_events USING gin (raw_payload);
CREATE INDEX idx_dialpad_call_events_recording_details_gin ON public.dialpad_call_events USING gin (recording_details);
CREATE INDEX idx_dialpad_call_events_state ON public.dialpad_call_events USING btree (state);
CREATE INDEX idx_dialpad_call_events_target_gin ON public.dialpad_call_events USING gin (target);
CREATE INDEX idx_dialpad_sms_events_contact_gin ON public.dialpad_sms_events USING gin (contact);
CREATE INDEX idx_dialpad_sms_events_created_date_ms ON public.dialpad_sms_events USING btree (created_date_ms);
CREATE INDEX idx_dialpad_sms_events_direction ON public.dialpad_sms_events USING btree (direction);
CREATE INDEX idx_dialpad_sms_events_event_timestamp_ms ON public.dialpad_sms_events USING btree (event_timestamp_ms);
CREATE INDEX idx_dialpad_sms_events_from_number ON public.dialpad_sms_events USING btree (from_number);
CREATE INDEX idx_dialpad_sms_events_property_id ON public.dialpad_sms_events USING btree (property_id);
CREATE INDEX idx_dialpad_sms_events_raw_payload_gin ON public.dialpad_sms_events USING gin (raw_payload);
CREATE INDEX idx_dialpad_sms_events_sender_id ON public.dialpad_sms_events USING btree (sender_id);
CREATE INDEX idx_dialpad_sms_events_target_gin ON public.dialpad_sms_events USING gin (target);
CREATE INDEX idx_document_type ON public.transaction_coordinator_files USING btree (document_type);
CREATE INDEX idx_employees_is_active ON public.crm_employees USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_employees_manager ON public.crm_employees USING btree (manager_id);
CREATE INDEX idx_employees_user ON public.crm_employees USING btree (user_id);
CREATE INDEX idx_expense_tool_mappings_fixed_expense_id ON public.expense_tool_mappings USING btree (fixed_expense_id);
CREATE INDEX idx_expenses_per_campaign_campaign_id ON public.mst_cold_expenses_per_campaign USING btree (campaign_id);
CREATE INDEX idx_expenses_per_deal_deal_id ON public.expenses_per_deal USING btree (deal_id);
CREATE INDEX idx_expenses_per_deal_source_expense ON public.expenses_per_deal USING btree (source_expense_id) WHERE (source_expense_id IS NOT NULL);
CREATE INDEX idx_expenses_per_deal_tool ON public.expenses_per_deal USING btree (tool_name, tool_type);
CREATE INDEX idx_expenses_variable_history_deal_date ON public.expenses_variable_history USING btree (deal_id, snapshot_date);
CREATE INDEX idx_expenses_variable_history_snapshot_date ON public.expenses_variable_history USING btree (snapshot_date);
CREATE INDEX idx_filename_jobs_user ON public.filename_jobs USING btree (user_id);
CREATE INDEX idx_hubspot_created_at ON public.provider_hubspot USING btree (created_at);
CREATE INDEX idx_hubspot_email ON public.provider_hubspot USING btree (email);
CREATE INDEX idx_hubspot_original_data ON public.provider_hubspot USING gin (original_data);
CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at);
CREATE INDEX idx_leads_email ON public.leads USING btree (email);
CREATE INDEX idx_leads_phone ON public.leads USING btree (phone);
CREATE INDEX idx_mst_ai_calling_campaign ON public.mst_campaign_ai_calling USING btree (campaign_id);
CREATE INDEX idx_mst_campaigns_channel ON public.mst_campaigns USING btree (channel_id);
CREATE INDEX idx_mst_campaigns_datasource ON public.mst_campaigns USING btree (data_source_id);
CREATE INDEX idx_mst_campaigns_deal ON public.mst_campaigns USING btree (deal_id);
CREATE INDEX idx_mst_email_campaign ON public.mst_campaign_email_hubspot USING btree (campaign_id);
CREATE INDEX idx_mst_field_mappings_source ON public.mst_field_mappings USING btree (data_source_id);
CREATE INDEX idx_mst_human_calling_campaign ON public.mst_campaign_human_calling USING btree (campaign_id);
CREATE INDEX idx_mst_investor_lift_campaign ON public.mst_campaign_investor_lift USING btree (campaign_name);
CREATE INDEX idx_mst_leads_campaign_medium ON public.mst_leads_for_metrics USING btree (campaign_medium);
CREATE INDEX idx_mst_leads_campaigns_source ON public.mst_leads_for_metrics USING btree (campaigns_source);
CREATE INDEX idx_mst_leads_created_time ON public.mst_leads_for_metrics USING btree (created_time);
CREATE INDEX idx_mst_leads_created_type ON public.mst_leads_for_metrics USING btree (created_time, type);
CREATE INDEX idx_mst_leads_lead_status ON public.mst_leads_for_metrics USING btree (lead_status);
CREATE INDEX idx_mst_leads_mql ON public.mst_leads_for_metrics USING btree (mql_lead);
CREATE INDEX idx_mst_leads_sql ON public.mst_leads_for_metrics USING btree (sql_lead);
CREATE INDEX idx_mst_leads_state ON public.mst_leads_for_metrics USING btree (state);
CREATE INDEX idx_mst_leads_type ON public.mst_leads_for_metrics USING btree (type);
CREATE INDEX idx_mst_offers_deal ON public.mst_offers USING btree (deal_id);
CREATE INDEX idx_mst_offers_investor ON public.mst_offers USING btree (investor_id);
CREATE INDEX idx_mst_reddit_campaign ON public.mst_campaign_paid_media_reddit USING btree (campaign_id);
CREATE INDEX idx_mst_sms_campaign ON public.mst_campaign_sms_hubspot USING btree (campaign_id);
CREATE INDEX idx_mst_sonar_campaign_sellers_campaign_id ON public.mst_sonar_campaign_sellers USING btree (campaign_id);
CREATE INDEX idx_mst_sonar_campaign_sellers_seller_id ON public.mst_sonar_campaign_sellers USING btree (seller_id);
CREATE INDEX idx_mst_sonar_campaign_sellers_stage ON public.mst_sonar_campaign_sellers USING btree (stage);
CREATE INDEX idx_mst_sonar_campaign_sellers_status ON public.mst_sonar_campaign_sellers USING btree (status);
CREATE INDEX idx_mst_sonar_campaigns_created_at ON public.mst_sonar_campaigns USING btree (created_at);
CREATE INDEX idx_mst_sonar_campaigns_status ON public.mst_sonar_campaigns USING btree (status);
CREATE INDEX idx_mst_website_campaign ON public.mst_campaign_website USING btree (campaign_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read);
CREATE INDEX idx_performance_metric ON public.platform_performance_monthly USING btree (metric_name);
CREATE INDEX idx_performance_year_month ON public.platform_performance_monthly USING btree (year, month);
CREATE INDEX idx_pipeline_cold_lead_id ON public.mst_sellers_properties_pipeline USING btree (cold_lead_id);
CREATE INDEX idx_platform_metrics_name ON public.platform_metrics USING btree (metric_name);
CREATE INDEX idx_properties_address ON public.properties USING btree (address, city, state);
CREATE INDEX idx_properties_bathrooms ON public.properties USING btree (bathrooms);
CREATE INDEX idx_properties_bedrooms ON public.properties USING btree (bedrooms);
CREATE INDEX idx_properties_cap_rate ON public.properties USING btree (cap_rate);
CREATE INDEX idx_properties_city ON public.properties USING btree (city);
CREATE INDEX idx_properties_city_state ON public.properties USING btree (city, state);
CREATE INDEX idx_properties_city_state_zip_code ON public.properties USING btree (city, state, zip_code);
CREATE INDEX idx_properties_condition_rating ON public.properties USING btree (condition_rating_id);
CREATE INDEX idx_properties_flood_zone ON public.properties USING btree (flood_zone_id);
CREATE INDEX idx_properties_hoa_frequency ON public.properties USING btree (hoa_frequency_id);
CREATE INDEX idx_properties_listing_status ON public.properties USING btree (listing_status);
CREATE INDEX idx_properties_location ON public.properties USING gist (public.ll_to_earth((latitude)::double precision, (longitude)::double precision)) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));
CREATE INDEX idx_properties_mls ON public.properties USING btree (mls_number);
CREATE INDEX idx_properties_monthly_rent ON public.properties USING btree (monthly_rent);
CREATE INDEX idx_properties_price ON public.properties USING btree (price);
CREATE INDEX idx_properties_property_type ON public.properties USING btree (property_type);
CREATE INDEX idx_properties_solar_ownership ON public.properties USING btree (solar_ownership_id);
CREATE INDEX idx_properties_sqft ON public.properties USING btree (sqft);
CREATE INDEX idx_properties_state ON public.properties USING btree (state);
CREATE INDEX idx_properties_type ON public.properties USING btree (property_type);
CREATE INDEX idx_properties_year_built ON public.properties USING btree (year_built);
CREATE INDEX idx_properties_zip ON public.properties USING btree (zip_code);
CREATE INDEX idx_properties_zip_city_state ON public.properties USING btree (zip_code, city, state);
CREATE INDEX idx_properties_zip_code ON public.properties USING btree (zip_code);
CREATE INDEX idx_properties_zoning_type ON public.properties USING btree (zoning_type_id);
CREATE INDEX idx_property_id ON public.transaction_coordinator_files USING btree (property_id);
CREATE INDEX idx_property_liens_property ON public.crm_property_liens USING btree (property_id);
CREATE INDEX idx_property_mortgages_property ON public.crm_property_mortgages USING btree (property_id);
CREATE INDEX idx_property_radar_address_match ON public.mst_properties_property_radar USING btree (upper(TRIM(BOTH FROM address)), upper(TRIM(BOTH FROM city)), upper((state)::text), zip_five);
CREATE INDEX idx_property_realtor_info_property_id ON public.crm_property_realtor_info USING btree (property_id);
CREATE INDEX idx_round_robin_context ON public.round_robin_state USING btree (context);
CREATE INDEX idx_skip_trace_address ON public.mst_skip_tracing_batch_data USING btree (address, city, state, zip_five);
CREATE INDEX idx_skip_trace_address_match ON public.mst_skip_tracing_batch_data USING btree (upper(TRIM(BOTH FROM address)), upper(TRIM(BOTH FROM city)), upper((state)::text), zip_five);
CREATE INDEX idx_skip_trace_best_email ON public.mst_skip_tracing_batch_data USING btree (best_email) WHERE (best_email IS NOT NULL);
CREATE INDEX idx_skip_trace_best_phone ON public.mst_skip_tracing_batch_data USING btree (best_phone) WHERE (best_phone IS NOT NULL);
CREATE INDEX idx_skip_trace_emails_gin ON public.mst_skip_tracing_batch_data USING gin (emails);
CREATE INDEX idx_skip_trace_phone_numbers_gin ON public.mst_skip_tracing_batch_data USING gin (phone_numbers);
CREATE INDEX idx_skip_trace_tcpa_safe ON public.mst_skip_tracing_batch_data USING btree (is_tcpa_dnc, is_litigator, is_deceased) WHERE ((is_tcpa_dnc = false) AND (is_litigator = false) AND (is_deceased = false));
CREATE INDEX idx_smartleads_created_at ON public.provider_smartleads USING btree (created_at);
CREATE INDEX idx_smartleads_email ON public.provider_smartleads USING btree (email);
CREATE INDEX idx_smartleads_original_data ON public.provider_smartleads USING gin (original_data);
CREATE INDEX idx_sonar_cold_leads_created_at ON public.sonar_cold_leads USING btree (created_at);
CREATE INDEX idx_sonar_cold_leads_email ON public.sonar_cold_leads USING btree (email);
CREATE INDEX idx_sonar_cold_leads_lead_id ON public.sonar_cold_leads USING btree (lead_id);
CREATE INDEX idx_sonar_cold_leads_phone ON public.sonar_cold_leads USING btree (phone);
CREATE INDEX idx_sonar_cold_leads_property_id ON public.sonar_cold_leads USING btree (property_id);
CREATE INDEX idx_sonar_cold_leads_status ON public.sonar_cold_leads USING btree (cold_lead_status);
CREATE INDEX idx_sonar_cold_leads_zoho_id ON public.sonar_cold_leads USING btree (zoho_id);
CREATE INDEX idx_sonar_marketing_campaigns_created_at ON public.sonar_marketing_campaigns_metrics USING btree (created_at DESC);
CREATE INDEX idx_start_date ON public.ga4_weekly_data USING btree (start_date);
CREATE INDEX idx_status ON public.transaction_coordinator_files USING btree (status);
CREATE INDEX idx_sync_records_external_id ON public.sync_records USING btree (external_id);
CREATE INDEX idx_sync_records_session ON public.sync_records USING btree (sync_session_id);
CREATE INDEX idx_sync_sessions_source_started ON public.sync_sessions USING btree (source, started_at DESC);
CREATE INDEX idx_sync_sessions_status ON public.sync_sessions USING btree (status);
CREATE INDEX idx_user_roles_role ON public.crm_user_roles USING btree (role_id);
CREATE INDEX idx_user_roles_user ON public.crm_user_roles USING btree (user_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);
CREATE INDEX idx_users_is_active ON public.users USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_week_label ON public.ga4_weekly_data USING btree (week_label);
CREATE INDEX idx_year_week ON public.ga4_weekly_data USING btree (year, week);
CREATE UNIQUE INDEX uniq_investor_sync_hubspot_buybox ON public.buyboxes USING btree (investor_id) WHERE ((buybox_source)::text = 'SYNC_HUBSPOT'::text);
CREATE UNIQUE INDEX uq_dialpad_call_events_unique_event ON public.dialpad_call_events USING btree (call_id, state, event_timestamp);
CREATE TRIGGER deal_harmony_update_expenses_updated_at BEFORE UPDATE ON public.deal_harmony_custom_expenses FOR EACH ROW EXECUTE FUNCTION public.deal_harmony_update_updated_at_column();
CREATE TRIGGER deal_harmony_update_offers_updated_at BEFORE UPDATE ON public.deal_harmony_offers FOR EACH ROW EXECUTE FUNCTION public.deal_harmony_update_updated_at_column();
CREATE TRIGGER deal_harmony_update_properties_updated_at BEFORE UPDATE ON public.deal_harmony_properties FOR EACH ROW EXECUTE FUNCTION public.deal_harmony_update_updated_at_column();
CREATE TRIGGER deal_harmony_update_scenarios_updated_at BEFORE UPDATE ON public.deal_harmony_custom_scenarios FOR EACH ROW EXECUTE FUNCTION public.deal_harmony_update_updated_at_column();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.crm_employees FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER trg_log_stage_change AFTER UPDATE ON public.mst_sellers_properties_pipeline FOR EACH ROW EXECUTE FUNCTION public.log_stage_change();
CREATE TRIGGER trg_pipeline_from_property AFTER INSERT ON public.mst_properties_property_radar FOR EACH ROW EXECUTE FUNCTION public.pipeline_from_property();
CREATE TRIGGER trg_pipeline_from_skip_tracing AFTER INSERT ON public.mst_skip_tracing_batch_data FOR EACH ROW EXECUTE FUNCTION public.pipeline_from_skip_tracing();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.mst_sellers_properties_pipeline FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_set_analyze_version BEFORE INSERT ON public.transaction_coordinator_analysis FOR EACH ROW EXECUTE FUNCTION public.set_analyze_version();
CREATE TRIGGER trigger_skip_trace_updated_at BEFORE UPDATE ON public.mst_skip_tracing_batch_data FOR EACH ROW EXECUTE FUNCTION public.update_skip_trace_updated_at();
CREATE TRIGGER trigger_update_expense_tool_mappings_updated_at BEFORE UPDATE ON public.expense_tool_mappings FOR EACH ROW EXECUTE FUNCTION public.update_expense_tool_mappings_updated_at();
CREATE TRIGGER trigger_update_expenses_paid_media_timestamp BEFORE UPDATE ON public.expenses_paid_media FOR EACH ROW EXECUTE FUNCTION public.update_expenses_paid_media_timestamp();
CREATE TRIGGER trigger_update_expenses_per_deal_updated_at BEFORE UPDATE ON public.expenses_per_deal FOR EACH ROW EXECUTE FUNCTION public.update_expenses_per_deal_updated_at();
CREATE TRIGGER update_ga4_weekly_updated_at BEFORE UPDATE ON public.ga4_weekly_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_modified_time BEFORE UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();
CREATE TRIGGER update_modified_time BEFORE UPDATE ON public.provider_hubspot FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();
CREATE TRIGGER update_modified_time BEFORE UPDATE ON public.provider_smartleads FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();
CREATE TRIGGER update_modified_time BEFORE UPDATE ON public.transcribed_conversations FOR EACH ROW EXECUTE FUNCTION public.update_modified_timestamp();
CREATE TRIGGER update_mst_cold_campaign_sms_updated_at BEFORE UPDATE ON public.mst_cold_campaign_sms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE ONLY ai.agno_component_configs
    ADD CONSTRAINT agno_component_configs_component_id_fkey FOREIGN KEY (component_id) REFERENCES ai.agno_components(component_id);
ALTER TABLE ONLY ai.agno_component_links
    ADD CONSTRAINT agno_component_links_child_component_id_fkey FOREIGN KEY (child_component_id) REFERENCES ai.agno_components(component_id);
ALTER TABLE ONLY ai.agno_component_links
    ADD CONSTRAINT agno_component_links_parent_component_id_parent_version_fkey FOREIGN KEY (parent_component_id, parent_version) REFERENCES ai.agno_component_configs(component_id, version);
ALTER TABLE ONLY propertyradar_agent.agno_component_configs
    ADD CONSTRAINT agno_component_configs_component_id_fkey FOREIGN KEY (component_id) REFERENCES propertyradar_agent.agno_components(component_id);
ALTER TABLE ONLY propertyradar_agent.agno_component_links
    ADD CONSTRAINT agno_component_links_child_component_id_fkey FOREIGN KEY (child_component_id) REFERENCES propertyradar_agent.agno_components(component_id);
ALTER TABLE ONLY propertyradar_agent.agno_component_links
    ADD CONSTRAINT agno_component_links_parent_component_id_parent_version_fkey FOREIGN KEY (parent_component_id, parent_version) REFERENCES propertyradar_agent.agno_component_configs(component_id, version);
ALTER TABLE ONLY public.agno_component_configs
    ADD CONSTRAINT agno_component_configs_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.agno_components(component_id);
ALTER TABLE ONLY public.agno_component_links
    ADD CONSTRAINT agno_component_links_child_component_id_fkey FOREIGN KEY (child_component_id) REFERENCES public.agno_components(component_id);
ALTER TABLE ONLY public.agno_component_links
    ADD CONSTRAINT agno_component_links_parent_component_id_parent_version_fkey FOREIGN KEY (parent_component_id, parent_version) REFERENCES public.agno_component_configs(component_id, version);
ALTER TABLE ONLY public.agno_schedule_runs
    ADD CONSTRAINT agno_schedule_runs_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.agno_schedules(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.agno_spans
    ADD CONSTRAINT agno_spans_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.agno_traces(trace_id);
ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_activity_type_id_fkey FOREIGN KEY (activity_type_id) REFERENCES public.crm_activity_types(id);
ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.crm_activities
    ADD CONSTRAINT crm_activities_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.crm_calendar_events
    ADD CONSTRAINT crm_calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.crm_campaigns
    ADD CONSTRAINT crm_campaigns_medium_id_fkey FOREIGN KEY (medium_id) REFERENCES public.crm_campaign_mediums(id);
ALTER TABLE ONLY public.crm_campaigns
    ADD CONSTRAINT crm_campaigns_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.crm_campaign_sources(id);
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_investor_advisor_id_fkey FOREIGN KEY (investor_advisor_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_seller_advisor_id_fkey FOREIGN KEY (seller_advisor_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.crm_stages(id);
ALTER TABLE ONLY public.crm_deals
    ADD CONSTRAINT crm_deals_transaction_coordinator_id_fkey FOREIGN KEY (transaction_coordinator_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_employees
    ADD CONSTRAINT crm_employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_employees
    ADD CONSTRAINT crm_employees_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);
ALTER TABLE ONLY public.crm_employees
    ADD CONSTRAINT crm_employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.crm_files
    ADD CONSTRAINT crm_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_cold_outreach_specialist_id_fkey FOREIGN KEY (cold_outreach_specialist_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_investor_advisor_id_fkey FOREIGN KEY (investor_advisor_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_previous_stage_id_fkey FOREIGN KEY (previous_stage_id) REFERENCES public.crm_stages(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_seller_advisor_id_fkey FOREIGN KEY (seller_advisor_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_seller_manager_id_fkey FOREIGN KEY (seller_manager_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.crm_stages(id);
ALTER TABLE ONLY public.crm_leads
    ADD CONSTRAINT crm_leads_transaction_coordinator_id_fkey FOREIGN KEY (transaction_coordinator_id) REFERENCES public.crm_employees(id);
ALTER TABLE ONLY public.crm_notifications
    ADD CONSTRAINT crm_notifications_notification_type_id_fkey FOREIGN KEY (notification_type_id) REFERENCES public.crm_notification_types(id);
ALTER TABLE ONLY public.crm_notifications
    ADD CONSTRAINT crm_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.crm_property_files
    ADD CONSTRAINT crm_property_files_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.crm_files(id);
ALTER TABLE ONLY public.crm_property_files
    ADD CONSTRAINT crm_property_files_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.crm_property_financials
    ADD CONSTRAINT crm_property_financials_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.crm_property_foreclosures
    ADD CONSTRAINT crm_property_foreclosures_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_property_investor_offers
    ADD CONSTRAINT crm_property_investor_offers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.crm_property_investor_offers
    ADD CONSTRAINT crm_property_investor_offers_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id);
ALTER TABLE ONLY public.crm_property_investor_offers
    ADD CONSTRAINT crm_property_investor_offers_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.crm_property_investor_offers
    ADD CONSTRAINT crm_property_investor_offers_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.crm_offer_status(id);
ALTER TABLE ONLY public.crm_property_liens
    ADD CONSTRAINT crm_property_liens_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_property_mortgages
    ADD CONSTRAINT crm_property_mortgages_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_property_realtor_info
    ADD CONSTRAINT crm_property_realtor_info_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_property_sellers
    ADD CONSTRAINT crm_property_sellers_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_property_sellers
    ADD CONSTRAINT crm_property_sellers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.crm_sellers(id);
ALTER TABLE ONLY public.crm_sellers
    ADD CONSTRAINT crm_sellers_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_transactions
    ADD CONSTRAINT crm_transactions_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id);
ALTER TABLE ONLY public.crm_transactions
    ADD CONSTRAINT crm_transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.crm_workflow_executions
    ADD CONSTRAINT crm_workflow_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.crm_workflow_rules(id);
ALTER TABLE ONLY public.buyboxes
    ADD CONSTRAINT fk_buyboxes_investor FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.buybox_criteria
    ADD CONSTRAINT fk_criteria_buybox FOREIGN KEY (buybox_id) REFERENCES public.buyboxes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.deal_harmony_documents
    ADD CONSTRAINT fk_deal_harmony_document_property FOREIGN KEY (deal_harmony_property_id) REFERENCES public.deal_harmony_properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.deal_harmony_custom_expenses
    ADD CONSTRAINT fk_deal_harmony_expense_property FOREIGN KEY (deal_harmony_property_id) REFERENCES public.deal_harmony_properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.deal_harmony_custom_expenses
    ADD CONSTRAINT fk_deal_harmony_expense_scenario FOREIGN KEY (scenario_id) REFERENCES public.deal_harmony_custom_scenarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.deal_harmony_offers
    ADD CONSTRAINT fk_deal_harmony_offer_property FOREIGN KEY (deal_harmony_property_id) REFERENCES public.deal_harmony_properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.deal_harmony_properties
    ADD CONSTRAINT fk_deal_harmony_property FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.deal_harmony_custom_scenarios
    ADD CONSTRAINT fk_deal_harmony_scenario_property FOREIGN KEY (deal_harmony_property_id) REFERENCES public.deal_harmony_properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.investor_emails
    ADD CONSTRAINT fk_investor_email FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.provider_smartleads
    ADD CONSTRAINT fk_investor_id FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id);
ALTER TABLE ONLY public.investor_phones
    ADD CONSTRAINT fk_investor_phone FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.provider_hubspot
    ADD CONSTRAINT fk_investor_provider_hubspot FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.investors
    ADD CONSTRAINT fk_investors_users FOREIGN KEY (investor_advisor) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transcribed_conversations
    ADD CONSTRAINT fk_modified_by FOREIGN KEY (modified_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.mst_sellers_properties_pipeline
    ADD CONSTRAINT fk_pipeline_property FOREIGN KEY (property_radar_id) REFERENCES public.mst_properties_property_radar(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_sellers_properties_pipeline
    ADD CONSTRAINT fk_pipeline_skip_tracing FOREIGN KEY (skip_tracing_id) REFERENCES public.mst_skip_tracing_batch_data(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.transcribed_conversations
    ADD CONSTRAINT fk_property FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_transactions_property FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.crm_campaigns(id);
ALTER TABLE ONLY public.marketing
    ADD CONSTRAINT marketing_disposition_id_fkey FOREIGN KEY (disposition_id) REFERENCES public.disposition_strategy(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.marketing
    ADD CONSTRAINT marketing_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_campaign_human_calling
    ADD CONSTRAINT mst_campaign_human_calling_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.mst_campaigns(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_campaign_paid_media_reddit
    ADD CONSTRAINT mst_campaign_paid_media_reddit_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.mst_campaigns(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_campaign_website
    ADD CONSTRAINT mst_campaign_website_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.mst_campaigns(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_campaigns
    ADD CONSTRAINT mst_campaigns_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.mst_channels(id);
ALTER TABLE ONLY public.mst_campaigns
    ADD CONSTRAINT mst_campaigns_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES public.mst_data_sources(id);
ALTER TABLE ONLY public.mst_cold_expenses_per_campaign
    ADD CONSTRAINT mst_cold_expenses_per_campaign_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.mst_sonar_campaigns(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_field_mappings
    ADD CONSTRAINT mst_field_mappings_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES public.mst_data_sources(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_sonar_campaign_sellers
    ADD CONSTRAINT mst_sonar_campaign_sellers_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.mst_sonar_campaigns(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.mst_sonar_campaign_sellers
    ADD CONSTRAINT mst_sonar_campaign_sellers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.mst_sellers_properties_pipeline(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_ac_type_id_fkey FOREIGN KEY (ac_type_id) REFERENCES public.crm_ac_types(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_condition_rating_id_fkey FOREIGN KEY (condition_rating_id) REFERENCES public.condition_ratings(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_flood_zone_id_fkey FOREIGN KEY (flood_zone_id) REFERENCES public.flood_zones(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_foundation_type_id_fkey FOREIGN KEY (foundation_type_id) REFERENCES public.crm_foundation_types(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_heating_type_id_fkey FOREIGN KEY (heating_type_id) REFERENCES public.crm_heating_types(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_hoa_frequency_id_fkey FOREIGN KEY (hoa_frequency_id) REFERENCES public.hoa_frequencies(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_occupancy_type_id_fkey FOREIGN KEY (occupancy_type_id) REFERENCES public.crm_occupancy_types(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_property_type_id_fkey FOREIGN KEY (property_type_id) REFERENCES public.crm_property_types(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_roof_type_id_fkey FOREIGN KEY (roof_type_id) REFERENCES public.crm_roof_types(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_solar_ownership_id_fkey FOREIGN KEY (solar_ownership_id) REFERENCES public.solar_ownership_types(id);
ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_zoning_type_id_fkey FOREIGN KEY (zoning_type_id) REFERENCES public.zoning_types(id);
ALTER TABLE ONLY public.property_origins
    ADD CONSTRAINT property_origins_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.property_top_buyers
    ADD CONSTRAINT property_top_buyers_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.property_top_buyers
    ADD CONSTRAINT property_top_buyers_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.crm_property_valuations
    ADD CONSTRAINT property_valuations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.round_robin_state
    ADD CONSTRAINT round_robin_state_last_assigned_user_id_fkey FOREIGN KEY (last_assigned_user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE ONLY public.sync_records
    ADD CONSTRAINT sync_records_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sync_records
    ADD CONSTRAINT sync_records_sync_session_id_fkey FOREIGN KEY (sync_session_id) REFERENCES public.sync_sessions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transaction_coordinator_mandatory_files
    ADD CONSTRAINT transaction_coordinator_mandatory_files_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id);
ALTER TABLE ONLY public.crm_user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.crm_user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.crm_user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
\unrestrict hasura
