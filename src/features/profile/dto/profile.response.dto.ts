/**
 * PATCH /v1/me returns the same body as GET /v1/me. The canonical DTO lives in auth and is
 * exposed through its service boundary (features may use another feature only via its service).
 */
export { MeResponseDto } from '../../auth/me.service.js';
