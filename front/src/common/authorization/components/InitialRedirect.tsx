import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

import Home from 'main/home';
import { getIsOnlyStdcmProfile } from 'reducers/user/userSelectors';

const InitialRedirect = () => {
  const isOnlyStdcmProfile = useSelector(getIsOnlyStdcmProfile);

  return isOnlyStdcmProfile ? <Navigate to="stdcm" /> : <Home />;
};

export default InitialRedirect;
