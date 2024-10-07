import { Bug } from '@osrd-project/ui-icons';
import cx from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { getIsSuperUser } from 'reducers/user/userSelectors';

type StdcmHeaderProps = {
  isDebugMode: boolean;
  onDebugModeToggle: React.Dispatch<React.SetStateAction<boolean>>;
};

const StdcmHeader = ({ isDebugMode, onDebugModeToggle }: StdcmHeaderProps) => {
  const { t } = useTranslation('stdcm');
  const isSuperUser = useSelector(getIsSuperUser);

  return (
    <div className="stdcm-header d-flex">
      <span className="stdcm-header__title pl-5">ST DCM</span>
      <div className="flex-grow-1 d-flex justify-content-center">
        <span className="stdcm-header__notification " id="notification">
          {t('notificationTitle')}
        </span>
      </div>
      {isSuperUser && (
        <div className="stdcm-header_debug">
          <button
            type="button"
            aria-label="stdcm-debug"
            className={cx({ 'debug-on': isDebugMode, 'debug-off': !isDebugMode })}
            onClick={() => onDebugModeToggle(!isDebugMode)}
          >
            <Bug />
          </button>
        </div>
      )}
    </div>
  );
};

export default StdcmHeader;
