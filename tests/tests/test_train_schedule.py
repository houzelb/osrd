import bisect
import json
from collections.abc import Sequence
from typing import Any, Dict

import requests

from tests.infra import Infra

from .services import EDITOAST_URL


def _update_simulation_with_mareco_allowances(editoast_url, train_Schedule_id):
    response = requests.get(editoast_url + f"/train_schedule/{train_Schedule_id}/")
    assert response.status_code == 200
    train_schedule = response.json()
    train_schedule["margins"] = {
        "boundaries": [],
        "values": ["3%"],
    }
    train_schedule["constraint_distribution"] = "MARECO"
    r = requests.put(editoast_url + f"/train_schedule/{train_Schedule_id}", json=train_schedule)
    if r.status_code // 100 != 2:
        raise RuntimeError(f"Schedule error {r.status_code}: {r.content}, payload={json.dumps(train_schedule)}")
    r = requests.get(editoast_url + f"/train_schedule/{train_Schedule_id}/")
    body = r.json()
    assert body["constraint_distribution"] == "MARECO"
    return body


def test_get_and_update_schedule_result(west_to_south_east_simulation: Sequence[Any], small_infra: Infra):
    schedule = west_to_south_east_simulation[0]
    schedule_id = schedule["id"]
    response = requests.get(f"{EDITOAST_URL}train_schedule/{schedule_id}/")
    if response.status_code // 100 != 2:
        raise RuntimeError(f"Schedule error {response.status_code}: {response.content}, id={schedule_id}")
    response = requests.get(f"{EDITOAST_URL}train_schedule/{schedule_id}/simulation?infra_id={small_infra.id}")
    simulation_report = response.json()
    assert simulation_report["base"]["energy_consumption"] == simulation_report["final_output"]["energy_consumption"]

    response = _update_simulation_with_mareco_allowances(EDITOAST_URL, schedule_id)
    response = requests.get(f"{EDITOAST_URL}train_schedule/{schedule_id}/")
    if response.status_code // 100 != 2:
        raise RuntimeError(f"Schedule error {response.status_code}: {response.content}, id={schedule_id}")

    response = requests.get(f"{EDITOAST_URL}train_schedule/{schedule_id}/simulation?infra_id={small_infra.id}")
    simulation_report = response.json()
    assert simulation_report["base"]["energy_consumption"] != simulation_report["final_output"]["energy_consumption"]
    assert (
        simulation_report["provisional"]["energy_consumption"]
        == simulation_report["final_output"]["energy_consumption"]
    )


def test_editoast_delete(west_to_south_east_simulations: Sequence[Any]):
    trains = west_to_south_east_simulations[0:2]
    trains_ids = [train["id"] for train in trains]
    r = requests.delete(f"{EDITOAST_URL}train_schedule/", json={"ids": trains_ids})
    if r.status_code // 100 != 2:
        raise RuntimeError(f"Schedule error {r.status_code}: {r.content}, payload={json.dumps(trains_ids)}")
    r = requests.get(
        f"{EDITOAST_URL}train_schedule/{trains_ids[0]}/",
    )
    assert r.status_code == 404
    r = requests.get(
        f"{EDITOAST_URL}train_schedule/{trains_ids[1]}",
    )
    assert r.status_code == 404


def test_etcs_schedule_result(west_to_south_east_etcs_simulation: Sequence[Any], etcs_infra: Infra):
    schedule = west_to_south_east_etcs_simulation[0]
    schedule_id = schedule["id"]
    response = requests.get(f"{EDITOAST_URL}train_schedule/{schedule_id}/")
    response.raise_for_status()
    response = requests.get(f"{EDITOAST_URL}train_schedule/{schedule_id}/simulation?infra_id={etcs_infra.id}")
    simulation_final_output = response.json()["final_output"]

    assert len(simulation_final_output["positions"]) == len(simulation_final_output["speeds"])

    # TODO: x-fail test: those 2 brake starts MUST move once ETCS braking is plugged
    speed_section1_const_brake_start_offset = 35718795
    assert get_current_or_next_speed_at(simulation_final_output, speed_section1_const_brake_start_offset) == 80
    assert get_current_or_next_speed_at(simulation_final_output, speed_section1_const_brake_start_offset + 1) < 80
    final_stop_const_brake_start_offset = 43975031
    assert get_current_or_next_speed_at(simulation_final_output, final_stop_const_brake_start_offset) == 39.444
    assert get_current_or_next_speed_at(simulation_final_output, final_stop_const_brake_start_offset + 1) < 39.444


def get_current_or_next_speed_at(simulation_final_output: Dict[str, Any], position: int) -> int:
    idx = bisect.bisect_left(simulation_final_output["positions"], position)
    return simulation_final_output["speeds"][idx]
