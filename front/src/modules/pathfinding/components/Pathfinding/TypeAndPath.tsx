/* eslint-disable jsx-a11y/no-autofocus */
import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert, TriangleRight } from '@osrd-project/ui-icons';
import cx from 'classnames';
import { useTranslation } from 'react-i18next';
import nextId from 'react-id-generator';

import type {
  PostSearchApiArg,
  SearchResultItemOperationalPoint,
} from 'common/api/osrdEditoastApi';
import { osrdEditoastApi } from 'common/api/osrdEditoastApi';
import { MAIN_OP_CH_CODES } from 'common/Map/Search/useSearchOperationalPoint';
import { useInfraID, useOsrdConfActions } from 'common/osrdContext';
import { useStoreDataForRollingStockSelector } from 'modules/rollingStock/components/RollingStockSelector/useStoreDataForRollingStockSelector';
import { useAppDispatch } from 'store';
import { useDebounce } from 'utils/helpers';
import {
  isCursorSurroundedBySpace,
  findCurrentWord,
  calculateAdjustedCursorPositionRem,
  replaceCurrentWord,
} from 'utils/inputManipulation';

type SearchConstraintType = (string | number | string[])[];

const monospaceOneCharREMWidth = 0.6225;

function OpTooltips({ opList }: { opList: SearchResultItemOperationalPoint[] }) {
  // Calculation of chars distance from left to put tooltip on center of op name
  const calcLeftMargin = (charsFromLeft: number, length: number) =>
    charsFromLeft * monospaceOneCharREMWidth + (length * monospaceOneCharREMWidth) / 2;
  let charsFromLeft = 0;
  return (
    <div className="op-tooltips">
      {opList.map((op, idx) => {
        const leftMargin = calcLeftMargin(charsFromLeft, op.trigram.length);
        charsFromLeft = charsFromLeft + op.trigram.length + 1;
        return (
          op.trigram !== '' && (
            <div
              className={cx('op', { wrong: !op.name })}
              key={`typeandpath-op-${idx}-${op.trigram}`}
              style={{ left: `${leftMargin}rem` }}
              title={op.name}
              data-testid={`typeandpath-op-${op.trigram}`}
            >
              {op.name ? op.name : <Alert />}
            </div>
          )
        );
      })}
    </div>
  );
}
type TypeAndPathProps = {
  setDisplayTypeAndPath: React.Dispatch<React.SetStateAction<boolean>>;
};

