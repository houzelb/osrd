import { sortBy } from 'lodash';

import {
  type GetLightRollingStockApiResponse,
  type GetSpritesSignalingSystemsApiResponse,
  generatedEditoastApi,
  type Property,
} from './generatedEditoastApi';

const formatPathPropertiesProps = (props: Property[]) =>
  props.map((prop) => `props[]=${prop}`).join('&');

const osrdEditoastApi = generatedEditoastApi.enhanceEndpoints({
  endpoints: {
    getLightRollingStock: {
      transformResponse: (response: GetLightRollingStockApiResponse) => ({
        ...response,
        results: sortBy(response?.results, ['metadata.reference', 'name']),
      }),
    },
    getSpritesSignalingSystems: {
      transformResponse: (response: GetSpritesSignalingSystemsApiResponse) => response.sort(),
    },
    // This endpoint will return only the props we ask for and the url needs to be build in a specific way
    // See https://osrd.fr/en/docs/reference/design-docs/timetable/#path
    postInfraByInfraIdPathProperties: {
      query: (queryArg) => ({
        // We currently can't build the url path the way we want with rtk query with the regular endpoint
        // so we need to do it manually with this function and enhanced endpoint
        url: `/infra/${queryArg.infraId}/path_properties?${formatPathPropertiesProps(queryArg.props)}`,
        method: 'POST',
        body: queryArg.pathPropertiesInput,
      }),
    },
    deleteTrainSchedule: {
      // As we always use all get trainschedule endpoints after updating the timetable,
      // we don't want to invalidate the trainschedule tag here to prevent multiple calls
      invalidatesTags: ['timetable', 'scenarios'],
    },
    postTimetableByIdTrainSchedule: {
      // As we always use all get trainschedule endpoints after updating the timetable,
      // we don't want to invalidate the trainschedule tag here to prevent multiple calls
      invalidatesTags: ['timetable', 'scenarios'],
    },

    // Project handling
    getProjects: {
      providesTags: (result) => [
        'projects',
        { type: 'projects', id: 'LIST' },
        ...(result?.results || []).map((project) => ({
          type: 'projects' as const,
          id: project.id,
        })),
      ],
    },
    getProjectsByProjectId: {
      providesTags: (_result, _error, args) => [
        'projects',
        { type: 'projects', id: args.projectId },
      ],
    },
    postProjects: {
      invalidatesTags: [{ type: 'projects', id: 'LIST' }],
    },
    patchProjectsByProjectId: {
      invalidatesTags: (_result, _error, args) => [
        { type: 'projects', id: 'LIST' },
        { type: 'projects', id: args.projectId },
      ],
    },
    deleteProjectsByProjectId: {
      invalidatesTags: [{ type: 'projects', id: 'LIST' }],
    },

    // Studies handling
    getProjectsByProjectIdStudies: {
      providesTags: (result) => [
        'studies',
        { type: 'studies', id: 'LIST' },
        ...(result?.results || []).map(({ id }) => ({
          type: 'studies' as const,
          id,
        })),
      ],
    },
    getProjectsByProjectIdStudiesAndStudyId: {
      providesTags: (_result, _error, args) => ['studies', { type: 'studies', id: args.studyId }],
    },
    postProjectsByProjectIdStudies: {
      invalidatesTags: (_result, _error, args) => [
        { type: 'projects', id: args.projectId },
        { type: 'studies', id: 'LIST' },
      ],
    },
    patchProjectsByProjectIdStudiesAndStudyId: {
      invalidatesTags: (_result, _error, args) => [
        { type: 'projects', id: args.projectId },
        { type: 'studies', id: 'LIST' },
        { type: 'studies', id: args.studyId },
      ],
    },
    deleteProjectsByProjectIdStudiesAndStudyId: {
      invalidatesTags: (_result, _error, args) => [
        { type: 'projects', id: args.projectId },
        { type: 'studies', id: 'LIST' },
      ],
    },

    // Invalidate the children count and last update timestamp
    postProjectsByProjectIdStudiesAndStudyIdScenarios: {
      invalidatesTags: ['scenarios', 'studies', 'projects'],
    },
    patchProjectsByProjectIdStudiesAndStudyIdScenariosScenarioId: {
      invalidatesTags: ['scenarios', 'studies', 'projects'],
    },
    deleteProjectsByProjectIdStudiesAndStudyIdScenariosScenarioId: {
      invalidatesTags: ['scenarios', 'studies', 'projects'],
    },
  },
});

export * from './generatedEditoastApi';
export { osrdEditoastApi };
