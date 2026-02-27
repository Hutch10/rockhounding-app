/**
 * Sync Batch API Endpoint
 * 
 * Handles batch sync operations from client
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SyncBatchSchema, SyncEntityType, BaseSyncOperation } from '@rockhounding/shared';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse and validate batch
    const body = await request.json();
    const validation = SyncBatchSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid batch format',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const batch = validation.data;

    // Verify user owns this batch
    if (batch.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Process each operation
    const results: any[] = [];
    for (const operation of batch.operations) {
      try {
        const result = await processOperation(supabase, user.id, operation);
        results.push(result);
      } catch (error) {
        console.error('[Sync] Operation failed:', operation.sync_id, error);
        results.push({
          sync_id: operation.sync_id,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_code: 'OPERATION_FAILED',
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      batch_id: batch.batch_id,
      results,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync] Batch processing failed:', error);
    return NextResponse.json(
      { 
        error: 'Batch processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'sync-engine',
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// Operation Processing
// ============================================================================

async function processOperation(
  supabase: any,
  userId: string,
  operation: BaseSyncOperation
) {
  // Check idempotency
  const idempotencyKey = generateIdempotencyKey(operation);
  const { data: existing } = await supabase
    .from('sync_idempotency_keys')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existing) {
    console.log('[Sync] Duplicate operation detected:', operation.sync_id);
    return {
      sync_id: operation.sync_id,
      status: 'success',
      note: 'Duplicate operation (idempotent)',
    };
  }

  // Get table name
  const table = getTableName(operation.entity_type);
  
  // Process based on operation type
  let result;
  
  switch (operation.operation_type) {
    case 'create':
      result = await handleCreate(supabase, table, operation);
      break;
    case 'update':
      result = await handleUpdate(supabase, table, operation);
      break;
    case 'delete':
      result = await handleDelete(supabase, table, operation);
      break;
    case 'soft_delete':
      result = await handleSoftDelete(supabase, table, operation);
      break;
    default:
      throw new Error(`Unknown operation type: ${operation.operation_type}`);
  }

  // Store idempotency key
  if (result.status === 'success') {
    await supabase.from('sync_idempotency_keys').insert({
      idempotency_key: idempotencyKey,
      sync_id: operation.sync_id,
      user_id: userId,
      result_status: 'success',
    });
  }

  return result;
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleCreate(
  supabase: any,
  table: string,
  operation: BaseSyncOperation
) {
  if (!operation.full_entity) {
    throw new Error('full_entity required for create operation');
  }

  // Insert new entity
  const { data, error } = await supabase
    .from(table)
    .insert({
      ...operation.full_entity,
      version: 1,
      created_at: operation.created_at,
      updated_at: operation.updated_at,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      // Entity already exists, treat as success
      return {
        sync_id: operation.sync_id,
        status: 'success',
        server_version: operation.client_version,
        note: 'Entity already exists',
      };
    }
    throw error;
  }

  return {
    sync_id: operation.sync_id,
    status: 'success',
    server_version: data.version,
  };
}

async function handleUpdate(
  supabase: any,
  table: string,
  operation: BaseSyncOperation
) {
  // Get current server version
  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', operation.entity_id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      // Entity not found
      throw new Error('Entity not found');
    }
    throw fetchError;
  }

  // Check for version conflict
  if (existing.version !== operation.client_version) {
    // Conflict detected
    const conflictId = await createConflict(supabase, operation, existing);
    
    return {
      sync_id: operation.sync_id,
      status: 'conflict',
      conflict_id: conflictId,
      server_version: existing.version,
      client_version: operation.client_version,
    };
  }

  // Apply delta
  const updateData = {
    ...operation.delta,
    version: existing.version + 1,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', operation.entity_id)
    .eq('version', existing.version) // Optimistic locking
    .select()
    .single();

  if (error) throw error;

  return {
    sync_id: operation.sync_id,
    status: 'success',
    server_version: data.version,
  };
}

async function handleDelete(
  supabase: any,
  table: string,
  operation: BaseSyncOperation
) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', operation.entity_id);

  if (error) {
    if (error.code === 'PGRST116') {
      // Already deleted
      return {
        sync_id: operation.sync_id,
        status: 'success',
        note: 'Entity already deleted',
      };
    }
    throw error;
  }

  return {
    sync_id: operation.sync_id,
    status: 'success',
  };
}

async function handleSoftDelete(
  supabase: any,
  table: string,
  operation: BaseSyncOperation
) {
  const { data, error } = await supabase
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', operation.entity_id)
    .select()
    .single();

  if (error) throw error;

  return {
    sync_id: operation.sync_id,
    status: 'success',
    server_version: data.version,
  };
}

// ============================================================================
// Conflict Handling
// ============================================================================

async function createConflict(
  supabase: any,
  operation: BaseSyncOperation,
  serverData: any
) {
  // Determine conflicting fields
  const conflictingFields: string[] = [];
  const clientData = operation.delta || operation.full_entity;

  for (const key in clientData) {
    if (JSON.stringify(clientData[key]) !== JSON.stringify(serverData[key])) {
      conflictingFields.push(key);
    }
  }

  // Create conflict record
  const { data, error } = await supabase.rpc('create_sync_conflict', {
    p_sync_id: operation.sync_id,
    p_entity_type: operation.entity_type,
    p_entity_id: operation.entity_id,
    p_client_version: operation.client_version,
    p_server_version: serverData.version,
    p_client_data: clientData,
    p_server_data: serverData,
    p_conflicting_fields: conflictingFields,
    p_resolution_strategy: 'manual', // Default to manual resolution
  });

  if (error) throw error;

  return data;
}

// ============================================================================
// Helpers
// ============================================================================

function getTableName(entityType: SyncEntityType): string {
  const tableMap: Record<SyncEntityType, string> = {
    field_session: 'field_sessions',
    find_log: 'find_logs',
    specimen: 'specimens',
    capture_session: 'capture_sessions',
    raw_capture: 'raw_captures',
    processed_capture: 'processed_captures',
    storage_location: 'storage_locations',
    collection_group: 'collection_groups',
    tag: 'tags',
    export_job: 'export_jobs',
    analytics_cache: 'analytics_cache',
  };

  return tableMap[entityType];
}

function generateIdempotencyKey(operation: BaseSyncOperation): string {
  // Simple checksum for idempotency
  const data = {
    entity_type: operation.entity_type,
    entity_id: operation.entity_id,
    operation_type: operation.operation_type,
    client_version: operation.client_version,
    user_id: operation.user_id,
  };
  
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
