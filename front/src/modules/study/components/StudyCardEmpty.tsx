import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa';
import AddOrEditStudyModal from 'modules/study/components/AddOrEditStudyModal';
import { useModal } from 'common/BootstrapSNCF/ModalSNCF';

export default function StudyCard() {
  const { t } = useTranslation(['operationalStudies/project', 'operationalStudies/study']);
  const { openModal } = useModal();

  return (
    <div
      data-testid="addStudy"
      className="study-card empty"
      role="button"
      tabIndex={0}
      onClick={() => openModal(<AddOrEditStudyModal />, 'xl')}
    >
      <FaPlus />
      <div className="legend">{t('createStudy')}</div>
    </div>
  );
}
