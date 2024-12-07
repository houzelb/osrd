import { Bug } from '@osrd-project/ui-icons';
import cx from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { getIsSuperUser } from 'reducers/user/userSelectors';

type StdcmHeaderProps = {
  isDebugMode: boolean;
  onDebugModeToggle: React.Dispatch<React.SetStateAction<boolean>>;
  toggleHelpModule: () => void;
  showHelpModule: boolean;
};

const StdcmHeader = ({
  isDebugMode,
  onDebugModeToggle,
  toggleHelpModule,
  showHelpModule,
}: StdcmHeaderProps) => {
  const { t } = useTranslation(['stdcm', 'translation']);
  const isSuperUser = useSelector(getIsSuperUser);

  return (
    <div className="stdcm-header d-flex">
      <span className="stdcm-header__title pl-5">ST DCM</span>
      <div className="flex-grow-1 d-flex justify-content-center">
        <span className="stdcm-header__notification " id="notification">
          {t('stdcm:notificationTitle')}
        </span>
      </div>
      {isSuperUser && (
        <div className="stdcm-header__debug">
          <button
            data-testid="stdcm-debug-button"
            type="button"
            aria-label="stdcm-debug"
            className={cx('debug', { selected: isDebugMode })}
            onClick={() => onDebugModeToggle(!isDebugMode)}
          >
            <Bug />
          </button>
          <button
            type="button"
            aria-label="stdcm-help"
            className={cx('ml-4 px-3', { selected: showHelpModule })}
            onClick={() => toggleHelpModule()}
          >
            {t('translation:common.help')}
          </button>
        </div>
      )}
    </div>
  );
};

export default StdcmHeader;
