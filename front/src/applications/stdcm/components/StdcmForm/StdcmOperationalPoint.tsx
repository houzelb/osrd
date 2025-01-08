import { useEffect, useMemo } from 'react';

import { Select, ComboBox } from '@osrd-project/ui-core';
import { useTranslation } from 'react-i18next';

import { type SearchResultItemOperationalPoint } from 'common/api/osrdEditoastApi';
import useSearchOperationalPoint from 'common/Map/Search/useSearchOperationalPoint';
import { useOsrdConfActions } from 'common/osrdContext';
import type { StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmPathStep } from 'reducers/osrdconf/types';
import { useAppDispatch } from 'store';
import { normalized } from 'utils/strings';
import { createFixedSelectOptions } from 'utils/uiCoreHelpers';

type StdcmOperationalPointProps = {
  location?: StdcmPathStep['location'];
  pathStepId: string;
  disabled?: boolean;
  showErrors?: boolean;
};

type Option = { label: string; value: string; uic: number };

function formatChCode(chCode: string) {
  return chCode === '' ? 'BV' : chCode;
}

const StdcmOperationalPoint = ({
  location,
  pathStepId,
  disabled,
  showErrors,
}: StdcmOperationalPointProps) => {
  const { t } = useTranslation('stdcm');
  const dispatch = useAppDispatch();

  const { searchTerm, sortedSearchResults, setSearchTerm, setChCodeFilter } =
    useSearchOperationalPoint({
      initialSearchTerm: location?.name,
      initialChCodeFilter: location?.secondary_code,
    });

  const { updateStdcmPathStep } = useOsrdConfActions() as StdcmConfSliceActions;

  const isFieldEmpty = !searchTerm.trim();

  const operationalPointsSuggestions = useMemo(
    () =>
      // Temporary filter added to show a more restrictive list of suggestions inside the stdcm app.
      sortedSearchResults
        .filter(
          (op) =>
            normalized(op.name).startsWith(normalized(searchTerm)) ||
            op.trigram === searchTerm.toUpperCase()
        )
        .reduce((acc, p) => {
          const newObject = {
            label: [p.trigram, p.name].join(' '),
            value: p.name,
            uic: p.uic,
          };
          const isDuplicate = acc.some((pr) => pr.label === newObject.label);
          if (!isDuplicate) acc.push(newObject);
          return acc;
        }, [] as Option[]),
    [sortedSearchResults]
  );

  const sortedChOptions = useMemo(
    () =>
      sortedSearchResults
        .filter((pr) => (location ? pr.name === location.name : pr.name === searchTerm))
        .reduce(
          (acc, pr) => {
            const newObject = {
              label: formatChCode(pr.ch),
              id: pr.ch,
            };
            const isDuplicate = acc.some((option) => option.label === newObject.label);
            if (!isDuplicate) acc.push(newObject);
            return acc;
          },
          [] as { label: string; id: string }[]
        ),
    [location, sortedSearchResults]
  );

  const dispatchNewPoint = (p?: SearchResultItemOperationalPoint) => {
    if (p && location && p.ch === location.secondary_code && p.uic === location.uic) return;
    const newLocation = p
      ? {
          name: p.name,
          secondary_code: p.ch,
          uic: p.uic,
          coordinates: p.geographic.coordinates as [number, number],
        }
      : undefined;
    dispatch(updateStdcmPathStep({ id: pathStepId, updates: { location: newLocation } }));
  };

  const updateSelectedPoint = (
    refList: SearchResultItemOperationalPoint[],
    selectedUic: number,
    selectedChCode?: string
  ) => {
    const newPoint = refList.find(
      (pr) => pr.uic === selectedUic && (selectedChCode ? pr.ch === selectedChCode : true)
    );
    dispatchNewPoint(newPoint);
  };

  const onSelectSuggestion = (selectedSuggestion?: Option) => {
    if (!selectedSuggestion) {
      setSearchTerm('');
      return;
    }
    const { value: suggestionName, uic } = selectedSuggestion;
    setSearchTerm(suggestionName);
    updateSelectedPoint(sortedSearchResults, uic);
  };

  const onSelectChCodeFilter = (selectedChCode?: { id: string }) => {
    setChCodeFilter(selectedChCode?.id);
    if (location) {
      updateSelectedPoint(sortedSearchResults, location.uic, selectedChCode?.id);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.trim().length === 0) {
      dispatchNewPoint(undefined);
    }
  };

  useEffect(() => {
    if (location) {
      setSearchTerm(location.name);
      setChCodeFilter(location.secondary_code);
    } else {
      setSearchTerm('');
      setChCodeFilter(undefined);
    }
  }, [location]);

  return (
    <div className="location-line">
      <div className="col-9 ci-input">
        <ComboBox
          id={`${pathStepId}-ci`}
          label={t('trainPath.ci')}
          value={searchTerm}
          onChange={onInputChange}
          autoComplete="off"
          suggestions={operationalPointsSuggestions}
          disabled={disabled}
          getSuggestionLabel={(option: Option) => option?.label}
          onSelectSuggestion={onSelectSuggestion}
          disableDefaultFilter
          statusWithMessage={
            showErrors && isFieldEmpty
              ? { tooltip: 'left', status: 'error', message: t('form.missingValue') }
              : undefined
          }
        />
      </div>
      <div className="col-3 p-0">
        <Select
          label={t('trainPath.ch')}
          id={`${pathStepId}-ch`}
          value={
            location
              ? { label: formatChCode(location.secondary_code), id: location.secondary_code }
              : undefined
          }
          onChange={(e) => onSelectChCodeFilter(e)}
          {...createFixedSelectOptions(sortedChOptions)}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default StdcmOperationalPoint;
