import type { AuthSessionState } from '../auth/types.js';
import type { SessionAiCredentialStore } from '../ai/preferences.js';
import type { DriveAuthorizationService } from '../drive/types.js';

export interface SessionInstructionClearable {
  clear(): void;
}

export interface ProductSessionEphemeralState {
  driveAuthorization: Pick<DriveAuthorizationService, 'clear'>;
  aiCredentials: Pick<SessionAiCredentialStore, 'clear'>;
  aiInstruction: SessionInstructionClearable;
  driveFolderLinks?: SessionInstructionClearable;
}

export function clearProductSessionEphemeralState(
  state: ProductSessionEphemeralState,
): void {
  state.driveAuthorization.clear();
  state.aiCredentials.clear();
  state.aiInstruction.clear();
  state.driveFolderLinks?.clear();
}

export function authenticatedSessionUid(
  session: AuthSessionState,
): string | null {
  return session.status === 'authenticated' ? session.user.uid : null;
}

export interface SessionIsolationGuard {
  transition(session: AuthSessionState): boolean;
  getCurrentUid(): string | null;
}

export function createSessionIsolationGuard(
  onBoundary: () => void,
): SessionIsolationGuard {
  let initialized = false;
  let currentUid: string | null = null;

  return {
    transition(session) {
      const nextUid = authenticatedSessionUid(session);

      if (!initialized) {
        initialized = true;
        currentUid = nextUid;
        return false;
      }

      if (currentUid === nextUid) {
        return false;
      }

      currentUid = nextUid;
      onBoundary();
      return true;
    },

    getCurrentUid() {
      return currentUid;
    },
  };
}
