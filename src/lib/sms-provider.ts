// SMS provider abstraction for Stage B OTP (Agent G).
//
// Default = ConsoleProvider (logs to server, no SMS sent). MSG91Provider is
// only used when SMS_PROVIDER=msg91 + MSG91_AUTH_KEY + MSG91_TEMPLATE_ID.
//
// VERIFY_METHOD lock (Mama 2026-04-28): Stage B is shipped DARK behind
// STAGE_B_ENABLED — even with that on, SMS_PROVIDER defaults to 'console'
// so dev can verify without burning SMS credit. Production flip is two env
// vars: STAGE_B_ENABLED=true + SMS_PROVIDER=msg91.

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }>
}

class ConsoleProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    console.log(`[OTP_CONSOLE] phone=+91${phone} code=${code}`)
    return { ok: true as const }
  }
}

class MSG91Provider implements SmsProvider {
  private authKey: string
  private templateId: string

  constructor() {
    const authKey = process.env.MSG91_AUTH_KEY
    const templateId = process.env.MSG91_TEMPLATE_ID
    if (!authKey || !templateId) {
      throw new Error('MSG91 not configured: MSG91_AUTH_KEY and MSG91_TEMPLATE_ID required')
    }
    this.authKey = authKey
    this.templateId = templateId
  }

  async sendOtp(phone: string, code: string) {
    try {
      const res = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=91${phone}&otp=${code}`, {
        method: 'POST',
        headers: { authkey: this.authKey, 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        return { ok: false as const, error: `MSG91 ${res.status}` }
      }
      const body = await res.json().catch(() => null) as { type?: string; message?: string } | null
      if (body?.type === 'success') return { ok: true as const }
      return { ok: false as const, error: body?.message ?? 'MSG91 send failed' }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'MSG91 network error' }
    }
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? 'console'
  if (provider === 'msg91') return new MSG91Provider()
  return new ConsoleProvider()
}
