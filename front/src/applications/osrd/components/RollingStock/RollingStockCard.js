import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { BsLightningFill } from 'react-icons/bs';
import { MdLocalGasStation } from 'react-icons/md';
import { IoIosSpeedometer } from 'react-icons/io';
import { FaWeightHanging } from 'react-icons/fa';
import { AiOutlineColumnWidth } from 'react-icons/ai';
import RollingStockCardDetail from 'applications/osrd/components/RollingStock/RollingStockCardDetail';
import RollingStock2Img from 'applications/osrd/components/RollingStock/RollingStock2Img';
import mlgTraffic from 'applications/osrd/components/RollingStock/consts/mlgtraffic.json';

function RollingStockInfos(props) {
  const { data } = props;
  const series = data.series ? (
    <span className="rollingstock-infos-begin">
      <span className="rollingstock-infos-series">{data.series}</span>
      <span className="rollingstock-infos-subseries">
        {data.series !== data.subseries ? data.subseries : null}
      </span>
      <span className="rollingstock-infos-unit">{data.unit !== 'US' ? data.unit : null}</span>
    </span>
  ) : (
    <span className="rollingstock-infos-begin">
      <span className="rollingstock-infos-series">{data.reference}</span>
      <span className="rollingstock-infos-subseries">{data.detail}</span>
    </span>
  );
  const family = data.series ? (
    <span className="rollingstock-infos-middle">
      {`${data.family} / ${data.type} / ${data.grouping}`}
    </span>
  ) : null;
  return (
    <div className="rollingstock-infos">
      {series}
      {family}
      <span className="rollingstock-infos-end">{data.name}</span>
    </div>
  );
}

export default function RollingStockCard(props) {
  const [tractionModes, setTractionModes] = useState({
    electric: false,
    thermal: false,
    voltages: [],
  });
  const { data, openedRollingStockCardId, setOpenedRollingStockCardId } = props;

  function displayCardDetail() {
    setOpenedRollingStockCardId(data.id);
  }

  useEffect(() => {
    if (typeof data.effort_curves.modes === 'object') {
      const localVoltages = {};
      const localModes = {};
      Object.keys(data.effort_curves.modes).forEach((modeName) => {
        if (data.effort_curves.modes[modeName].is_electric) {
          localModes.electric = true;
          localVoltages[modeName] = true;
        } else {
          localModes.thermal = true;
        }
      });
      setTractionModes({ ...localModes, voltages: Object.keys(localVoltages) });
    }
    // Has to be run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`rollingstock-container mb-3 ${
        openedRollingStockCardId === data.id ? 'active' : null
      }`}
      role="button"
      onClick={displayCardDetail}
      tabIndex={0}
    >
      <div className="rollingstock-header">
        <div className="rollingstock-title">
          <RollingStockInfos data={data} />
          <div className="sr-only">
            <small className="text-primary mr-1">ID</small>
            <span className="font-weight-lighter small">{data.id}</span>
          </div>
        </div>
      </div>
      {openedRollingStockCardId === data.id ? <RollingStockCardDetail id={data.id} /> : null}
      {openedRollingStockCardId !== data.id && mlgTraffic[data.name] ? (
        <div className="rollingstock-body-img">
          <div className="rollingstock-img">
            <RollingStock2Img name={data.name} />
          </div>
        </div>
      ) : null}
      <div className="rollingstock-footer py-2">
        <div className="row">
          <div className="col-5">
            <div className="rollingstock-tractionmode text-nowrap">
              {tractionModes.thermal ? (
                <span className="text-pink">
                  <MdLocalGasStation />
                </span>
              ) : null}
              {tractionModes.electric ? (
                <>
                  <span className="text-primary">
                    <BsLightningFill />
                  </span>
                  <small>
                    {tractionModes.voltages.map((voltage) => (
                      <span className="ml-1" key={`${voltage}${data.id}`}>
                        {voltage}V
                      </span>
                    ))}
                  </small>
                </>
              ) : null}
            </div>
          </div>
          <div className="col-2">
            <div className="rollingstock-size text-nowrap">
              <AiOutlineColumnWidth />
              {data.length}
              <small>M</small>
            </div>
          </div>
          <div className="col-2">
            <div className="rollingstock-weight text-nowrap">
              <FaWeightHanging />
              {Math.round(data.mass / 1000)}
              <small>T</small>
            </div>
          </div>
          <div className="col-3">
            <div className="rollingstock-speed text-nowrap">
              <IoIosSpeedometer />
              {Math.round(data.max_speed * 3.6)}
              <small>KM/H</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

RollingStockCard.defaultProps = {
  openedRollingStockCardId: undefined,
};

RollingStockInfos.propTypes = {
  data: PropTypes.object.isRequired,
};

RollingStockCard.propTypes = {
  data: PropTypes.object.isRequired,
  openedRollingStockCardId: PropTypes.number,
  setOpenedRollingStockCardId: PropTypes.func.isRequired,
};
