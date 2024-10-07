import useUserRoleCheck from 'common/authorization/hooks/useUserRoleCheck';
import { REQUIRED_USER_ROLES_FOR } from 'common/authorization/roleBaseAccessControl';

export default function useAllowedUserRoles() {
  const operationalStudiesAllowed = useUserRoleCheck(
    REQUIRED_USER_ROLES_FOR.VIEWS.OPERATIONAL_STUDIES
  );
  const stdcmAllowed = useUserRoleCheck(REQUIRED_USER_ROLES_FOR.VIEWS.STDCM);
  const infraEditorAllowed = useUserRoleCheck(REQUIRED_USER_ROLES_FOR.VIEWS.INFRA_EDITOR);
  const rollingStockEditorAllowed = useUserRoleCheck(
    REQUIRED_USER_ROLES_FOR.VIEWS.ROLLING_STOCK_EDITOR
  );
  const mapAllowed = useUserRoleCheck(REQUIRED_USER_ROLES_FOR.VIEWS.MAP);

  return {
    operationalStudiesAllowed,
    stdcmAllowed,
    infraEditorAllowed,
    rollingStockEditorAllowed,
    mapAllowed,
  };
}
