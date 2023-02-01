import drawArea from 'applications/operationalStudies/components/SimulationResults/ChartHelpers/drawArea';
import drawCurve from 'applications/operationalStudies/components/SimulationResults/ChartHelpers/drawCurve';
import defineChart from 'applications/operationalStudies/components/SimulationResults/ChartHelpers/defineChart';
import { defineLinear } from 'applications/operationalStudies/components/SimulationResults/ChartHelpers/ChartHelpers';
import * as d3 from 'd3';
import drawElectricalProfileRect from '../ChartHelpers/drawElectricalProfileRect';

function createChart(
  CHART_ID,
  chart,
  resetChart,
  dataSimulation,
  rotate,
  keyValues,
  heightOfSpeedSpaceChart,
  ref,
  _dispatch,
  setResetChart
) {
  d3.select(`#${CHART_ID}`).remove();
  const defineX =
    chart === undefined || resetChart
      ? defineLinear(
          d3.max(Object.values(dataSimulation), (data) =>
            d3.max(data, (d) => d[rotate ? keyValues[1] : keyValues[0]] + 100)
          )
        )
      : chart.x;
  const defineY =
    chart === undefined || resetChart
      ? defineLinear(
          d3.max(Object.values(dataSimulation), (data) =>
            d3.max(data, (d) => d[rotate ? keyValues[0] : keyValues[1]] + 50)
          )
        )
      : chart.y;

  const width =
    d3.select(`#container-${CHART_ID}`) !== null
      ? parseInt(d3.select(`#container-${CHART_ID}`)?.style('width'), 10)
      : 250;

  setResetChart(false);
  return defineChart(
    width,
    heightOfSpeedSpaceChart,
    defineX,
    defineY,
    ref,
    rotate,
    keyValues,
    CHART_ID
  );
}

function drawAxisTitle(chart, rotate) {
  chart.drawZone
    .append('text')
    .attr('class', 'axis-unit')
    .attr('text-anchor', 'end')
    .attr('transform', rotate ? 'rotate(0)' : 'rotate(-90)')
    .attr('x', rotate ? chart.width - 10 : -10)
    .attr('y', rotate ? chart.height - 10 : 20)
    .text('KM/H');

  chart.drawZone
    .append('text')
    .attr('class', 'axis-unit')
    .attr('text-anchor', 'end')
    .attr('transform', rotate ? 'rotate(-90)' : 'rotate(0)')
    .attr('x', rotate ? -10 : chart.width - 10)
    .attr('y', rotate ? 20 : chart.height - 10)
    .text('M');
}

