import crypto from 'crypto';
import { OtpModel } from './otp.model.js';
import { getActiveSmsProvider, ISmsProvider } from './otp.provider.js';
import { normalizePhoneNumber } from './otp.validation.js';

export interface SendOtpServiceResult {
  success: boolean;
  message: string;
  statusCode: number;
  phone?: string;
  expiresInSeconds?: number;
  cooldownSeconds?: number;
}

export interface VerifyOtpServiceResult {
  success: boolean;
  message: string;
  statusCode: number;
  phone?: string;
  verified?: boolean;
}

export class OtpService {
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly RESEND_COOLDOWN_SECONDS = 60;
  private static readonly MAX_VERIFY_ATTEMPTS = 5;
  private static readonly OTP_DIGITS = 4;

  /**
   * Generates a secret HMAC-SHA256 hash for secure storage (never plaintext)
   */
  private static hashOtp(otp: string): string {
    const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || 'frnd_otp_secure_hmac_secret_2026';
    return crypto.createHmac('sha256', secret).update(otp).digest('hex');
  }

  /**
   * Generates cryptographically secure numeric OTP
   */
  private static generateSecureOtp(digits: number = this.OTP_DIGITS): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return String(crypto.randomInt(min, max + 1));
  }

  /**
   * Sends an OTP to a mobile phone with resend cooldown and secure storage
   */
  public static async sendOtp(rawPhone: string): Promise<SendOtpServiceResult> {
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const now = new Date();

    // 1. Check for existing OTP record to enforce Resend Cooldown
    const existingRecord = await OtpModel.findOne({ phone: normalizedPhone });

    if (existingRecord) {
      const elapsedSeconds = (now.getTime() - existingRecord.lastSentAt.getTime()) / 1000;
      if (elapsedSeconds < this.RESEND_COOLDOWN_SECONDS) {
        const remainingCooldown = Math.ceil(this.RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        return {
          success: false,
          statusCode: 429,
          message: `Please wait ${remainingCooldown} second(s) before requesting a new OTP.`,
          phone: normalizedPhone,
          cooldownSeconds: remainingCooldown,
        };
      }
    }

    // 2. Generate secure OTP and hashed representation
    const plainOtp = this.generateSecureOtp(this.OTP_DIGITS);
    const hashedOtp = this.hashOtp(plainOtp);
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // 3. Dispatch via configured SMS provider (MSG91 or Mock)
    const provider: ISmsProvider = getActiveSmsProvider();
    const dispatchResult = await provider.sendOtp(normalizedPhone, plainOtp, this.OTP_EXPIRY_MINUTES);

    if (!dispatchResult.success) {
      return {
        success: false,
        statusCode: 502,
        message: dispatchResult.error || 'SMS gateway failed to deliver OTP. Please check provider configuration.',
        phone: normalizedPhone,
      };
    }

    // 4. Save hashed OTP to database with TTL expiry
    await OtpModel.findOneAndUpdate(
      { phone: normalizedPhone },
      {
        phone: normalizedPhone,
        hashedOtp,
        expiresAt,
        lastSentAt: now,
        attempts: 0,
        verified: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      success: true,
      statusCode: 200,
      message: `OTP sent successfully to +${normalizedPhone}.`,
      phone: normalizedPhone,
      expiresInSeconds: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verifies an OTP submitted by the user
   */
  public static async verifyOtp(rawPhone: string, enteredOtp: string): Promise<VerifyOtpServiceResult> {
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const cleanOtp = enteredOtp.trim();

    // 1. Retrieve active OTP record from database
    const record = await OtpModel.findOne({ phone: normalizedPhone });

    if (!record) {
      return {
        success: false,
        statusCode: 400,
        message: 'No active OTP request found for this phone number. Please request an OTP first.',
        phone: normalizedPhone,
        verified: false,
      };
    }

    // 2. Check if already verified
    if (record.verified) {
      return {
        success: false,
        statusCode: 400,
        message: 'This OTP has already been verified and used.',
        phone: normalizedPhone,
        verified: false,
      };
    }

    // 3. Check expiration
    if (record.expiresAt < new Date()) {
      await OtpModel.deleteOne({ _id: record._id });
      return {
        success: false,
        statusCode: 400,
        message: 'The OTP has expired. Please request a new one.',
        phone: normalizedPhone,
        verified: false,
      };
    }

    // 4. Check brute-force attempts
    if (record.attempts >= this.MAX_VERIFY_ATTEMPTS) {
      await OtpModel.deleteOne({ _id: record._id });
      return {
        success: false,
        statusCode: 429,
        message: 'Too many incorrect attempts. This OTP has been invalidated for security reasons. Please request a new one.',
        phone: normalizedPhone,
        verified: false,
      };
    }

    // 5. Compare submitted OTP against stored hashed OTP
    const submittedHash = this.hashOtp(cleanOtp);
    const isMatched = crypto.timingSafeEqual(
      Buffer.from(record.hashedOtp, 'hex'),
      Buffer.from(submittedHash, 'hex')
    );

    if (!isMatched) {
      record.attempts += 1;
      await record.save();

      const remainingAttempts = this.MAX_VERIFY_ATTEMPTS - record.attempts;
      return {
        success: false,
        statusCode: 400,
        message: `Invalid OTP code. You have ${remainingAttempts} attempt(s) remaining.`,
        phone: normalizedPhone,
        verified: false,
      };
    }

    // 6. If provider supports native remote verification (e.g., MSG91 verify API), call it
    const provider: ISmsProvider = getActiveSmsProvider();
    if (provider.verifyOtp) {
      const providerVerify = await provider.verifyOtp(normalizedPhone, cleanOtp);
      if (!providerVerify.success) {
        return {
          success: false,
          statusCode: 400,
          message: providerVerify.error || 'Provider rejected OTP verification.',
          phone: normalizedPhone,
          verified: false,
        };
      }
    }

    // 7. Verification succeeded: mark as verified and clean up record
    record.verified = true;
    await OtpModel.deleteOne({ _id: record._id });

    return {
      success: true,
      statusCode: 200,
      message: 'Mobile number verified successfully.',
      phone: normalizedPhone,
      verified: true,
    };
  }
}
