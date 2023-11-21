import { MAP_URL } from 'common/Map/const';
import { ViewState } from 'react-map-gl/maplibre';
import { Position } from '@turf/helpers';
import { gpsRound } from 'utils/helpers';
import { createSlice, Dispatch, PayloadAction } from '@reduxjs/toolkit';
import history from 'main/history';
import { InfraErrorType } from 'applications/editor/components/InfraErrors/types';

export type Viewport = ViewState & {
  width: number;
  height: number;
};

export interface MapSearchMarker {
  title: string;
  subtitle?: string;
  lonlat: Position;
}
export interface MapState {
  url: typeof MAP_URL;
  mapStyle: 'normal' | 'dark' | 'blueprint';
  showIGNBDORTHO: boolean;
  showIGNSCAN25: boolean;
  showIGNCadastre: boolean;
  showOSM: boolean;
  showOSMtracksections: boolean;
  terrain3DExaggeration: number;
  viewport: Viewport;
  featureInfoClickID?: number;
  layersSettings: {
    bufferstops: boolean;
    catenaries: boolean;
    neutral_sections: boolean;
    detectors: boolean;
    operationalpoints: boolean;
    routes: boolean;
    signals: boolean;
    signalingtype: boolean;
    sncf_psl: boolean;
    speedlimittag?: string;
    speedlimits: boolean;
    switches: boolean;
    tvds: boolean;
  };
  issuesSettings?: {
    types: Array<InfraErrorType>;
  };
  mapSearchMarker?: MapSearchMarker;
  lineSearchCode?: number;
}

export const mapInitialState: MapState = {
  url: MAP_URL,
  mapStyle: 'normal',
  showIGNBDORTHO: false,
  showIGNSCAN25: false,
  showIGNCadastre: false,
  showOSM: true,
  showOSMtracksections: false,
  terrain3DExaggeration: 0,
  viewport: {
    latitude: 48.32,
    longitude: 2.44,
    zoom: 6.2,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, left: 0, bottom: 0, right: 0 },
    width: 0,
    height: 0,
  },
  featureInfoClickID: undefined,
  layersSettings: {
    bufferstops: false,
    catenaries: false,
    neutral_sections: false,
    detectors: false,
    operationalpoints: false,
    routes: false,
    signals: false,
    signalingtype: true,
    sncf_psl: false,
    speedlimits: false,
    switches: false,
    tvds: false,
  },
  mapSearchMarker: undefined,
  lineSearchCode: undefined,
};

const mapSlice = createSlice({
  name: 'map',
  initialState: mapInitialState,
  reducers: {
    updateViewportAction: (state, action: PayloadAction<Partial<Viewport>>) => {
      state.viewport = { ...state.viewport, ...action.payload };
    },
    updateMapStyle: (state, action: PayloadAction<MapState['mapStyle']>) => {
      state.mapStyle = action.payload;
    },
    updateMapSearchMarker: (state, action: PayloadAction<MapState['mapSearchMarker']>) => {
      state.mapSearchMarker = action.payload;
    },
    updateLineSearchCode: (state, action: PayloadAction<MapState['lineSearchCode']>) => {
      state.lineSearchCode = action.payload;
    },
    updateShowIGNBDORTHO: (state, action: PayloadAction<MapState['showIGNBDORTHO']>) => {
      state.showIGNBDORTHO = action.payload;
    },
    updateShowIGNSCAN25: (state, action: PayloadAction<MapState['showIGNSCAN25']>) => {
      state.showIGNSCAN25 = action.payload;
    },
    updateShowIGNCadastre: (state, action: PayloadAction<MapState['showIGNCadastre']>) => {
      state.showIGNCadastre = action.payload;
    },
    updateShowOSM: (state, action: PayloadAction<MapState['showOSM']>) => {
      state.showOSM = action.payload;
    },
    updateShowOSMtracksections: (
      state,
      action: PayloadAction<MapState['showOSMtracksections']>
    ) => {
      state.showOSMtracksections = action.payload;
    },
    updateFeatureInfoClick: (state, action: PayloadAction<MapState['featureInfoClickID']>) => {
      state.featureInfoClickID = action.payload;
    },
    updateLayersSettings: (state, action: PayloadAction<MapState['layersSettings']>) => {
      state.layersSettings = action.payload;
    },
    updateIssuesSettings: (state, action: PayloadAction<MapState['issuesSettings']>) => {
      state.issuesSettings = action.payload;
    },
    updateTerrain3DExaggeration: (
      state,
      action: PayloadAction<MapState['terrain3DExaggeration']>
    ) => {
      state.terrain3DExaggeration = action.payload;
    },
  },
});

// TODO Need this with routing ?
// Functions
export function updateViewport(
  viewport: Partial<Viewport>,
  baseUrl?: string,
  updateRouter = false
) {
  return (dispatch: Dispatch, getState: () => { map: MapState }) => {
    dispatch(mapSlice.actions.updateViewportAction(viewport));
    if (baseUrl !== undefined && updateRouter) {
      const { map } = getState();
      const latitude = gpsRound(viewport.latitude || map.viewport.latitude);
      const longitude = gpsRound(viewport.longitude || map.viewport.longitude);
      const zoom = gpsRound(viewport.zoom || map.viewport.zoom);
      const bearing = gpsRound(viewport.bearing || map.viewport.bearing);
      const pitch = gpsRound(viewport.pitch || map.viewport.pitch);

      history.push(`${baseUrl}/${latitude}/${longitude}/${zoom}/${bearing}/${pitch}`);
    }
  };
}

export const mapSliceActions = mapSlice.actions;

export const {
  updateFeatureInfoClick,
  updateLayersSettings,
  updateLineSearchCode,
  updateMapSearchMarker,
  updateMapStyle,
  updateShowIGNBDORTHO,
  updateShowIGNCadastre,
  updateShowIGNSCAN25,
  updateShowOSM,
  updateShowOSMtracksections,
  updateTerrain3DExaggeration,
  updateViewportAction,
  updateIssuesSettings,
} = mapSliceActions;

export default mapSlice.reducer;
