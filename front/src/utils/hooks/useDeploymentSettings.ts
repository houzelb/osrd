import { useEffect, useState } from 'react';

import defaultLogo from 'assets/logo-color.svg';
import defaultOsrdLogo from 'assets/logo-osrd-color-white.svg';
import proudLogo from 'assets/proud-logo-color.svg';
import proudOsrdLogo from 'assets/proud-logo-osrd-color-white.svg';
import xmasLogo from 'assets/xmas-logo-color.svg';
import xmasOsrdLogo from 'assets/xmas-logo-osrd-color-white.svg';

const MONTH_VALUES = {
  JUNE: 5,
  DECEMBER: 11,
};
type DeploymentSettings = {
  digitalTwinName: string;
  digitalTwinLogo: string;
  digitalTwinLogoWithName: string;
  stdcmName: string;
  stdcmLogo?: string;
  stdcmSimulationSheetLogo?: string;
  isCustomizedDeployment: boolean;
};

const useDeploymentSettings = () => {
  const [customizedDeploymentSetting, setCustomizedDeploymentSetting] =
    useState<DeploymentSettings>({
      digitalTwinName: 'Osrd',
      digitalTwinLogo: defaultLogo,
      digitalTwinLogoWithName: defaultOsrdLogo,
      stdcmName: 'Stdcm',
      stdcmLogo: undefined,
      stdcmSimulationSheetLogo: undefined,
      isCustomizedDeployment: false,
    });

  useEffect(() => {
    const fetchInternalProd = async () => {
      try {
        const response = await fetch('/overrides/overrides.json');
        if (!response.ok || response.headers.get('Content-Type') !== 'application/json') {
          let digitalTwinLogo = defaultLogo;
          let digitalTwinLogoWithName = defaultOsrdLogo;
          const currentMonth = new Date().getMonth();

          if (currentMonth === MONTH_VALUES.JUNE) {
            digitalTwinLogo = proudLogo;
            digitalTwinLogoWithName = proudOsrdLogo;
          } else if (currentMonth === MONTH_VALUES.DECEMBER) {
            digitalTwinLogo = xmasLogo;
            digitalTwinLogoWithName = xmasOsrdLogo;
          }

          setCustomizedDeploymentSetting((prev) => ({
            ...prev,
            isCustomizedDeployment: false,
            digitalTwinLogo,
            digitalTwinLogoWithName,
          }));
        } else {
          const overridesData = await response.json();
          const { icons, names } = overridesData;

          const lmrLogoPath = `/overrides/${icons.stdcm.light}.svg`;
          const lmrPngLogoPath = `/overrides/${icons.stdcm.light}@2x.png`;
          const horizonLogoWithNamePath = `/overrides/${icons.digital_twin.dark}_Grey10.svg`;
          const horizonLogoPath = `/overrides/${icons.digital_twin.dark}_Logo_Grey40.svg`;

          setCustomizedDeploymentSetting({
            digitalTwinName: names.digital_twin,
            digitalTwinLogo: horizonLogoPath,
            digitalTwinLogoWithName: horizonLogoWithNamePath,
            stdcmName: names.stdcm,
            stdcmLogo: lmrLogoPath,
            stdcmSimulationSheetLogo: lmrPngLogoPath,
            isCustomizedDeployment: true,
          });
        }
      } catch (error) {
        console.error('Error fetching overrides.json', error);
      }
    };
    fetchInternalProd();
  }, []);

  return customizedDeploymentSetting;
};

export default useDeploymentSettings;
