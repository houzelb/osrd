import { type ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import Tipped from 'common/Tipped';

type MapButtonProps = {
  onClick: () => void;
  isNewButton: boolean;
  icon: ReactNode;
  tooltipKey: string;
  extraClasses?: string;
  dataTestId?: string;
};

const MapButton = ({
  onClick,
  isNewButton,
  icon,
  tooltipKey,
  extraClasses = '',
  dataTestId,
}: MapButtonProps) => {
  const { t } = useTranslation('translation');

  return (
    <Tipped mode="left">
      <button
        type="button"
        className={`${isNewButton ? 'new-btn-map' : 'btn-rounded btn-rounded-white'} ${extraClasses}`}
        onClick={onClick}
        data-testid={dataTestId}
      >
        <span className="sr-only">{t(tooltipKey)}</span>
        {icon}
      </button>
      <span>{t(tooltipKey)}</span>
    </Tipped>
  );
};

export default MapButton;
