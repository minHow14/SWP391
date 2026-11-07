// D:/SWP391/SWP391/client/src/features/auth/components/RecoveryEmailStep.jsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Spinner } from 'react-bootstrap';
import { forgotPasswordSchema } from '../utils/authValidation.js';
import RecoveryOtpStep from './RecoveryOtpStep.jsx';

export default function RecoveryEmailStep({ recovery }) {
  const { step, email, busy, resendAt, sendOtp, restart } = recovery;
  const emailForm = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email } });
  const { setFocus: focusEmail } = emailForm;
  const isOtp = step === 'otp';
  useEffect(() => {
    if (!isOtp && !busy) focusEmail('email');
  }, [isOtp, busy, focusEmail]);
  const emailError = emailForm.formState.errors.email;
  const sendLabel = busy === 'request' ? 'Đang gửi OTP' : 'Gửi OTP';

  return <>
    <Form onSubmit={(event) => {
      if (busy || isOtp) { event.preventDefault(); return; }
      return emailForm.handleSubmit(sendOtp)(event);
    }} noValidate aria-busy={busy === 'request'}>
      <fieldset disabled={Boolean(busy)}>
        <legend className="visually-hidden">Email nhận mã OTP</legend>
        <Form.Group controlId="recovery-email" className="mb-3">
          <div className="cx-recovery-label-row">
            <Form.Label>Email</Form.Label>
            {isOtp && <Button type="button" variant="link" className="cx-recovery-edit" onClick={restart}>Đổi email</Button>}
          </div>
          <Form.Control type="email" autoComplete="email" maxLength={255} required readOnly={isOtp}
            {...emailForm.register('email')} isInvalid={Boolean(emailError)} aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'recovery-email-error' : undefined} />
          {emailError && <Form.Control.Feedback type="invalid" id="recovery-email-error" role="alert">{emailError.message}</Form.Control.Feedback>}
        </Form.Group>
        {!isOtp && <Button type="submit" variant="success" className="cx-recovery-action w-100" disabled={Boolean(busy)}>
          {busy === 'request' && <Spinner size="sm" animation="border" className="me-2" aria-hidden="true" />}
          {sendLabel}
        </Button>}
      </fieldset>
    </Form>
    {isOtp && <RecoveryOtpStep key={resendAt} recovery={recovery} />}
  </>;
}
