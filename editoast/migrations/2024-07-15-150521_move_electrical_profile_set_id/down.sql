ALTER TABLE timetable_v2 ADD electrical_profile_set_id int8 NULL REFERENCES electrical_profile_set(id) ON DELETE CASCADE;

UPDATE timetable_v2
SET electrical_profile_set_id = scenario_v2.electrical_profile_set_id
FROM scenario_v2
WHERE scenario_v2.timetable_id = timetable_v2.id;

ALTER TABLE scenario_v2 DROP COLUMN electrical_profile_set_id;
