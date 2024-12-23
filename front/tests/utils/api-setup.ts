import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

import type {
  ElectricalProfileSet,
  GetProjectsApiResponse,
  GetProjectsByProjectIdStudiesApiResponse,
  GetProjectsByProjectIdStudiesAndStudyIdScenariosApiResponse,
  GetLightRollingStockApiResponse,
  LightElectricalProfileSet,
  GetInfraApiResponse,
  InfraWithState,
  ProjectWithStudies,
  StudyWithScenarios,
  ScenarioWithDetails,
  LightRollingStockWithLiveries,
  Project,
  Infra,
  Study,
  Scenario,
  LightRollingStock,
  StdcmSearchEnvironment,
  TowedRollingStock,
  GetTowedRollingStockApiResponse,
} from 'common/api/osrdEditoastApi';

import electricalProfileSet from '../assets/operationStudies/simulationSettings/electricalProfiles/electricalProfile.json';
import { globalProjectName, globalStudyName, infrastructureName } from '../assets/project-const';
import towedRollingStockData from '../assets/stdcm/towedRollingStock/towedRollingStock.json';
import { logger } from '../test-logger';

/**
 * Initialize a new API request context with the base URL.
 *
 * @returns {Promise<APIRequestContext>} - The API request context.
 */
export const getApiContext = async (): Promise<APIRequestContext> =>
  request.newContext({
    baseURL: 'http://localhost:4000',
  });

/**
 * Send a GET request to the specified API endpoint with optional query parameters.
 *
 * @param url - The API endpoint URL.
 * @param params - Optional query parameters to include in the request.
 */
export const getApiRequest = async (
  url: string,
  params?: { [key: string]: string | number | boolean }
) => {
  const apiContext = await getApiContext();
  const response = await apiContext.get(url, { params });
  return response.json();
};

/**
 * Handle API error responses by checking the status and throwing an error if the request failed.
 *
 * @param response - The response object from the API request.
 * @param errorMessage - Optional. The error message to throw if the request fails.
 * @throws {Error} - Throws an error if the response status is not OK.
 */
export function handleErrorResponse(response: APIResponse, errorMessage = 'API Request Failed') {
  if (response.ok()) return;

  throw new Error(`${errorMessage}: ${response.status()} ${response.statusText()}`);
}

/**
 * Send a POST request to the specified API endpoint with optional data and query parameters.
 *
 * @template T
 * @param url - The API endpoint URL.
 * @param data - Optional. The payload to send in the request body.
 * @param params - Optional query parameters to include in the request.
 * @param errorMessage - Optional. Custom error message for failed requests.
 */
export const postApiRequest = async <T>(
  url: string,
  data?: T,
  params?: { [key: string]: string | number | boolean },
  errorMessage?: string
) => {
  const apiContext = await getApiContext();
  const response = await apiContext.post(url, { data, params });
  handleErrorResponse(response, errorMessage);

  return response.json();
};

/**
 * Send a DELETE request to the specified API endpoint.
 *
 * @param url - The API endpoint URL.
 * @returns {Promise<APIResponse>} - The response from the API.
 */
export const deleteApiRequest = async (
  url: string,
  errorMessage?: string
): Promise<APIResponse> => {
  const apiContext = await getApiContext();
  const response = await apiContext.delete(url);
  handleErrorResponse(response, errorMessage);
  return response;
};

/**
 * Retrieve infrastructure data by name.
 *
 * @param infraName - The name of the infrastructure to retrieve.
 * @returns {Promise<Infra>} - The matching infrastructure data.
 */
export const getInfra = async (infraName = infrastructureName): Promise<Infra> => {
  const infras: GetInfraApiResponse = await getApiRequest('/api/infra');
  const infra = infras.results.find((i: InfraWithState) => i.name === infraName);
  return infra as Infra;
};

/**
 * Retrieve infrastructure data by ID.
 *
 * @param infraId - The ID of the infrastructure to retrieve.
 * @returns {Promise<InfraWithState>} - The matching infrastructure data.
 */
export const getInfraById = async (infraId: number): Promise<InfraWithState> => {
  try {
    const response = await getApiRequest(`/api/infra/${infraId}`);
    return response as InfraWithState;
  } catch (error) {
    throw new Error(`Failed to retrieve infrastructure with ID ${infraId}: ${error}`);
  }
};

/**
 * Retrieve project data by name.
 *
 * @param projectName - The name of the project to retrieve.
 * @returns {Promise<Project>} - The matching project data.
 */
export const getProject = async (projectName = globalProjectName): Promise<Project> => {
  const projects: GetProjectsApiResponse = await getApiRequest('/api/projects');
  const project = projects.results.find((p: ProjectWithStudies) => p.name === projectName);
  return project as Project;
};

/**
 * Retrieve study data by project ID and study name.
 *
 * @param projectId - The ID of the project.
 * @param studyName - The name of the study to retrieve.
 * @returns {Promise<Study>} - The matching study data.
 */
export const getStudy = async (projectId: number, studyName = globalStudyName): Promise<Study> => {
  const studies: GetProjectsByProjectIdStudiesApiResponse = await getApiRequest(
    `/api/projects/${projectId}/studies`
  );
  const study = studies.results.find((s: StudyWithScenarios) => s.name === studyName);
  return study as Study;
};

