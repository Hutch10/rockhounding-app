/**
 * One-shot bounded repeated SGMC shadow campaign.
 *
 * Automated tests do not import this file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { evaluateSourceOperationAuthorization } from './source-operation-authorization';
import {
  sgmcAuthorizationRequest,
  sgmcGovernanceRecord,
  suspendSgmcGovernance,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY,
  USGS_SGMC_REPEATED_SHADOW_READS,
  acceptSgmcRepeatedShadowCampaign,
  assessSgmcRepeatedShadowBody,
} from './usgs-sgmc-repeated-shadow';
import {
  authorizedSgmcGet,
  buildSgmcBoundedQueryUrl,
  createSgmcHttpTransport,
  gateSgmcServiceMetadata,
  type SgmcShadowTransport,
  type SgmcShadowTransportResponse,
} from './usgs-sgmc-shadow-read';

const startReadId: string | undefined = process.argv[2];
const evidenceDir = resolve('qa-artifacts/rockhounding-sgmc-bounded-repeated-shadow-r1');
const rawDir = resolve(evidenceDir, 'raw');
const priorSummaryPath = resolve(
  'qa-artifacts/rockhounding-first-provider-shadow-read-r1/campaign-summary.json'
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function offSwitch(transport: SgmcShadowTransport): Promise<string> {
  const blocked = await authorizedSgmcGet({
    url: 'https://services.example.test/sgmc-off-switch',
    transport,
    authorization: sgmcAuthorizationRequest({
      governanceStatus: suspendSgmcGovernance(sgmcGovernanceRecord()).status,
    }),
  });
  return blocked.blocked ? blocked.failure : 'TRANSPORT_RAN';
}

const accepted = acceptSgmcRepeatedShadowCampaign({
  queryCount: USGS_SGMC_REPEATED_SHADOW_READS.length,
  parallelism: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.parallelism,
  automaticRetry: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.automaticRetry,
  automaticPagination: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.automaticPagination,
  backgroundPolling: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.backgroundPolling,
  publicMaterialization: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.publicMaterialization,
  envelopes: USGS_SGMC_REPEATED_SHADOW_READS.map((read) => ({
    bbox: read.bbox,
    resultRecordCount: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.maxFeatures,
  })),
});
if (accepted.status !== 'ALLOWED') {
  throw new Error(`Campaign policy blocked: ${accepted.reasons.join(',')}`);
}

const throwingTransport: SgmcShadowTransport = {
  get() {
    return Promise.reject(new Error('off-switch transport must not run'));
  },
};
const offSwitchBefore = await offSwitch(throwingTransport);
if (offSwitchBefore !== 'AUTHORIZATION_BLOCKED') {
  throw new Error(`Off-switch failed before the campaign: ${offSwitchBefore}`);
}

const prior = JSON.parse(readFileSync(priorSummaryPath, 'utf8')) as { featureServerUrl?: string };
const featureServerUrl = prior.featureServerUrl;
if (featureServerUrl === undefined) {
  throw new Error('Certified shadow summary did not record a feature service URL');
}

const transport = createSgmcHttpTransport();

async function gatedGet(
  url: string,
  purpose: string,
  timeoutMs: number
): Promise<
  | { blocked: true; failure: string; authorizationStatus: string; detail?: string }
  | {
      blocked: false;
      response: SgmcShadowTransportResponse;
      authorizationStatus: string;
    }
> {
  const authorization = evaluateSourceOperationAuthorization(sgmcAuthorizationRequest());
  if (authorization.status !== 'ALLOWED_WITH_CONSTRAINTS') {
    return {
      blocked: true as const,
      failure: 'AUTHORIZATION_BLOCKED',
      authorizationStatus: authorization.status,
    };
  }
  const response = await authorizedSgmcGet({
    url,
    transport,
    authorization: sgmcAuthorizationRequest(),
    timeoutMs,
  });
  networkRequests.push({
    purpose,
    at: new Date().toISOString(),
    ...(response.blocked ? { failure: response.failure } : { status: response.response.status }),
  });
  return { ...response, authorizationStatus: authorization.status };
}

const resumePath = resolve(evidenceDir, 'campaign-summary.json');
const plannedReads =
  startReadId === undefined
    ? [...USGS_SGMC_REPEATED_SHADOW_READS]
    : USGS_SGMC_REPEATED_SHADOW_READS.slice(
        USGS_SGMC_REPEATED_SHADOW_READS.findIndex((read) => read.readId === startReadId)
      );
const existing =
  startReadId === undefined
    ? undefined
    : (JSON.parse(readFileSync(resumePath, 'utf8')) as {
        gate: { ok: boolean; failure?: string; maxRecordCount?: number };
        networkRequests: Array<{ purpose: string; status?: number; failure?: string; at: string }>;
        reads: unknown[];
      });

let gate: { ok: boolean; failure?: string; maxRecordCount?: number };
const networkRequests: Array<{ purpose: string; status?: number; failure?: string; at: string }> =
  existing === undefined ? [] : existing.networkRequests;
if (existing === undefined) {
  const serviceUrl = `${featureServerUrl}?f=pjson`;
  const layerUrl = `${featureServerUrl.replace(/\/$/, '')}/3?f=pjson`;
  const service = await gatedGet(serviceUrl, 'FEATURE_SERVER_METADATA', 20000);
  if (service.blocked) throw new Error(`Service metadata blocked: ${service.failure}`);
  const layer = await gatedGet(layerUrl, 'LAYER_METADATA', 20000);
  if (layer.blocked) throw new Error(`Layer metadata blocked: ${layer.failure}`);
  gate = gateSgmcServiceMetadata({
    featureServerUrl,
    service: JSON.parse(new TextDecoder().decode(service.response.body)) as unknown,
    layer: JSON.parse(new TextDecoder().decode(layer.response.body)) as unknown,
  });
} else {
  gate = existing.gate;
}

mkdirSync(rawDir, { recursive: true });
const reads: Array<Record<string, unknown>> =
  existing === undefined ? [] : (existing.reads as Array<Record<string, unknown>>);
for (const priorRead of reads) {
  const readId = typeof priorRead['readId'] === 'string' ? priorRead['readId'] : '';
  const httpStatus =
    typeof priorRead['httpStatus'] === 'number' ? priorRead['httpStatus'] : undefined;
  const responsePath = resolve(rawDir, `${readId.toLowerCase()}-response.json`);
  if (readId === '' || httpStatus === undefined || !existsSync(responsePath)) continue;
  const body = new Uint8Array(readFileSync(responsePath));
  const retrievedAt =
    typeof priorRead['responseReceivedAt'] === 'string'
      ? priorRead['responseReceivedAt']
      : new Date().toISOString();
  const assessment = await assessSgmcRepeatedShadowBody(body, retrievedAt, httpStatus);
  const { localDetail, ...publicAssessment } = assessment;
  void localDetail;
  Object.assign(priorRead, publicAssessment);
}
let stoppedEarly: string | undefined;

if (!gate.ok) {
  stoppedEarly = gate.failure;
} else {
  for (const [index, read] of plannedReads.entries()) {
    if (index > 0 || existing !== undefined)
      await sleep(USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.pauseMs);
    const requestStartedAt = new Date().toISOString();
    const response = await gatedGet(
      buildSgmcBoundedQueryUrl(featureServerUrl, read.bbox),
      read.readId,
      USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY.requestTimeoutMs
    );
    const responseReceivedAt = new Date().toISOString();
    if (response.blocked) {
      reads.push({
        readId: read.readId,
        purpose: read.purpose,
        placeLabel: read.placeLabel,
        bbox: read.bbox,
        authorizationStatus: response.authorizationStatus,
        requestStartedAt,
        responseReceivedAt,
        failure: response.failure,
      });
      if (response.failure === 'RATE_LIMITED' || response.failure === 'AUTHORIZATION_BLOCKED') {
        stoppedEarly = response.failure;
        break;
      }
      continue;
    }
    const assessment = await assessSgmcRepeatedShadowBody(
      response.response.body,
      responseReceivedAt,
      response.response.status
    );
    writeFileSync(
      resolve(rawDir, `${read.readId.toLowerCase()}-response.json`),
      response.response.body
    );
    writeFileSync(
      resolve(rawDir, `${read.readId.toLowerCase()}-observations.json`),
      JSON.stringify(assessment.localDetail, null, 2)
    );
    const { localDetail, ...publicAssessment } = assessment;
    void localDetail;
    reads.push({
      readId: read.readId,
      purpose: read.purpose,
      placeLabel: read.placeLabel,
      bbox: read.bbox,
      authorizationStatus: response.authorizationStatus,
      requestStartedAt,
      responseReceivedAt,
      httpStatus: response.response.status,
      contentType: response.response.contentType,
      rateLimitHeaders: response.response.headers,
      ...publicAssessment,
    });
    const transportFailure =
      assessment.failure === 'HTTP_ERROR' ||
      assessment.failure === 'TIMEOUT' ||
      assessment.failure === 'NETWORK_ERROR' ||
      assessment.failure === 'PROVIDER_ERROR' ||
      assessment.failure === 'INVALID_RESPONSE' ||
      assessment.failure === 'EMPTY_RESPONSE';
    if (
      !transportFailure &&
      (assessment.materialDrift ||
        !assessment.replayMatches ||
        assessment.failure === 'SCHEMA_DRIFT' ||
        assessment.failure === 'SOURCE_IDENTITY_DRIFT' ||
        assessment.failure === 'UNSUPPORTED_SOURCE_VERSION' ||
        assessment.failure === 'RATE_LIMITED')
    ) {
      stoppedEarly = assessment.materialDrift
        ? 'SCHEMA_DRIFT'
        : !assessment.replayMatches
          ? 'REPLAY_MISMATCH'
          : assessment.failure;
      break;
    }
  }
}

const offSwitchAfter = await offSwitch(throwingTransport);
const summary = {
  policy: USGS_SGMC_REPEATED_SHADOW_CAMPAIGN_POLICY,
  featureServerUrl,
  offSwitchBefore,
  offSwitchAfter,
  gate,
  networkRequests,
  stoppedEarly: stoppedEarly ?? null,
  reads,
};
writeFileSync(resolve(evidenceDir, 'campaign-summary.json'), JSON.stringify(summary, null, 2));
if (stoppedEarly !== undefined && !gate.ok) {
  throw new Error(`Campaign stopped: ${stoppedEarly}`);
}
