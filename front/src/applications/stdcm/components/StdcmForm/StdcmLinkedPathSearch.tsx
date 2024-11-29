import { useState, type ReactNode } from 'react';

import { DatePicker, Input } from '@osrd-project/ui-core';
import { Gear } from '@osrd-project/ui-icons';
import { useTranslation } from 'react-i18next';

import useLinkedPathSearch from 'applications/stdcm/hooks/useLinkedPathSearch';

import StdcmCard from './StdcmCard';
import StdcmDefaultCard from './StdcmDefaultCard';
import StdcmLinkedPathResults from './StdcmLinkedPathResults';
import type { ExtremityPathStepType } from '../../types';

type StdcmLinkedPathSearchProps = {
  disabled: boolean;
  cardIcon: ReactNode;
  cardName: string;
  className?: string;
  defaultCardText: string;
  linkedOp: { extremityType: ExtremityPathStepType; id: string };
};

const StdcmLinkedPathSearch = ({
  disabled,
  cardIcon,
  cardName,
  className = '',
  defaultCardText,
  linkedOp,
}: StdcmLinkedPathSearchProps) => {
  const { t } = useTranslation('stdcm');
  const [displayLinkedPathSearch, setShowLinkedPathSearch] = useState(false);

  const {
    displaySearchButton,
    hasSearchBeenLaunched,
    launchTrainScheduleSearch,
    linkedPathDate,
    linkedPathResults,
    selectableSlot,
    setDisplaySearchButton,
    setLinkedPathDate,
    setTrainNameInput,
    trainNameInput,
  } = useLinkedPathSearch();

  return (
    <div className={`stdcm-linked-path-search-container ${className}`}>
      {!displayLinkedPathSearch ? (
        <StdcmDefaultCard
          disabled={disabled}
          text={defaultCardText}
          Icon={cardIcon}
          className="add-linked-path"
          onClick={() => setShowLinkedPathSearch(true)}
        />
      ) : (
        <StdcmCard
          disabled={disabled}
          name={cardName}
          title={
            <button type="button" onClick={() => setShowLinkedPathSearch(false)}>
              {t('translation:common.delete').toLowerCase()}
            </button>
          }
          className="linked-path"
        >
          <div className="d-flex pr-1 pl-3">
            <Input
              id="linked-path-id"
              type="text"
              value={trainNameInput}
              onChange={(e) => {
                setDisplaySearchButton(true);
                setTrainNameInput(e.target.value);
              }}
              label="N°"
            />
            <DatePicker
              inputProps={{
                id: 'linked-path-date',
                label: 'Date',
                name: 'op-date',
              }}
              selectableSlot={selectableSlot}
              value={linkedPathDate}
              onDateChange={(date) => {
                setLinkedPathDate(date);
              }}
            />
          </div>
          {displaySearchButton && (
            <button
              className="stdcm-linked-path-button"
              type="button"
              onClick={launchTrainScheduleSearch}
            >
              {t('find')}
            </button>
          )}
          {!displaySearchButton && !linkedPathResults.length && (
            <div className="stdcm-linked-path-button white">
              <Gear size="lg" className="stdcm-linked-path-loading" />
            </div>
          )}
          {linkedPathResults.length > 0 ? (
            <StdcmLinkedPathResults linkedPathResults={linkedPathResults} linkedOp={linkedOp} />
          ) : (
            hasSearchBeenLaunched && (
              <p className="text-center mb-0">{t('noCorrespondingResults')}</p>
            )
          )}
        </StdcmCard>
      )}
    </div>
  );
};

export default StdcmLinkedPathSearch;
