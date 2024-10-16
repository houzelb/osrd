import { RadioButton } from '@osrd-project/ui-core';
import cx from 'classnames';
import { useDispatch } from 'react-redux';

import { useOsrdConfActions } from 'common/osrdContext';
import type { StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';

import type { StdcmLinkedPathResult, ExtremityPathStepType } from '../../types';

type StdcmLinkedPathResultsProps = {
  linkedPathResults: StdcmLinkedPathResult[];
  linkedOp: { extremityType: ExtremityPathStepType; id: string };
};

const StdcmLinkedPathResults = ({
  linkedPathResults,
  linkedOp: { extremityType, id },
}: StdcmLinkedPathResultsProps) => {
  const dispatch = useDispatch();
  const { updateLinkedPathStep } = useOsrdConfActions() as StdcmConfSliceActions;
  return (
    <div className="stdcm-linked-path-results">
      {linkedPathResults.map(({ trainName, origin, destination }, index) => (
        <button
          key={`linked-path-${index}`}
          tabIndex={0}
          type="button"
          className="linked-path-result-infos"
          onClick={() => {
            if (linkedPathResults.length === 1)
              dispatch(
                updateLinkedPathStep({
                  linkedPathStep: extremityType,
                  trainName,
                  pathStep: linkedPathResults[0][extremityType],
                  pathStepId: id,
                })
              );
          }}
        >
          {linkedPathResults.length > 1 ? (
            <RadioButton
              label={trainName}
              id={`${extremityType}-${index}`}
              value={`${index}`}
              name={`linked-path-radio-buttons-${extremityType}`}
              onClick={({ target }) => {
                const resultIndex = Number((target as HTMLInputElement).value);
                dispatch(
                  updateLinkedPathStep({
                    linkedPathStep: extremityType,
                    trainName,
                    pathStep: linkedPathResults[resultIndex][extremityType],
                    pathStepId: id,
                  })
                );
              }}
            />
          ) : (
            <p className="train-name grey80">{trainName}</p>
          )}
          {[origin, destination].map((opPoint) => (
            <div
              key={`linked-op-${opPoint.obj_id}-${index}`}
              className={cx('d-flex', { 'ml-4 pl-1': linkedPathResults.length > 1 })}
            >
              <p className="opDetails grey50">{opPoint.date}</p>
              <p className="opDetails info60">{opPoint.time}</p>
              <p className="opDetails grey80">{opPoint.name}</p>
              {'trigram' in opPoint && <p className="opDetails grey80">{opPoint.trigram}</p>}
            </div>
          ))}
        </button>
      ))}
    </div>
  );
};

export default StdcmLinkedPathResults;
