import { useState } from 'react';

import { ChevronRight, X } from '@osrd-project/ui-icons';
import cx from 'classnames';
import { useTranslation } from 'react-i18next';

import HelpSection from './HelpSection';

type StdcmHelpSectionProps = {
  toggleHelpModule: () => void;
  showHelpModule: boolean;
};

const StdcmHelpModule = ({ toggleHelpModule, showHelpModule }: StdcmHelpSectionProps) => {
  const { t } = useTranslation('stdcm-help-section');

  const [activeSection, setActiveSection] = useState<string | null>(null);

  const closeHelpModule = () => {
    setActiveSection(null);
    toggleHelpModule();
  };
  const closeHelpSection = () => setActiveSection(null);
  const support = t('asu', { returnObjects: true }) as { title: string; value: string }[];
  const sections = Object.keys(t('sections', { returnObjects: true }));
  return (
    <div className={cx('stdcm__help-module', { active: showHelpModule })}>
      <div className="stdcm__help-module__header">
        <button type="button" className="stdcm__help-module__close" onClick={closeHelpModule}>
          <X size="lg" />
        </button>
      </div>
      <div className="stdcm__help-module__content">
        <h1 className="stdcm__help-module__title">{t('help')}</h1>
        <div className="stdcm__help-module__chapters">
          {sections.map((section, index) => (
            <div key={section}>
              <button type="button" className="flex" onClick={() => setActiveSection(section)}>
                <div>{t(`sections.${section}.title`)}</div>
                <div className="ml-auto icon">
                  <ChevronRight />
                </div>
              </button>
              {index !== sections.length - 1 && <hr />}
            </div>
          ))}
        </div>
      </div>
      <footer>
        {Array.isArray(support) &&
          support.map((item, index) => (
            <div key={item.title}>
              <div className="support-info">
                <div className="support-info__title">{item.title}</div>
                <div className="support-info__content">{item.value}</div>
              </div>
              {index !== support.length - 1 && <hr />}
            </div>
          ))}
        <div className="support-asu__link">
          <a href="https://sncfreseau.service-now.com/support_asu" target="_blank" rel="noreferrer">
            {t('asuLink')}
          </a>
        </div>
      </footer>
      {sections.map((section) => (
        <HelpSection
          section={section}
          closeHelpSection={closeHelpSection}
          isActive={section === activeSection}
          key={section}
        />
      ))}
    </div>
  );
};

export default StdcmHelpModule;
