/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';

import { point } from '@turf/helpers';
import { useTranslation } from 'react-i18next';
import { IoFlag } from 'react-icons/io5';
import { RiMapPin2Fill, RiMapPin3Fill } from 'react-icons/ri';
import nextId from 'react-id-generator';
import { Popup } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';

import { editoastToEditorEntity } from 'applications/editor/data/api';
import type { TrackSectionEntity } from 'applications/editor/tools/trackEdition/types';
import { calculateDistanceAlongTrack } from 'applications/editor/tools/utils';
import { useManageTrainScheduleContext } from 'applications/operationalStudies/hooks/useManageTrainScheduleContext';
import type { ManageTrainSchedulePathProperties } from 'applications/operationalStudies/types';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { useOsrdConfSelectors } from 'common/osrdContext';
import { setPointIti } from 'modules/trainschedule/components/ManageTrainSchedule/ManageTrainScheduleMap/setPointIti';
import { getOrigin, getDestination } from 'reducers/osrdconf/operationalStudiesConf/selectors';
import type { PathStep } from 'reducers/osrdconf/types';

import type { FeatureInfoClick } from '../types';

type AddPathStepPopupProps = {
  pathProperties?: ManageTrainSchedulePathProperties;
  featureInfoClick: FeatureInfoClick;
  resetFeatureInfoClick: () => void;
};

function AddPathStepPopup({
  pathProperties,
  featureInfoClick,
  resetFeatureInfoClick,
}: AddPathStepPopupProps) {
  const { getInfraID } = useOsrdConfSelectors();
  const { launchPathfinding } = useManageTrainScheduleContext();
  const { t } = useTranslation(['operationalStudies/manageTrainSchedule']);
  const infraId = useSelector(getInfraID);
  const origin = useSelector(getOrigin);
  const destination = useSelector(getDestination);

  const [trackOffset, setTrackOffset] = useState(0);

  const [getTrackEntity] =
    osrdEditoastApi.endpoints.postInfraByInfraIdObjectsAndObjectType.useLazyQuery();

  useEffect(() => {
    const calculateOffset = async () => {
      const trackId = featureInfoClick.feature.properties?.id;
      const result = await getTrackEntity({
        infraId: infraId!,
        objectType: 'TrackSection',
        body: [trackId],
      }).unwrap();

      if (!result.length) {
        console.error('No track found');
        return;
      }

      const trackEntity = editoastToEditorEntity<TrackSectionEntity>(result[0], 'TrackSection');
      const offset = calculateDistanceAlongTrack(
        trackEntity,
        point(featureInfoClick.coordinates.slice(0, 2)).geometry,
        'millimeters'
      );
      setTrackOffset(offset);
    };

    calculateOffset();
  }, [featureInfoClick]);

  if (!featureInfoClick.feature.properties) return null;

  const { properties: trackProperties } = featureInfoClick.feature;
  const coordinates = featureInfoClick.coordinates.slice(0, 2);

  const pathStepProperties: PathStep = {
    id: nextId(),
    coordinates,
    track: trackProperties.id,
    offset: Math.round(trackOffset), // offset needs to be an integer
    kp: trackProperties.kp,
    metadata: {
      lineCode: trackProperties.extensions_sncf_line_code,
      lineName: trackProperties.extensions_sncf_line_name,
      trackName: trackProperties.extensions_sncf_track_name,
      trackNumber: trackProperties.extensions_sncf_track_number,
    },
  };

  return (
    <Popup
      longitude={featureInfoClick.coordinates[0]}
      latitude={featureInfoClick.coordinates[1]}
      closeButton={false}
      closeOnClick={false}
      className="map-popup-click-select"
    >
      <div className="details">
        <div className="details-track">
          {featureInfoClick.feature.properties.extensions_sncf_track_name}
          <small>{featureInfoClick.feature.properties.extensions_sncf_line_code}</small>
        </div>
        <div className="details-line">
          {featureInfoClick.feature.properties.extensions_sncf_line_name}
        </div>
      </div>

      <div className="actions">
        <button
          data-testid="map-origin-button"
          className="btn btn-sm btn-success"
          type="button"
          onClick={() =>
            setPointIti('origin', pathStepProperties, launchPathfinding, resetFeatureInfoClick)
          }
        >
          <RiMapPin2Fill />
          <span className="d-none">{t('origin')}</span>
        </button>
        {origin && destination && (
          <button
            className="btn btn-sm btn-info"
            type="button"
            onClick={() =>
              setPointIti(
                'via',
                pathStepProperties,
                launchPathfinding,
                resetFeatureInfoClick,
                pathProperties
              )
            }
          >
            <RiMapPin3Fill />
            <span className="d-none">{t('via')}</span>
          </button>
        )}
        <button
          data-testid="map-destination-button"
          className="btn btn-sm btn-warning"
          type="button"
          onClick={() =>
            setPointIti('destination', pathStepProperties, launchPathfinding, resetFeatureInfoClick)
          }
        >
          <IoFlag />
          <span className="d-none">{t('destination')}</span>
        </button>
      </div>
    </Popup>
  );
}

export default React.memo(AddPathStepPopup);
