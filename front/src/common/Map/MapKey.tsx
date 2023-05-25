import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import colors from 'common/Map/Consts/colors';
import { getMapStyle } from 'reducers/map/selectors';
import { catenaryMapKey, MapKeyProps, speedLimitMapKey } from './const';
import 'common/Map/MapKey.scss';
import HearderPopUp from './HeaderPopUp';

const MapSettings = ({ closeMapKeyPopUp }: MapKeyProps) => {
  const { t } = useTranslation(['translation', 'map-key']);
  const mapStyle = useSelector(getMapStyle);

  const speedLimits = speedLimitMapKey.map((key) => (
    <div className="mapkey-item" key={key.text}>
      <div className="mapkey-icon">
        <i className={`mapkey-line mapkey-${key.speed}`} />
      </div>
      <div className="mapkey-text">{key.text}</div>
    </div>
  ));

  const catenaries = catenaryMapKey.map((key) => (
    <div className="mapkey-item" key={key.text}>
      <div className="mapkey-icon">
        <i
          className="powerline"
          style={{
            background: `repeating-linear-gradient(to right, ${colors[mapStyle].powerline[key.color]
              } 20px, #333 22px, #333 24px)`,
          }}
        />
      </div>
      <div className="mapkey-text">
        {`${key.text} ${key.current ? t(`map-key:${key.current}`) : null}`}
      </div>
    </div>
  ));

  return (
    <div className="map-modal map-modal-dark">
      <HearderPopUp onClick={closeMapKeyPopUp} title={t('map-key:keyTitle')} isLight />
      <div className="row">
        <div className="col-lg-6">
          <div className="mapkey">
            <div className="mapkey-title">{t('map-key:speedlimit')}</div>
            {speedLimits}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="mapkey">
            <div className="mapkey-title">{t('map-key:catenaries')}</div>
            {catenaries}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="mapkey">
            <div className="mapkey-title">{t('map-key:dead_sections')}</div>
            <div className="mapkey-item" key='drop_pantograph'>
              <div className="mapkey-icon">
                <i className="mapkey-line" style={{ background: colors[mapStyle].dead_sections.drop_pantograph }} />
              </div>
              <div className="mapkey-text">
                {t('map-key:drop_pantograph')}
              </div>
            </div>
            <div className="mapkey-item" key='cut_off'>
              <div className="mapkey-icon">
                <i className="mapkey-line" style={{ background: colors[mapStyle].dead_sections.cut_off }} />
              </div>
              <div className="mapkey-text">
                {t('map-key:cut_off')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSettings;
