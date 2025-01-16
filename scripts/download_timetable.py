#
# This script can be used to download the content of a timetable knowing only its ID,
# as a JSON file that can be re-imported in OSRD.
#

import requests
import json
from typing import Dict, List

EDITOAST_URL = "https://rec-osrd.reseau.sncf.fr/"
COOKIES = {
    # Connect to the front-end and look through the "cookies" part of any sent request
    "gateway" : ""
}
TIMETABLE_ID = 1
OUT_PATH = "timetable.json"


def download_timetable(timetable_id: int) -> List[Dict]:
    response = requests.get(f"{EDITOAST_URL}api/timetable/{timetable_id}/", cookies=COOKIES, verify=False)
    response.raise_for_status()
    json_response = response.json()
    train_ids = json_response["train_ids"]
    return download_trains(train_ids)


def download_trains(train_ids: List[int]) -> List[Dict]:
    payload = {
        "ids": train_ids
    }
    response = requests.post(f"{EDITOAST_URL}api/train_schedule/", cookies=COOKIES, json=payload, verify=False)
    response.raise_for_status()
    json_response = response.json()
    for path_item in json_response:
        del path_item["id"]
        del path_item["timetable_id"]
    return json_response


if __name__ == "__main__":
    trains = download_timetable(TIMETABLE_ID)
    with open(OUT_PATH, "w", encoding="utf-8") as jsonfile:
        json.dump(trains, jsonfile, ensure_ascii=False, indent=4)
    print(f"dumped timetable {TIMETABLE_ID} ({len(trains)} trains) to {OUT_PATH}")
