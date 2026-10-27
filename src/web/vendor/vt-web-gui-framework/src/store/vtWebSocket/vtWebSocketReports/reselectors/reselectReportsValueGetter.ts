import { createSelector } from '@reduxjs/toolkit';

import type { VtWebSocketReportsState } from '../vtWebSocketReports.types';


export const reselectReportsValueGetter = createSelector(
  (state: VtWebSocketReportsState, webSocket: string) => state.byId[webSocket]?.bySource,
  (bySource) => (source: string, fieldName: string) => {
    const sourceData = bySource?.[source];

    if (!sourceData) {
      return null;
    }

    switch (fieldName) {
      case 'sourceHandler': return sourceData.sourceHandler;
      case 'isPushing': return sourceData.isPushing;
      case 'numRequestsSet': return sourceData.numRequests.set;
      case 'numRequestsQuery': return sourceData.numRequests.query;
      case 'numRequestsUpdate': return sourceData.numRequests.update;
      case 'numResponses': return sourceData.numResponses.info + sourceData.numResponses.update;
      case 'numResponsesInfo': return sourceData.numResponses.info;
      case 'numResponsesUpdate': return sourceData.numResponses.update;
      case 'lastQuery': return sourceData.lastQuery;
      case 'responseTimeMs': return sourceData.responseTimeMs;
      default: return null;
    }
  },
);
