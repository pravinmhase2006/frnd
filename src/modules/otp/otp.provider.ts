/**
 * Isolated SMS / OTP Provider Interface & Implementations
 * Default Provider: MSG91 (India & Global SMS API)
 */

export interface ProviderDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface ProviderVerifyResult {
  success: boolean;
  provider: string;
  error?: string;
}

export interface ISmsProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendOtp(mobile: string, otp: string, expiryMinutes: number): Promise<ProviderDispatchResult>;
  verifyOtp?(mobile: string, otp: string): Promise<ProviderVerifyResult>;
}

/**
 * MSG91 SMS Provider Implementation
 * Documentation: https://docs.msg91.com/p/tf9GTextN/e/7X3E-e-2b/MSG91
 */
export class Msg91Provider implements ISmsProvider {
  readonly name = 'MSG91';

  private readonly authKey: string | undefined;
  private readonly templateId: string | undefined;
  private readonly baseUrl = 'https://control.msg91.com/api/v5/otp';

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.templateId = process.env.MSG91_TEMPLATE_ID;
  }

  public isConfigured(): boolean {
    return Boolean(this.authKey && this.authKey.trim().length > 0);
  }

  public async sendOtp(mobile: string, otp: string, expiryMinutes = 5): Promise<ProviderDispatchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: 'MSG91_AUTH_KEY is not configured in environment variables.',
      };
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('template_id', this.templateId || '');
      url.searchParams.append('mobile', mobile);
      url.searchParams.append('otp', otp);
      url.searchParams.append('otp_expiry', String(expiryMinutes));

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          authkey: this.authKey!,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const responseData = (await response.json()) as { type?: string; message?: string; request_id?: string };

      if (response.ok && responseData.type === 'success') {
        return {
          success: true,
          provider: this.name,
          messageId: responseData.request_id || 'msg91_sent',
        };
      }

      return {
        success: false,
        provider: this.name,
        error: responseData.message || `MSG91 failed with HTTP status ${response.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || 'Network error while contacting MSG91 gateway.',
      };
    }
  }

  public async verifyOtp(mobile: string, otp: string): Promise<ProviderVerifyResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: 'MSG91_AUTH_KEY is not configured.',
      };
    }

    try {
      const url = new URL(`${this.baseUrl}/verify`);
      url.searchParams.append('mobile', mobile);
      url.searchParams.append('otp', otp);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          authkey: this.authKey!,
          Accept: 'application/json',
        },
      });

      const responseData = (await response.json()) as { type?: string; message?: string };

      if (response.ok && responseData.type === 'success') {
        return { success: true, provider: this.name };
      }

      return {
        success: false,
        provider: this.name,
        error: responseData.message || 'OTP verification failed at MSG91 gateway.',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || 'Network error while verifying OTP with MSG91.',
      };
    }
  }
}

/**
 * Mock / Development SMS Provider
 * Active only when real MSG91 credentials are not yet configured.
 * Never logs raw OTP or exposes keys.
 */
export class MockDevelopmentProvider implements ISmsProvider {
  readonly name = 'DevMockProvider';

  public isConfigured(): boolean {
    return true;
  }

  public async sendOtp(mobile: string, _otp: string): Promise<ProviderDispatchResult> {
    // Note: As per security guidelines, we never log the plaintext OTP or secrets.
    console.log(`[OTP Provider] [DevMockProvider] Handshake simulated for destination +${mobile}`);
    return {
      success: true,
      provider: this.name,
      messageId: `mock_${Date.now()}`,
    };
  }
}

/**
 * Factory to retrieve active SMS provider
 */
export const getActiveSmsProvider = (): ISmsProvider => {
  const msg91 = new Msg91Provider();
  if (msg91.isConfigured()) {
    return msg91;
  }
  return new MockDevelopmentProvider();
};
