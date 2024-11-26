import datetime
import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Union

import requests

from fuzzer.fuzzer import (
    _get_random_rolling_stock,
    _random_set_element,
    _to_ms,
    get_infra,
)
from tests.scenario import Scenario

_TIMEOUT = 300

_EDITOAST_URL = "http://127.0.0.1:8090/"
_INFRA_NAME = "France"
_TIMETABLE_ID = 0

"""
Generates random stdcm requests on a single infra + fixed timetable.
Much lighter than `fuzzer.py`, but can't generate regression tests.
Inputs that can't directly be set in the (non-debug) STDCM UI are fixed.

This isn't automatically run anywhere, it's only used by hand for more convenient
testing. May not always be up-to-date.

Note: on an imported infra and timetables, tests take a while.

Usage: `poetry run python -m fuzzer.fuzzer_stdcm_single_timetable`
"""


@dataclass
class STDCMException(Exception):
    error: Union[str, Dict]
    status_code: Optional[int] = None
    payload: Optional[Dict] = None


@dataclass
class TimetableTimeRange:
    start: datetime.datetime
    end: datetime.datetime

    def make_random_time(self) -> str:
        delta = (self.end - self.start).seconds
        date = self.start + datetime.timedelta(seconds=(random.randint(0, delta)))
        return date.isoformat()


def run(
    editoast_url: str,
    scenario: Scenario,
    n_test: int = 1000,
    log_folder: Optional[Path] = None,
    seed: Optional[int] = None,
):
    """
    Run the given number of tests, logging errors in the given folder as json files
    """
    requests.post(editoast_url + f"infra/{scenario.infra}/load").raise_for_status()
    timetable_range = _build_timetable_range(editoast_url, scenario)
    seed = seed or random.randint(0, 2**32)
    op_list = list(_make_op_list(editoast_url, scenario.infra))
    for i in range(n_test):
        seed += 1
        print("seed:", seed)
        random.seed(seed)
        try:
            _test_stdcm(editoast_url, op_list, scenario, timetable_range)
        except STDCMException as e:
            if log_folder is None:
                raise e
            else:
                print(e.error)
                log_folder.mkdir(exist_ok=True)
                with open(str(log_folder / f"{i}.json"), "w") as f:
                    print(
                        json.dumps(
                            {
                                "error": e.error,
                                "payload": e.payload,
                            },
                            indent=4,
                            default=lambda o: "<not serializable>",
                        ),
                        file=f,
                    )


def _build_timetable_range(editoast_url, scenario) -> TimetableTimeRange:
    """
    Build the (approximate) range in which the timetable contains trains
    """
    print("building timetable time range")
    r = requests.get(f"{editoast_url}/timetable/{scenario.timetable}")
    r.raise_for_status()
    train_ids = r.json()["train_ids"]
    train_ids = random.sample(train_ids, min(100, len(train_ids)))
    train_times = list()
    for train_id in train_ids:
        r = requests.get(f"{editoast_url}/train_schedule/{train_id}")
        r.raise_for_status()
        start_time = datetime.datetime.strptime(r.json()["start_time"], "%Y-%m-%dT%H:%M:%SZ")
        start_time = start_time.astimezone(datetime.timezone.utc)
        train_times.append(start_time)
    if not train_times:
        t = datetime.datetime(year=2024, month=1, day=1, tzinfo=datetime.timezone.utc)
        return TimetableTimeRange(
            start=t,
            end=t,
        )
    else:
        return TimetableTimeRange(start=min(train_times), end=max(train_times) + datetime.timedelta(hours=3))


def _make_op_list(editoast_url, infra) -> Iterable[int]:
    print("loading infra to generate op list")
    url = editoast_url + f"infra/{infra}/railjson/"
    r = requests.get(url)
    infra = r.json()
    for op in infra["operational_points"]:
        yield op["extensions"]["identifier"]["uic"]


def _test_stdcm(editoast_url: str, op_list: List[int], scenario: Scenario, timetable_range: TimetableTimeRange):
    """
    Run a single test instance
    """
    stdcm_payload = None
    try:
        rolling_stock = _get_random_rolling_stock(editoast_url)
        stdcm_payload = _make_stdcm_payload(op_list, rolling_stock.id, timetable_range)
        r = requests.post(
            editoast_url + f"/timetable/{scenario.timetable}/stdcm/?infra={scenario.infra}",
            json=stdcm_payload,
            timeout=_TIMEOUT,
        )
        if r.status_code // 100 != 2:
            is_json = "application/json" in r.headers.get("Content-Type", "")
            raise STDCMException(error=r.json() if is_json else r.content, status_code=r.status_code)
    except STDCMException as e:
        e.payload = stdcm_payload
        raise e
    except Exception as e:
        raise STDCMException(error=str(e), payload=stdcm_payload)
    print("test PASSED")


def _make_stdcm_payload(op_list: List[int], rolling_stock: int, timetable_range: TimetableTimeRange) -> Dict:
    """
    Generate a random stdcm payload
    """
    res = {
        "rolling_stock_id": rolling_stock,
        "steps": _make_steps(op_list, timetable_range),
        "comfort": "STANDARD",
        "margin": "5%",
    }
    return res


def _make_steps(op_list: List[int], timetable_range: TimetableTimeRange) -> List[Dict]:
    """
    Generate steps for the stdcm payloads
    """
    steps = []
    # Steps aren't sorted in any way, so long path are much more likely to fail
    n_steps = random.randint(2, 3)
    for _ in range(n_steps):
        steps.append(
            {
                "location": {
                    "uic": _random_set_element(op_list),
                }
            }
        )
    index_set_time = random.randint(-1, 0)  # first or last
    steps[index_set_time]["timing_data"] = {
        "arrival_time": timetable_range.make_random_time(),
        "arrival_time_tolerance_before": _to_ms(random.randint(0, 4 * 3_600)),
        "arrival_time_tolerance_after": _to_ms(random.randint(0, 4 * 3_600)),
    }
    steps[index_set_time]["duration"] = 1

    steps[-1]["duration"] = 1  # Force a stop at the end
    return steps


if __name__ == "__main__":
    infra_id = get_infra(_EDITOAST_URL, _INFRA_NAME)
    run(
        _EDITOAST_URL,
        scenario=Scenario(-1, -1, -1, infra_id, _TIMETABLE_ID),
        n_test=10_000,
        log_folder=Path(__file__).parent / "errors",
    )