function drawTrain(
  LIST_VALUES_NAME_SPEED_SPACE,
  simulation,
  selectedTrain,

  dataSimulation,
  keyValues,
  positionValues,
  rotate,
  speedSpaceSettings,
  mustRedraw,
  setChart,
  setYPosition,
  setZoomLevel,
  yPosition,
  dispatch,
  zoomLevel,
  CHART_ID,
  chart,
  resetChart,
  heightOfSpeedSpaceChart,
  ref,
  setResetChart,
  force = false
) {
  if (chart && (mustRedraw || force)) {
    const chartLocal = chart;
    chartLocal.drawZone.select('g').remove();
    /*
      chartLocal.drawZone.append('g').attr('id', 'speedSpaceChart').attr('class', 'chartTrain');
      drawAxisTitle(chartLocal, rotate);
      */
    chartLocal.drawZone.append('g').attr('id', 'speedSpaceChart').attr('class', 'chartTrain');
    drawAxisTitle(chartLocal, rotate);

    drawArea(
      chartLocal,
      'area speed',
      dataSimulation.areaBlock,
      'speedSpaceChart',
      'curveLinear',
      keyValues,
      rotate
    );

    drawCurve(
      chartLocal,
      'speed',
      dataSimulation.speed,
      'speedSpaceChart',
      'curveLinear',
      keyValues,
      'speed',
      rotate
    );
    if (dataSimulation.margins_speed) {
      drawCurve(
        chartLocal,
        'speed margins',
        dataSimulation.margins_speed,
        'speedSpaceChart',
        'curveLinear',
        keyValues,
        'margins_speed',
        rotate
      );
    }
    if (dataSimulation.eco_speed) {
      drawCurve(
        chartLocal,
        'speed eco',
        dataSimulation.eco_speed,
        'speedSpaceChart',
        'curveLinear',
        keyValues,
        'eco_speed',
        rotate
      );
    }
    if (dataSimulation.vmax && speedSpaceSettings.maxSpeed) {
      drawCurve(
        chartLocal,
        'speed vmax',
        dataSimulation.vmax,
        'speedSpaceChart',
        'curveLinear',
        keyValues,
        'vmax',
        rotate
      );
    }
    if (dataSimulation.slopesCurve && speedSpaceSettings.altitude) {
      drawCurve(
        chartLocal,
        'speed slopes',
        dataSimulation.slopesCurve,
        'speedSpaceChart',
        'curveLinear',
        ['position', 'height'],
        'slopes',
        rotate
      );
    }
    if (dataSimulation.slopesHistogram && speedSpaceSettings.slopes) {
      drawCurve(
        chartLocal,
        'speed slopesHistogram',
        dataSimulation.slopesHistogram,
        'speedSpaceChart',
        'curveMonotoneX',
        ['position', 'gradient'],
        'slopesHistogram',
        rotate
      );
      drawArea(
        chartLocal,
        'area slopes',
        dataSimulation.areaSlopesHistogram,
        'speedSpaceChart',
        'curveMonotoneX',
        ['position', 'gradient'],
        rotate
      );
    }
    if (dataSimulation.curvesHistogram && speedSpaceSettings.curves) {
      drawCurve(
        chartLocal,
        'speed curvesHistogram',
        dataSimulation.curvesHistogram,
        'speedSpaceChart',
        'curveLinear',
        ['position', 'radius'],
        'curvesHistogram',
        rotate
      );
    }
    if (dataSimulation.modesAndProfiles) {
      const isSelected = true;

      dataSimulation.modesAndProfiles.forEach((source, index) => {
        const segment = {};

        segment.position_start = source.start;
        segment.position_end = source.stop;
        segment.position_middle = (source.start + source.stop) / 2;
        segment.height_start = 7;
        segment.height_end = 16;
        segment.height_middle = 2;
        segment.usedMode = source.used_mode;
        segment.usedProfile = source.used_profile;

        const electricalProfileColorsWithProfile = {
          25000: { 25000: '#6E1E78', 22500: '#A453AD', 20000: '#DD87E5' },
          1500: {
            O: '#FF0037',
            A: '#FF335F',
            A1: '#FF335F',
            B: '#FF6687',
            B1: '#FF6687',
            C: '#FF99AF',
            D: '#FF99AF',
            E: '#FFCCD7',
            F: '#FFCCD7',
            G: '#FFF',
          },
          heat: '#333',
          15000: '#009AA6',
          3000: '#1FBE00',
        };

        const electricalProfileColorsWithoutProfile = {
          25000: '#6E1E78',
          1500: '#FF0037',
          heat: '#333',
          15000: '#009AA6',
          3000: '#1FBE00',
        };

        segment.color =
          electricalProfileColorsWithProfile[segment.usedMode][segment.usedProfile] ||
          electricalProfileColorsWithoutProfile[segment.usedMode];

        segment.textColor = electricalProfileColorsWithoutProfile[segment.usedMode];

        if (!segment.usedProfile) {
          segment.text = `${segment.usedMode}V`;
        } else if (segment.usedMode === '25000') {
          segment.text = `${segment.usedProfile}V`;
        } else {
          segment.text = `${segment.usedMode}V ${segment.usedProfile}`;
        }

        drawElectricalProfileRect(
          chartLocal,
          `electricalProfiles_${index}`,
          segment,
          'speedSpaceChart',
          `curveLinear`,
          ['position', 'height'],
          'electrical_profiles',
          rotate,
          isSelected,
          `electricalProfiles_${index}`
        );
      });
    }
    // Operational points
    /*
    drawOPs(simulation, selectedTrain, rotate, chartLocal);

    enableInteractivity(
      chartLocal,
      dataSimulation,
      dispatch,
      keyValues,
      LIST_VALUES_NAME_SPEED_SPACE,
      positionValues,
      rotate,
      setChart,
      setYPosition,
      setZoomLevel,
      yPosition,
      zoomLevel
    );

    setChart(chartLocal);
    dispatch(updateMustRedraw(false));
    */
  }
}

export { drawTrain, createChart };
