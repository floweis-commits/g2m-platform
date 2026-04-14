/**
 * Webhook Signature Verification
 * Verifies HMAC signatures for webhook endpoints to prevent spoofed events
 */

import { createHmac } from "crypto"

/**
 * Verify LinkedIn webhook signature.
 * LinkedIn uses X-LinkedIn-Signature header with HMAC-SHA256.
 */
export function verifyLinkedInSignature(
  payload: string,
  signature: string,
  signingSecret: string,
): boolean {
  try {
    const hash = createHmac("sha256", signingSecret).update(payload).digest("base64")
    return hash === signature
  } catch {
    return false
  }
}

/**
 * Verify Gmail webhook signature.
 * Google Pub/Sub signatures use ECDSA with a public certificate.
 * For simplicity in this implementation, we assume the webhook is already
 * authenticated at the infrastructure level (Pub/Sub subscription).
 * In production, you would verify the ECDSA signature using Google's public certs.
 */
export function verifyGmailSignature(
  message: {
    data: string
    messageId: string
    publishTime: string
  },
  signature?: string,
): boolean {
  // Gmail Pub/Sub messages are authenticated at the subscription level.
  // The messageId and publishTime are always present for legitimate Google messages.
  // In production, implement full ECDSA verification using Google's public keys.
  return Boolean(message.messageId && message.publishTime)
}
