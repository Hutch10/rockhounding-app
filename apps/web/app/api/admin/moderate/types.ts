/**
 * Moderation API Types
 * Backend-aligned moderation review model
 */

export type ModerationAction = 'APPROVE' | 'REJECT';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StagingRecord {
  id: string;
  targetType: 'observation' | 'location' | 'user';
  targetId: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ModerateRequest {
  id: string;
  action: ModerationAction;
  reason?: string;
}

export interface ModerateResponse {
  success: boolean;
  message: string;
  staging_id: string;
  moderation_status: ModerationStatus;
}

export interface ModerateErrorResponse {
  error: string;
  details?: string;
}
