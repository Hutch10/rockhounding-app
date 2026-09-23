/**
 * One-shot SGMC shadow campaign.
 *
 * Run only from the shadow-read phase. Automated tests do not import this file.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { evaluateSourceOperationAuthorization } from './source-operation-authorization';
import {
  sgmcAuthorizationRequest,
  sgmcGovernanceRecord,
  suspendSgmcGovernance,
} from './usgs-sgmc-provider';
import {
  USGS_SGMC_SCIENCEBASE_ITEM_URL,
  USGS_SGMC_SHADOW_BBOX,
  USGS_SGMC_SHADOW_OUT_FIELDS,
  authorizedSgmcGet,
  buildSgmcShadowQueryUrl,
  createSgmcHttpTransport,
  gateSgmcServiceMetadata,
  interpretSgmcShadowResponse,
  resolveSgmcFeatureServerUrl,
  shadowMaterializationAllowed,
} from './usgs-sgmc-shadow-read';

const catalogPath = process.argv[2];
if (catalogPath === undefined) {
  throw new Error('Pass the saved ScienceBase catalog JSON path');
}

const evidenceDir = resolve('qa-artifacts/rockhounding-first-provider-shadow-read-r1');
const transport = createSgmcHttpTransport();
const authorization = evaluateSourceOperationAuthorization(sgmcAuthorizationRequest());
if (authorization.status !== 'ALLOWED' && authorization.status !== 'ALLOWED_WITH_CONSTRAINTS') {
  throw new Error('Shadow campaign blocked before network execution');
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as unknown;
const featureServerUrl = resolveSgmcFeatureServerUrl(catalog);
if (featureServerUrl === undefined) {
  throw new Error('ScienceBase item did not resolve the pinned SGMC feature service');
}

const serviceUrl = `${featureServerUrl}?f=pjson`;
const layerUrl = `${featureServerUrl.replace(/\/$/, '')}/3?f=pjson`;
const service = await authorizedSgmcGet({ url: serviceUrl, transport });
if (service.blocked) throw new Error(`Service metadata blocked: ${service.failure}`);
const layer = await authorizedSgmcGet({ url: layerUrl, transport });
if (layer.blocked) throw new Error(`Layer metadata blocked: ${layer.failure}`);
const serviceJson = JSON.parse(new TextDecoder().decode(service.response.body)) as unknown;
const layerJson = JSON.parse(new TextDecoder().decode(layer.response.body)) as unknown;
const gate = gateSgmcServiceMetadata({
  featureServerUrl,
  service: serviceJson,
  layer: layerJson,
});

const requests = [
  {
    purpose: 'SCIENCEBASE_ITEM_METADATA',
    url: USGS_SGMC_SCIENCEBASE_ITEM_URL,
    executedBeforeCampaign: true,
  },
  { purpose: 'FEATURE_SERVER_METADATA', url: serviceUrl, status: service.response.status },
  { purpose: 'LAYER_METADATA', url: layerUrl, status: layer.response.status },
];

if (!gate.ok) {
  writeSummary({
    authorizationStatus: authorization.status,
    featureServerUrl,
    gate,
    requests,
    featureQuery: null,
  });
  throw new Error(`Service identity gate failed: ${gate.failure}`);
}

const queryUrl = buildSgmcShadowQueryUrl(featureServerUrl);
const query = await authorizedSgmcGet({ url: queryUrl, transport, timeoutMs: 60000 });
if (query.blocked) {
  writeSummary({
    authorizationStatus: authorization.status,
    featureServerUrl,
    gate,
    requests: [
      ...requests,
      {
        purpose: 'BOUNDED_FEATURE_QUERY',
        url: queryUrl,
        failure: query.failure,
        detail: query.detail,
      },
    ],
    featureQuery: null,
    priorAttempt:
      'Feature query timed out at 20000ms before this 60000ms retry. Metadata was read again for this attempt.',
  });
  throw new Error(`Feature query blocked: ${query.failure}`);
}
const retrievedAt = new Date().toISOString();
const interpretation = await interpretSgmcShadowResponse({
  rawBody: query.response.body,
  httpStatus: query.response.status,
  contentType: query.response.contentType,
  retrievedAt,
  semanticHeaders: query.response.headers,
  maxRecordCount: gate.maxRecordCount,
});

const rawDir = resolve(evidenceDir, '04-raw-response');
mkdirSync(rawDir, { recursive: true });
writeFileSync(resolve(rawDir, 'response.json'), query.response.body);
writeFileSync(resolve(rawDir, 'service.json'), service.response.body);
writeFileSync(resolve(rawDir, 'layer.json'), layer.response.body);

const offSwitch = await authorizedSgmcGet({
  url: queryUrl,
  transport: {
    get() {
      throw new Error('off-switch allowed a second provider request');
    },
  },
  authorization: sgmcAuthorizationRequest({
    governanceStatus: suspendSgmcGovernance(sgmcGovernanceRecord()).status,
  }),
});
if (!offSwitch.blocked) {
  throw new Error('Suspended governance did not block the prospective second request');
}

const materialization =
  interpretation.disclosure === undefined
    ? 'NOT_MATERIALIZED'
    : shadowMaterializationAllowed(interpretation.disclosure)
      ? 'QA_SCOPE_ONLY'
      : 'WITHHELD';

writeSummary({
  authorizationStatus: authorization.status,
  featureServerUrl,
  gate,
  requests: [
    ...requests,
    { purpose: 'BOUNDED_FEATURE_QUERY', url: queryUrl, status: query.response.status },
  ],
  featureQuery: {
    bbox: USGS_SGMC_SHADOW_BBOX,
    outFields: USGS_SGMC_SHADOW_OUT_FIELDS,
    httpStatus: query.response.status,
    contentType: query.response.contentType,
    featureCount: interpretation.featureCount,
    pagination: interpretation.pagination,
    geologicalAbsence: interpretation.geologicalAbsence,
    contentHash: interpretation.contentHash,
    retrievedAt: interpretation.retrievedAt,
    comparison: interpretation.comparison,
    materialDrift: interpretation.materialDrift,
    failure: interpretation.failure ?? null,
    adapterStatus: interpretation.result?.status ?? null,
    adapterFailure: interpretation.result?.failureCode ?? null,
    admissionStatus: interpretation.admissionStatus ?? null,
    disclosureStatus: interpretation.disclosure?.decision.status ?? null,
    materialization,
    provenanceTypes:
      interpretation.provenanceGraph?.activities.map((activity) => activity.activityType) ?? [],
    rateLimitHeaders: interpretation.rateLimitHeaders,
    confirmedAbsence: interpretation.result?.confirmedAbsence ?? false,
    offSwitch: offSwitch.failure,
  },
});

function writeSummary(value: unknown): void {
  const path = resolve(evidenceDir, 'campaign-summary.json');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
