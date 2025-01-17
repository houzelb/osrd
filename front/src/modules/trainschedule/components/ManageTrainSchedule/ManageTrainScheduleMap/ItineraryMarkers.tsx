import { useCallback, useEffect, useMemo, useState } from 'react';

import cx from 'classnames';
import type { Position } from 'geojson';
import type { Map } from 'maplibre-gl';
import { Marker } from 'react-map-gl/maplibre';

import destinationSVG from 'assets/pictures/destination.svg';
import stdcmDestination from 'assets/pictures/mapMarkers/destination.svg';
import stdcmVia from 'assets/pictures/mapMarkers/intermediate-point.svg';
import stdcmOrigin from 'assets/pictures/mapMarkers/start.svg';
import originSVG from 'assets/pictures/origin.svg';
import viaSVG from 'assets/pictures/via.svg';
import type { PathItemLocation, TrackSection } from 'common/api/osrdEditoastApi';
import { matchPathStepAndOp } from 'modules/pathfinding/utils';

import type { SuggestedOP } from '../types';
import useCachedTrackSections from 'applications/operationalStudies/hooks/useCachedTrackSections';
import { useOsrdConfSelectors } from 'common/osrdContext';
import { useSelector } from 'react-redux';

export type MarkerInformation = {
  name?: string;
  coordinates?: number[] | Position;
  metadata?: {
    lineCode: number;
    lineName: string;
    trackName: string;
    trackNumber: number;
  };
} & PathItemLocation;

enum MARKER_TYPE {
  ORIGIN = 'origin',
  VIA = 'via',
  DESTINATION = 'destination',
}

type MarkerProperties = {
  op: SuggestedOP;
  pathStep: MarkerInformation;
  coordinates: number[] | Position;
  imageSource: string;
} & (
  | {
      type: MARKER_TYPE.ORIGIN | MARKER_TYPE.DESTINATION;
    }
  | {
      type: MARKER_TYPE.VIA;
      index: number;
    }
);

type ItineraryMarkersProps = {
  map: Map;
  simulationPathSteps: MarkerInformation[];
  pathStepsAndSuggestedOPs?: SuggestedOP[];
  showStdcmAssets: boolean;
};

const formatPointWithNoName = (
  lineCode: number,
  lineName: string,
  trackName: string,
  markerType: MarkerProperties['type']
) => (
  <>
    <div className="main-line">
      <div className="track-name">{trackName}</div>
      <div className="line-code">{lineCode}</div>
    </div>
    <div className={cx('second-line', { via: markerType === MARKER_TYPE.VIA })}>{lineName}</div>
  </>
);

const extractMarkerInformation = (
  pathSteps: MarkerInformation[],
  showStdcmAssets: boolean,
  suggestedOP: SuggestedOP[]
): MarkerProperties[] =>
  pathSteps
    .map((pathStep, index): MarkerProperties | null => {
      const matchingOp = suggestedOP.find((op) => matchPathStepAndOp(pathStep, op));

      if (!matchingOp) return null;

      if (pathStep.coordinates) {
        if (index === 0) {
          return {
            coordinates: pathStep.coordinates,
            type: MARKER_TYPE.ORIGIN,
            imageSource: showStdcmAssets ? stdcmOrigin : originSVG,
            op: matchingOp,
            pathStep,
          };
        }

        if (index === pathSteps.length - 1) {
          return {
            coordinates: pathStep.coordinates,
            type: MARKER_TYPE.DESTINATION,
            imageSource: showStdcmAssets ? stdcmDestination : destinationSVG,
            op: matchingOp,
            pathStep,
          };
        }

        return {
          coordinates: pathStep.coordinates,
          type: MARKER_TYPE.VIA,
          imageSource: showStdcmAssets ? stdcmVia : viaSVG,
          index,
          op: matchingOp,
          pathStep,
        };
      }
      return null;
    })
    .filter((marker): marker is MarkerProperties => marker !== null);

const ItineraryMarkers = ({
  map,
  simulationPathSteps,
  pathStepsAndSuggestedOPs,
  showStdcmAssets,
}: ItineraryMarkersProps) => {
  const { getInfraID } = useOsrdConfSelectors();
  const infraId = useSelector(getInfraID);
  if (!infraId) return;
  const { getTrackSectionsByIds } = useCachedTrackSections(infraId);

  const markersInformation = useMemo(
    () =>
      pathStepsAndSuggestedOPs &&
      extractMarkerInformation(simulationPathSteps, showStdcmAssets, pathStepsAndSuggestedOPs),
    [simulationPathSteps, showStdcmAssets]
  );

  const [trackSections, setTrackSections] = useState<Record<string, TrackSection>>({});

  useEffect(() => {
    const fetchTrackSections = async () => {
      const trackId = markersInformation?.map((markerInfo) => markerInfo.op.track);
      if (!trackId) return;
      setTrackSections(await getTrackSectionsByIds(trackId));
    };
    fetchTrackSections();
  }, [markersInformation]);

  const getMarkerDisplayInformation = useCallback(
    (markerInfo: MarkerProperties) => {
      const {
        pathStep: { metadata: markerMetadata, name: markerName },
        type: markerType,
      } = markerInfo;

      if (markerName) return markerName;

      if (markerMetadata) {
        const {
          lineCode: markerLineCode,
          lineName: markerLineName,
          trackName: markerTrackName,
        } = markerMetadata;
        return formatPointWithNoName(markerLineCode, markerLineName, markerTrackName, markerType);
      }

      const { op } = markerInfo;
      const trackId = op.track;
      const trackSection = trackSections[trackId];

      const metadataFromSuggestedOp = trackSection?.extensions?.sncf;

      if (!metadataFromSuggestedOp) return null;

      const { line_code, line_name, track_name } = metadataFromSuggestedOp;

      if (metadataFromSuggestedOp) {
        if (line_code && line_name && track_name)
          return formatPointWithNoName(line_code, line_name, track_name, markerInfo.type);
      }

      return null;
    },
    [map, trackSections]
  );

  return markersInformation?.map((markerInfo) => {
    const isDestination = markerInfo.type === MARKER_TYPE.DESTINATION;
    const isVia = markerInfo.type === MARKER_TYPE.VIA;
    const markerName = (
      <div className={`map-pathfinding-marker ${markerInfo.type}-name`}>
        {getMarkerDisplayInformation(markerInfo)}
      </div>
    );

    return (
      <Marker
        longitude={markerInfo.coordinates[0]}
        latitude={markerInfo.coordinates[1]}
        offset={isDestination && !showStdcmAssets ? [0, -24] : [0, -12]}
        key={isVia ? `via-${markerInfo.index}` : markerInfo.type}
      >
        <img
          src={markerInfo.imageSource}
          alt={markerInfo.type}
          style={showStdcmAssets ? {} : { height: isDestination ? '3rem' : '1.5rem' }}
        />
        {isVia && (
          <span
            className={cx('map-pathfinding-marker', 'via-number', {
              'stdcm-via': isVia && showStdcmAssets,
            })}
          >
            {markerInfo.index}
          </span>
        )}
        {!showStdcmAssets && markerName}
      </Marker>
    );
  });
};

export default ItineraryMarkers;