const TypeAndPath = ({ setDisplayTypeAndPath }: TypeAndPathProps) => {
  const dispatch = useAppDispatch();
  const [inputText, setInputText] = useState('');
  const [opList, setOpList] = useState<SearchResultItemOperationalPoint[]>([]);
  const infraId = useInfraID();
  const [postSearch] = osrdEditoastApi.endpoints.postSearch.useMutation();

  const { t: tManageTrainSchedule } = useTranslation('operationalStudies/manageTrainSchedule');
  const { t: tTypeAndPath } = useTranslation('common/typeAndPath');

  const { rollingStock } = useStoreDataForRollingStockSelector();
  const { updatePathSteps } = useOsrdConfActions();

  const [searchResults, setSearchResults] = useState<SearchResultItemOperationalPoint[]>([]);
  const [searchState, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchTerm = useDebounce(searchState, 300);
  const debouncedInputText = useDebounce(inputText.trimEnd(), 500);

  const activeElement = document.activeElement as HTMLInputElement;
  const cursorIndex = activeElement.selectionStart || 0;
  const sortedSearchResults = [...searchResults].sort((a, b) => a.name.localeCompare(b.name));
  const [initialCursorPositionRem, setInitialCursorPositionRem] = useState(0);
  const [trigramCount, setTrigramCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInput = (text: string, newCursorPosition: number) => {
    const trimmedTextStart = text.trimStart();
    setInputText(trimmedTextStart);
    if (isCursorSurroundedBySpace(text, newCursorPosition)) {
      setSearchResults([]);
      setSearch('');
    } else {
      const currentWord = findCurrentWord(trimmedTextStart, newCursorPosition);
      setSearch(currentWord || '');
      setCursorPosition(newCursorPosition);
    }
  };

  const searchOperationalPoints = async () => {
    const searchQuery = ['or', ['search', ['name'], debouncedSearchTerm]];

    const payload = {
      object: 'operationalpoint',
      query: ['and', searchQuery, infraId !== undefined ? ['=', ['infra_id'], infraId] : true],
    };

    await postSearch({
      searchPayload: payload,
      pageSize: 101,
    })
      .unwrap()
      .then((results) => {
        const filteredResults = results.filter((result) =>
          MAIN_OP_CH_CODES.includes((result as SearchResultItemOperationalPoint).ch)
        );
        setSearchResults(filteredResults as SearchResultItemOperationalPoint[]);
      })
      .catch(() => {
        setSearchResults([]);
      });
  };

  function getOpNames() {
    if (infraId !== undefined) {
      const opTrigrams = inputText.toUpperCase().trimEnd().split(' ');
      const constraint = opTrigrams.reduce(
        (res, trigram) => [...res, ['=', ['trigram'], trigram]],
        ['or'] as (string | SearchConstraintType)[]
      );
      // SNCF trigrams come with a yard name, for main station it could be nothing '',
      // 'BV' (as Bâtiment Voyageurs) or '00', all are the same signification: this is the main station.
      const limitToMainStationConstraint = [
        'or',
        ['=', ['ch'], ''],
        ['=', ['ch'], 'BV'],
        ['=', ['ch'], '00'],
      ];
      const payload: PostSearchApiArg = {
        searchPayload: {
          object: 'operationalpoint',
          query: ['and', constraint, ['=', ['infra_id'], infraId], limitToMainStationConstraint],
        },
        pageSize: 100,
      };
      postSearch(payload)
        .unwrap()
        .then((results) => {
          const operationalPoints = [...results] as SearchResultItemOperationalPoint[];
          setOpList(
            opTrigrams.map(
              (trigram) => operationalPoints.find((op) => op.trigram === trigram) || { trigram }
            ) as SearchResultItemOperationalPoint[]
          );
        });
    }
  }

  const isInvalid = useMemo(() => opList.some((op) => !op.name && op.trigram !== ''), [opList]);

  const launchPathFinding = async () => {
    if (infraId && rollingStock && opList.length > 0) {
      const pathSteps = opList
        .filter((op) => op.trigram !== '')
        .map(({ uic, ch }) => ({
          uic,
          ch,
          secondary_code: ch,
          id: nextId(),
        }));

      dispatch(updatePathSteps({ pathSteps }));
      setDisplayTypeAndPath(false);
    }
  };

  const onResultClick = (result: SearchResultItemOperationalPoint) => {
    const newText = replaceCurrentWord(inputText, cursorPosition, result);

    setInputText(newText);
    setSearch('');
    setTrigramCount((prev) => prev + 1);

    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = newText.length;
        inputRef.current.focus();
        inputRef.current.selectionStart = newCursorPosition;
        inputRef.current.selectionEnd = newCursorPosition;
        const adjustedCursorPositionRem = calculateAdjustedCursorPositionRem(
          initialCursorPositionRem,
          trigramCount,
          monospaceOneCharREMWidth
        );
        document.documentElement.style.setProperty(
          '--cursor-position',
          `${adjustedCursorPositionRem}rem`
        );
      }
    }, 0);
  };

  useEffect(() => {
    if (debouncedSearchTerm) {
      searchOperationalPoints();
    } else if (searchResults.length) {
      setSearchResults([]);
    }
  }, [debouncedSearchTerm, inputText]);

  useEffect(() => {
    if (debouncedInputText !== '') {
      getOpNames();
    } else {
      setOpList([]);
    }
  }, [debouncedInputText]);

  useEffect(() => {
    const cursorPositionRem = (cursorIndex - searchState.length / 2) * 0.55;

    document.documentElement.style.setProperty('--cursor-position', `${cursorPositionRem}rem`);
  }, [cursorIndex, searchState]);

  useEffect(() => {
    setInitialCursorPositionRem(0);
  }, []);

  const isSortedSearchResultsDisplayed = useMemo(() => {
    const trigrams = debouncedInputText.split(' ');
    const opListFiltered = opList.filter((op) => op.name !== undefined);
    return trigrams.length !== opListFiltered.length;
  }, [debouncedInputText, opList]);

  return (
    <>
      <div
        className="type-and-path mb-2"
        style={{ minWidth: `${monospaceOneCharREMWidth * inputText.length + 5.5}rem` }}
        data-testid="type-and-path-container"
      >
        <div className="help">{opList.length === 0 && tManageTrainSchedule('inputOPTrigrams')}</div>
        <OpTooltips opList={opList} />
        <div className="d-flex align-items-center">
          <div
            className={cx('form-control-container', 'flex-grow-1', 'mr-2', {
              'is-invalid': isInvalid,
            })}
          >
            <input
              ref={inputRef}
              className="form-control form-control-sm text-zone"
              type="text"
              value={inputText}
              onChange={(e) => handleInput(e.target.value, e.target.selectionStart as number)}
              placeholder={tManageTrainSchedule('inputOPTrigramsExample')}
              autoFocus
              data-testid="type-and-path-input"
            />
            <span className="form-control-state" />
          </div>
          <button
            className="btn btn-sm btn-success"
            type="button"
            aria-label={tManageTrainSchedule('launchPathFinding')}
            title={tManageTrainSchedule('launchPathFinding')}
            onClick={launchPathFinding}
            disabled={isInvalid || opList.length < 2}
            data-testid="submit-search-by-trigram"
          >
            <TriangleRight />
          </button>
        </div>
      </div>
      {searchResults.length > 0 && isSortedSearchResultsDisplayed && (
        <>
          <span className="arrow-img"> </span>
          <div className="results-container">
            <div className="station-results p-2">
              {sortedSearchResults.map((result) => (
                <button
                  id={`trigram-button-${result.name}`}
                  type="button"
                  onClick={() => onResultClick(result)}
                  key={result.obj_id}
                  className="station"
                  title={`${result.name} ${result.ch}`}
                >
                  <span className="station-text text-secondary">{result.name}</span>
                </button>
              ))}
              {sortedSearchResults.length > 8 && (
                <div
                  className="ellipsis-placeholder"
                  title={tTypeAndPath('refineSearchForMoreResults')}
                >
                  ...
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TypeAndPath;