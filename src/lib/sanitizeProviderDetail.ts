const API_KEY_PATTERN = /\bsk[-_][A-Za-z0-9_-]{8,}\b/gi;
const EPHEMERAL_KEY_PATTERN = /\bek[-_][A-Za-z0-9_-]{8,}\b/gi;
const REALTIME_CALL_ID_PATTERN = /\brtc_[A-Za-z0-9_-]{8,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[^\s,;)}\]]+/gi;
const SIGNED_WEBSOCKET_PATTERN = /\bwss:\/\/[^\s"'<>]+/gi;
const SENSITIVE_QUERY_PATTERN =
  /([?&](?:access_token|api-key|api_key|authorization|conversation_signature|conversation_token|conversationToken|key|sig|signature|signed-url|signed_url|token)=)[^&#\s]+/gi;
const SENSITIVE_FIELD_PATTERN =
  /(^|\s|[,;{(])((?:"|')?(?:access_token|api-key|api_key|authorization|conversation_signature|conversation_token|conversationToken|elevenlabs_api_key|openai_api_key|signature|signed-url|signedUrl|signed_url|token|x-api-key|xi-api-key)(?:"|')?\s*[:=]\s*(?:"|')?)[^"',;}\r\n]+/gim;

/** Redact provider credentials and bearer capabilities before logging details. */
export function sanitizeProviderDetail(
  detail: string,
  maxLength = 2_000,
): string {
  return detail
    .replace(API_KEY_PATTERN, "[redacted]")
    .replace(EPHEMERAL_KEY_PATTERN, "[client-secret redacted]")
    .replace(REALTIME_CALL_ID_PATTERN, "[call-id redacted]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(SIGNED_WEBSOCKET_PATTERN, "[signed-url redacted]")
    .replace(SENSITIVE_QUERY_PATTERN, "$1[redacted]")
    .replace(SENSITIVE_FIELD_PATTERN, "$1$2[redacted]")
    .slice(0, maxLength);
}
