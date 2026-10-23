import { Request, Response } from 'express';
import { OtpService } from './otp.service.js';
import { sendOtpSchema, verifyOtpSchema } from './otp.validation.js';

export class OtpController {
  /**
   * POST /api/otp/send
   * Dispatches OTP to the user's mobile number
   */
  public static async sendOtp(req: Request, res: Response): Promise<Response> {
    try {
      // 1. Validate incoming payload with Zod
      const parseResult = sendOtpSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || [];
        return res.status(400).json({
          success: false,
          message: issues[0]?.message || 'Invalid input parameters.',
          errors: issues,
        });
      }

      const { phone } = parseResult.data;

      // 2. Dispatch OTP via OtpService
      const result = await OtpService.sendOtp(phone);

      return res.status(result.statusCode).json({
        success: result.success,
        message: result.message,
        data: result.success
          ? {
              phone: result.phone,
              expiresInSeconds: result.expiresInSeconds,
            }
          : {
              phone: result.phone,
              cooldownSeconds: result.cooldownSeconds,
            },
      });
    } catch (error: any) {
      console.error('[OTP Controller] Unexpected error in sendOtp:', error.message);
      return res.status(500).json({
        success: false,
        message: 'An unexpected internal error occurred while dispatching OTP.',
      });
    }
  }

  /**
   * POST /api/otp/verify
   * Verifies the OTP code submitted by the user
   */
  public static async verifyOtp(req: Request, res: Response): Promise<Response> {
    try {
      // 1. Validate incoming payload with Zod
      const parseResult = verifyOtpSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || [];
        return res.status(400).json({
          success: false,
          message: issues[0]?.message || 'Invalid input parameters.',
          errors: issues,
        });
      }

      const { phone, otp } = parseResult.data;

      // 2. Verify OTP code via OtpService
      const result = await OtpService.verifyOtp(phone, otp);

      return res.status(result.statusCode).json({
        success: result.success,
        message: result.message,
        data: {
          phone: result.phone,
          verified: Boolean(result.verified),
        },
      });
    } catch (error: any) {
      console.error('[OTP Controller] Unexpected error in verifyOtp:', error.message);
      return res.status(500).json({
        success: false,
        message: 'An unexpected internal error occurred while verifying OTP.',
      });
    }
  }
}
