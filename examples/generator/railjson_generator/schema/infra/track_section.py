from dataclasses import dataclass, field
from typing import List

from railjson_generator.schema.infra.direction import ApplicableDirection, Direction
from railjson_generator.schema.infra.endpoint import Endpoint, TrackEndpoint
from railjson_generator.schema.infra.link import Link
from railjson_generator.schema.infra.operational_point import OperationalPointPart
from railjson_generator.schema.infra.signal import Signal
from railjson_generator.schema.infra.waypoint import BufferStop, Detector, Waypoint


def _track_id():
    res = f"track.{TrackSection._INDEX}"
    TrackSection._INDEX += 1
    return res


@dataclass
class TrackSection:
    _INDEX = 0

    length: float
    label: str = field(default_factory=_track_id)
    waypoints: List[Waypoint] = field(default_factory=list)
    signals: List[Signal] = field(default_factory=list)
    operational_points: List[OperationalPointPart] = field(default_factory=list)
    index: int = field(default=-1, repr=False)
    begining_links: List[TrackEndpoint] = field(default_factory=list, repr=False)
    end_links: List[TrackEndpoint] = field(default_factory=list, repr=False)

    def begin(self):
        return TrackEndpoint(self, Endpoint.BEGIN)

    def end(self):
        return TrackEndpoint(self, Endpoint.END)

    def add_buffer_stop(self, *args, **wargs):
        bs = BufferStop(*args, **wargs)
        self.waypoints.append(bs)
        return bs

    def add_detector(self, *args, **wargs):
        detector = Detector(*args, **wargs)
        self.waypoints.append(detector)
        return detector

    def add_signal(self, *args, **wargs):
        signal = Signal(*args, **wargs)
        self.signals.append(signal)
        return signal

    def sort_waypoints(self):
        self.waypoints.sort(key=lambda w: w.position)

    def sort_signals(self):
        self.signals.sort(key=lambda s: s.position)

    def contains_buffer_stop(self) -> bool:
        for waypoint in self.waypoints:
            if waypoint.waypoint_type == "buffer_stop":
                return True
        return False

    @staticmethod
    def register_link(link: Link):
        if link.navigability != ApplicableDirection.REVERSE:
            link.begin.get_neighbors().append(link.end)
        if link.navigability != ApplicableDirection.NORMAL:
            link.end.get_neighbors().append(link.begin)

    def neighbors(self, direction: Direction):
        if direction == Direction.START_TO_STOP:
            return self.end_links
        return self.begining_links

    def format(self):
        return {
            "id": self.label,
            "route_waypoints": [waypoint.format() for waypoint in self.waypoints],
            "signals": [signal.format() for signal in self.signals],
            "operational_points": [op.format() for op in self.operational_points],
            "length": self.length,
            "slopes": [],
            "curves": [],
            "speed_sections": [],
        }
