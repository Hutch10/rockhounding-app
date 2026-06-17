/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unnecessary-condition */
import { SyncBatchRequestSchema, type SyncBatchResponse } from '@rockhounding/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import { emitSyncProvenanceEvent } from '@/lib/provenance/emitters';

export function toGeographyWkt(lat: number, lon: number): string {
  return `SRID=4326;POINT(${lon} ${lat})`;
}

export interface FindCreatePayload {
  material_name: string;
  notes?: string | null;
  discovered_at?: string;
  location: { lat: number; lon: number };
}

async function resolveExistingFindId(
  supabase: SupabaseClient,
  clientOperationId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('finds')
    .select('id')
    .eq('client_operation_id', clientOperationId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.id ?? null;
}

async function processFindCreate(
  supabase: SupabaseClient,
  userId: string,
  clientOperationId: string,
  payload: FindCreatePayload,
  idempotencyKey: string
): Promise<string> {
  const lat = payload.location.lat;
  const lon = payload.location.lon;

  const { data: find, error: findErr } = await supabase
    .from('finds')
    .insert({
      user_id: userId,
      material_name: payload.material_name,
      notes: payload.notes ?? null,
      discovered_at: payload.discovered_at ?? new Date().toISOString(),
      exact_location: toGeographyWkt(lat, lon),
      client_operation_id: clientOperationId,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (findErr) {
    if (findErr.code === '23505') {
      const existingId = await resolveExistingFindId(supabase, clientOperationId, userId);
      if (existingId) return existingId;
    }
    throw findErr;
  }

  return find.id;
}

export async function processSyncBatch(
  supabase: SupabaseClient,
  userId: string,
  body: unknown
): Promise<SyncBatchResponse> {
  const batch = SyncBatchRequestSchema.parse(body);
  const results: SyncBatchResponse['results'] = [];

  for (const op of batch.operations ?? []) {
    const clientOperationId = op.client_operation_id;
    const entityType = op.entity_type;
    const operationType = op.operation_type;

    const existingFindId = await resolveExistingFindId(supabase, clientOperationId, userId);
    if (existingFindId) {
      results.push({
        client_operation_id: clientOperationId,
        server_id: existingFindId,
        status: 'applied',
        error: null,
      });
      continue;
    }

    const { data: existingOp } = await supabase
      .from('sync_operations')
      .select('status, payload')
      .eq('client_operation_id', clientOperationId)
      .maybeSingle();

    if (existingOp?.status === 'applied') {
      const serverId =
        (existingOp.payload as { _server_entity_id?: string } | null)?._server_entity_id ??
        (await resolveExistingFindId(supabase, clientOperationId, userId));

      results.push({
        client_operation_id: clientOperationId,
        server_id: serverId,
        status: 'applied',
        error: null,
      });
      continue;
    }

    try {
      let serverId: string | null = null;

      if (entityType === 'find' && operationType === 'create') {
        serverId = await processFindCreate(
          supabase,
          userId,
          clientOperationId,
          op.payload as FindCreatePayload,
          batch.idempotency_key
        );
      } else {
        throw new Error(`Unsupported operation: ${entityType}/${operationType}`);
      }

      await supabase.from('sync_operations').upsert(
        {
          client_operation_id: clientOperationId,
          user_id: userId,
          entity_type: entityType,
          operation_type: operationType,
          status: 'applied',
          payload: { ...(op.payload as object), _server_entity_id: serverId },
          processed_at: new Date().toISOString(),
        },
        { onConflict: 'client_operation_id' }
      );

      results.push({
        client_operation_id: clientOperationId,
        server_id: serverId,
        status: 'applied',
        error: null,
      });

      await emitSyncProvenanceEvent({
        supabase,
        userId,
        entityType,
        entityId: serverId ?? clientOperationId,
        operationType,
        clientOperationId,
        serverId,
        status: 'applied',
        payload: op.payload as Record<string, unknown>,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      console.error(`[Sync] Op ${clientOperationId} failed:`, err);

      await supabase.from('sync_operations').upsert(
        {
          client_operation_id: clientOperationId,
          user_id: userId,
          entity_type: entityType,
          operation_type: operationType,
          status: 'failed',
          payload: op.payload,
          error_details: message,
          processed_at: new Date().toISOString(),
        },
        { onConflict: 'client_operation_id' }
      );

      results.push({
        client_operation_id: clientOperationId,
        server_id: null,
        status: 'failed',
        error: message,
      });

      await emitSyncProvenanceEvent({
        supabase,
        userId,
        entityType,
        entityId: clientOperationId,
        operationType,
        clientOperationId,
        serverId: null,
        status: 'failed',
        payload: op.payload as Record<string, unknown>,
      });
    }
  }

  return { results };
}
