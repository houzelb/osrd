const LINKED_TRAIN_DETAILS = {
  anterior: {
    trainName: 'Train10',
    trainDate: '17/10/24',
    trainDetails: [
      {
        trainName: 'Train10',
        segments: [
          ['17/10/24', '11:45', 'South_East_station', 'SES'],
          ['17/10/24', '11:59', 'Mid_East_station', 'MES'],
        ],
      },
    ],
    dynamicOriginCi: ' Mid_East_station',
    dynamicOriginCh: '',
    originArrival: 'preciseTime',
    dateOriginArrival: '17/10/24',
    timeOriginArrival: '12:29',
    toleranceOriginArrival: '-30/+30',
    toleranceFields: { min: '-15', max: '+15', isAnterior: true },
  },
  posterior: {
    trainName: 'TrAiN14',
    trainDate: '17/10/24',
    trainDetails: [
      {
        trainName: 'Train14',
        segments: [
          ['17/10/24', '14:10', 'North_East_station', 'NES'],
          ['17/10/24', '14:17', 'Mid_East_station', 'MES'],
        ],
      },
    ],
    dynamicDestinationCi: ' North_East_station',
    dynamicDestinationCh: '',
    destinationArrival: 'preciseTime',
    dateDestinationArrival: '17/10/24',
    timeDestinationArrival: '13:40',
    toleranceDestinationArrival: '-30/+30',
    toleranceFields: { min: '-05', max: '+10', isAnterior: false },
  },
};
export default LINKED_TRAIN_DETAILS;
