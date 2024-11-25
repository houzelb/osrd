DELETE FROM infra_layer_operational_point;
ALTER TABLE infra_layer_operational_point ADD COLUMN track_section text NOT NULL;

WITH ops AS (
    SELECT obj_id AS op_id,
        infra_id,
        (
            jsonb_array_elements(data->'parts')->'position'
        )::float AS position,
        jsonb_array_elements(data->'parts')->>'track' AS track_id,
        jsonb_array_elements(data->'parts')->'extensions'->'sncf'->>'kp' AS kp
    FROM infra_object_operational_point
),
collect AS (
    SELECT ops.op_id,
        ST_LineInterpolatePoint(
            tracks_layer.geographic,
            LEAST(
                GREATEST(
                    ops.position / (tracks.data->'length')::float,
                    0.
                ),
                1.
            )
        ) AS geo,
        ops.kp AS kp,
        ops.infra_id AS infra_id,
        ops.track_id AS track_section
    FROM ops
        INNER JOIN infra_object_track_section AS tracks ON tracks.obj_id = ops.track_id AND tracks.infra_id = ops.infra_id
        INNER JOIN infra_layer_track_section AS tracks_layer ON tracks.obj_id = tracks_layer.obj_id
        AND tracks.infra_id = tracks_layer.infra_id
)
INSERT INTO infra_layer_operational_point (obj_id, infra_id, geographic, kp, track_section)
SELECT op_id,
     infra_id,
    geo,
    kp,
    track_section
FROM collect;
