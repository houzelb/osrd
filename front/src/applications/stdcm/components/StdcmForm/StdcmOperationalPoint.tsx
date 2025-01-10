import { useEffect, useMemo, useState } from 'react';

import { Select, ComboBox } from '@osrd-project/ui-core';
import { useTranslation } from 'react-i18next';

import useSearchOperationalPoint from 'common/Map/Search/useSearchOperationalPoint';
import { useOsrdConfActions } from 'common/osrdContext';
import type { StdcmConfSliceActions } from 'reducers/osrdconf/stdcmConf';
import type { StdcmPathStep } from 'reducers/osrdconf/types';
import { useAppDispatch } from 'store';
import { normalized } from 'utils/strings';

type StdcmOperationalPointProps = {
  location?: StdcmPathStep['location'];
  pathStepId: string;
  disabled?: boolean;
};

type Option = StdcmPathStep['location'] & { label: string };

function formatChCode(chCode: string) {
  return chCode === '' ? 'BV' : chCode;
}

const StdcmOperationalPoint = ({ location, pathStepId, disabled }: StdcmOperationalPointProps) => {
  const { t } = useTranslation('stdcm');
  const dispatch = useAppDispatch();

  const {
    searchTerm,
    setSearchTerm,
    sortedSearchResults: searchResults,
    setSearchResults,
  } = useSearchOperationalPoint({
    initialSearchTerm: location?.name,
    initialChCodeFilter: location?.secondary_code,
    isStdcm: true,
  });

  const [chSuggestions, setChSuggestions] = useState<{ label: string; id: string }[]>([]);

  const { updateStdcmPathStep } = useOsrdConfActions() as StdcmConfSliceActions;

  const selectedCi = useMemo(
    () =>
      location
        ? {
            ...location,
            label: [location.trigram, location.name].join(' '),
          }
        : undefined,
    [location]
  );

  const selectedCh = useMemo(
    () =>
      location
        ? { label: formatChCode(location.secondary_code), id: location.secondary_code }
        : undefined,
    [location]
  );

  const ciSuggestions: Option[] = useMemo(
    () =>
      // Temporary filter added to show a more restrictive list of suggestions inside the stdcm app.
      searchResults
        .filter(
          (op) =>
            normalized(op.name).startsWith(normalized(searchTerm)) ||
            normalized(op.name).includes(normalized(searchTerm)) ||
            op.trigram === searchTerm.toUpperCase()
        )
        .reduce<Option[]>((acc, p) => {
          const newObject = {
            label: [p.trigram, p.name].join(' '),
            trigram: p.trigram,
            uic: p.uic,
            secondary_code: p.ch,
            name: p.name,
            coordinates: p.geographic.coordinates as [number, number],
          };
          const isDuplicate = acc.some((pr) => pr.label === newObject.label);
          if (!isDuplicate) acc.push(newObject);
          return acc;
        }, []),
    [searchResults]
  );

  const updateChSuggestions = (selectedLocationName: string) => {
    const newChSuggestions = searchResults
      .filter((pr) => pr.name === selectedLocationName)
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
      );
    setChSuggestions(newChSuggestions);
  };

  const handleCiSelect = (selectedSuggestion?: Option) => {
    if (selectedSuggestion) {
      updateChSuggestions(selectedSuggestion.name);
    } else {
      setChSuggestions([]);
    }
    dispatch(updateStdcmPathStep({ id: pathStepId, updates: { location: selectedSuggestion } }));
  };

  const handleChSelect = (selectedChCode?: { id: string }) => {
    if (location && selectedChCode) {
      dispatch(
        updateStdcmPathStep({
          id: pathStepId,
          updates: { location: { ...location, secondary_code: selectedChCode?.id } },
        })
      );
    }
  };

  const handleCiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const resetSuggestions = () => {
    setSearchResults([]);
    setSearchTerm('');
  };

  useEffect(() => {
    if (location) {
      setSearchTerm(location.name);
      // Clear the list of CH suggestions if the location has changed to avoid showing outated suggestions
      if (!chSuggestions.some((suggestion) => suggestion.label === location.secondary_code)) {
        setChSuggestions([]);
      }
    } else {
      setSearchTerm('');
      setChSuggestions([]);
    }
  }, [location]);

  useEffect(() => {
    if (location && searchResults.length > 0) {
      updateChSuggestions(location.name);
    }
  }, [searchResults]);

  return (
    <div className="location-line">
      <div className="col-9 ci-input">
        <ComboBox
          id={`${pathStepId}-ci`}
          label={t('trainPath.ci')}
          value={selectedCi}
          suggestions={ciSuggestions}
          onChange={handleCiInputChange}
          getSuggestionLabel={(option: Option) => option.label}
          onSelectSuggestion={handleCiSelect}
          resetSuggestions={resetSuggestions}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      <div className="col-3 p-0">
        <Select
          label={t('trainPath.ch')}
          id={`${pathStepId}-ch`}
          value={selectedCh}
          onChange={handleChSelect}
          options={chSuggestions}
          getOptionLabel={(option: { id: string; label: string }) => option.label}
          getOptionValue={(option: { id: string; label: string }) => option.id}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default StdcmOperationalPoint;
