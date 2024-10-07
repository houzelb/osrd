import type { ReactNode } from 'react';

import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa';

import useUserRoleCheck from '../../../common/authorization/hooks/useUserRoleCheck';
import { REQUIRED_USER_ROLES_FOR } from '../../../common/authorization/roleBaseAccessControl';
import { useModal } from '../../../common/BootstrapSNCF/ModalSNCF';

type AddNewCardProps = {
  translationNamespaces?: string[] | string;
  testId: string;
  className: string;
  modalComponent: ReactNode;
  legendTranslationKey: string;
};

const AddNewCard = ({
  translationNamespaces,
  testId,
  className,
  modalComponent,
  legendTranslationKey,
}: AddNewCardProps) => {
  const { t } = useTranslation(translationNamespaces);
  const { openModal } = useModal();

  const newProjectStudyScenarioAllowed = useUserRoleCheck(
    REQUIRED_USER_ROLES_FOR.FEATURES.CREATE_NEW_PROJECT_STUDY_SCENARIO
  );

  return (
    <div
      data-testid={testId}
      className={`${className}`}
      {...(!newProjectStudyScenarioAllowed && { 'aria-disabled': true })}
      role="button"
      tabIndex={0}
      onClick={() =>
        newProjectStudyScenarioAllowed && openModal(modalComponent, 'xl', 'no-close-modal')
      }
    >
      <FaPlus />
      <div className="legend">{t(legendTranslationKey)}</div>
    </div>
  );
};

export default AddNewCard;