/**
 * Retrieve scenario data by project ID, study ID, and scenario name.
 *
 * @param projectId - The ID of the project.
 * @param studyId - The ID of the study.
 * @param scenarioName - The name of the scenario to retrieve.
 * @returns {Promise<Scenario>} - The matching scenario data.
 */
export const getScenario = async (
  projectId: number,
  studyId: number,
  scenarioName: string
): Promise<Scenario> => {
  const scenarios: GetProjectsByProjectIdStudiesAndStudyIdScenariosApiResponse =
    await getApiRequest(`/api/projects/${projectId}/studies/${studyId}/scenarios`);
  const scenario = scenarios.results.find((s: ScenarioWithDetails) => s.name === scenarioName);
  return scenario as Scenario;
};

/**
 * Retrieve rolling stock data by name.
 *
 * @param rollingStockName - The name of the rolling stock to retrieve.
 * @returns {Promise<RollingStock>} - The matching rolling stock data.
 */
export const getRollingStock = async (rollingStockName: string): Promise<LightRollingStock> => {
  const rollingStocks: GetLightRollingStockApiResponse = await getApiRequest(
    '/api/light_rolling_stock',
    { page_size: 500 }
  );
  const rollingStock = rollingStocks.results.find(
    (r: LightRollingStockWithLiveries) => r.name === rollingStockName
  );
  return rollingStock as LightRollingStock;
};

/**
 * Retrieve electrical profile data by name.
 *
 * @param electricalProfileName - The name of the electrical profile to retrieve.
 * @returns {Promise<ElectricalProfileSet>} - The matching electrical profile data.
 */
export const getElectricalProfile = async (
  electricalProfileName: string
): Promise<LightElectricalProfileSet> => {
  const electricalProfiles: LightElectricalProfileSet[] = await getApiRequest(
    `/api/electrical_profile_set`
  );
  const electricalProfile = electricalProfiles.find(
    (e: LightElectricalProfileSet) => e.name === electricalProfileName
  );
  return electricalProfile as LightElectricalProfileSet;
};

/**
 * Set a new electrical profile.
 */
export const setElectricalProfile = async (): Promise<ElectricalProfileSet> => {
  const electricalProfile = await postApiRequest(
    `/api/electrical_profile_set`,
    {
      ...electricalProfileSet,
    },
    { name: `small infra ${uuidv4()}` }
  );
  return electricalProfile as ElectricalProfileSet;
};

/**
 * Fetch the STDCM environment if not in CI mode.
 */
export async function getStdcmEnvironment(): Promise<StdcmSearchEnvironment | null> {
  if (process.env.CI) return null; // Skip in CI mode.

  try {
    const apiContext = await getApiContext();
    const response = await apiContext.get('api/stdcm/search_environment');

    if (response.status() === 200) {
      return (await response.json()) as StdcmSearchEnvironment;
    }

    logger.warn(`STDCM environment not configured. HTTP status: ${response.status()}`);
    return null;
  } catch (error) {
    logger.error('Failed to fetch STDCM environment:', error);
    return null;
  }
}

/**
 * Set the STDCM environment with the provided data.
 *
 * @param stdcmEnvironment -The stdcm search environment to use.
 */
export async function setStdcmEnvironment(stdcmEnvironment: StdcmSearchEnvironment): Promise<void> {
  // Remove the `id` field to match the StdcmSearchEnvironmentCreateForm schema
  const { id, ...stdcmEnvironmentWithoutId } = stdcmEnvironment;
  await postApiRequest(
    '/api/stdcm/search_environment',
    stdcmEnvironmentWithoutId,
    undefined,
    'Failed to update STDCM configuration environment'
  );
}

/**
 * Retrieve a towed rolling stock by name.
 *
 * @param towedRollingStockName - The name of the towed rolling stock to retrieve.
 * @returns {Promise<TowedRollingStock >} - The matching towed rolling stock data .
 */
export const getTowedRollingStockByName = async (
  towedRollingStockName: string
): Promise<TowedRollingStock | undefined> => {
  const towedRollingStocks: GetTowedRollingStockApiResponse = await getApiRequest(
    '/api/towed_rolling_stock',
    { page_size: 50 }
  );
  const towedRollingStock = towedRollingStocks.results.find(
    (t: TowedRollingStock) => t.name === towedRollingStockName
  );
  return towedRollingStock;
};

/**
 * Create a towed rolling stock using predefined data from the imported JSON file.
 *
 * @returns {Promise<TowedRollingStock>} - The created towed rolling stock.
 */
export async function setTowedRollingStock(): Promise<TowedRollingStock> {
  // Check if the towed rolling stock already exists
  const existingTowedRollingStock = await getTowedRollingStockByName(towedRollingStockData.name);
  if (existingTowedRollingStock) {
    logger.info(`Towed rolling stock with name "${towedRollingStockData.name}" already exists.`);
    return existingTowedRollingStock;
  }

  // Create the towed rolling stock
  const createdTowedRollingStock = await postApiRequest(
    '/api/towed_rolling_stock',
    towedRollingStockData,
    undefined,
    'Failed to create towed rolling stock'
  );

  return createdTowedRollingStock as TowedRollingStock;
}
