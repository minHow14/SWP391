// D:/SWP391/SWP391/client/src/features/auth/components/RecoveryOtpStep.jsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Spinner } from 'react-bootstrap';
import { passwordResetOtpSchema } from '../utils/authValidation.js';

export default function RecoveryOtpStep({ recovery }) {
  const { busy, email, otpExpired, resendSeconds, sendOtp, verifyOtp } = recovery;
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm({
    resolver: zodResolver(passwordResetOtpSchema), defaultValues: { otp: '' },
  });
  useEffect(() => { if (!busy) setFocus('otp'); }, [busy, setFocus]);
  return <Form onSubmit={(event) => {
    if (busy) { event.preventDefault(); return; }
    return handleSubmit(verifyOtp)(event);
  }} noValidate className="cx-recovery-otp-section" aria-busy={busy === 'verify'}>
    <fieldset disabled={Boolean(busy)}>
      <legend className="visually-hidden">Xác minh email bằng OTP</legend>
      <Form.Group controlId="recovery-otp" className="mb-3">
        <Form.Label>Mã OTP</Form.Label>
        <Form.Control type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12} required
          className="cx-recovery-otp-input" {...register('otp')} isInvalid={Boolean(errors.otp)}
          aria-invalid={Boolean(errors.otp)} aria-describedby={errors.otp ? 'recovery-otp-error' : otpExpired ? 'recovery-otp-expired' : undefined} />
        <Button type="button" variant="link" className="cx-recovery-resend" disabled={Boolean(busy) || resendSeconds > 0}
          onClick={() => sendOtp({ email })}>
          {busy === 'request' ? 'Đang gửi mã OTP' : `Gửi lại mã OTP${resendSeconds > 0 ? ` (${resendSeconds}s)` : ''}`}
        </Button>
        {otpExpired && <Form.Text id="recovery-otp-expired" className="d-block">Mã đã hết hạn. Hãy yêu cầu mã mới.</Form.Text>}
        {errors.otp && <Form.Control.Feedback type="invalid" id="recovery-otp-error" role="alert">{errors.otp.message}</Form.Control.Feedback>}
      </Form.Group>
      <Button type="submit" variant="success" className="cx-recovery-action w-100" disabled={Boolean(busy) || otpExpired}>
        {busy === 'verify' && <Spinner size="sm" animation="border" className="me-2" aria-hidden="true" />}
        {busy === 'verify' ? 'Đang xác minh' : 'Xác minh OTP'}
      </Button>
    </fieldset>
  </Form>;
}
