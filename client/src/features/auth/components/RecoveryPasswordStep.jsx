// D:/SWP391/SWP391/client/src/features/auth/components/RecoveryPasswordStep.jsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Spinner } from 'react-bootstrap';
import { passwordResetSchema } from '../utils/authValidation.js';

export default function RecoveryPasswordStep({ recovery }) {
  const { register, handleSubmit, setFocus, formState: { errors } } = useForm({
    resolver: zodResolver(passwordResetSchema), defaultValues: { newPassword: '', confirmNewPassword: '' },
  });
  useEffect(() => { if (!recovery.busy) setFocus('newPassword'); }, [recovery.busy, setFocus]);
  return <Form onSubmit={(event) => {
    if (recovery.busy) { event.preventDefault(); return; }
    return handleSubmit(recovery.resetPassword)(event);
  }} noValidate aria-busy={Boolean(recovery.busy)}>
    <fieldset disabled={Boolean(recovery.busy)}>
      <legend className="visually-hidden">Mật khẩu mới</legend>
      {recovery.email && <p className="cx-recovery-verified-email"><i className="bi bi-check-circle me-2" aria-hidden="true" />{recovery.email}</p>}
      <Form.Group controlId="recovery-newPassword" className="mb-3">
        <Form.Label>Mật khẩu mới</Form.Label>
        <Form.Control type="password" autoComplete="new-password" minLength={8} maxLength={128} required {...register('newPassword')}
          isInvalid={Boolean(errors.newPassword)} aria-invalid={Boolean(errors.newPassword)}
          aria-describedby={`recovery-password-hint${errors.newPassword ? ' recovery-password-error' : ''}`} />
        {errors.newPassword && <Form.Control.Feedback type="invalid" id="recovery-password-error" role="alert">{errors.newPassword.message}</Form.Control.Feedback>}
      </Form.Group>
      <Form.Group controlId="recovery-confirmNewPassword" className="mb-3">
        <Form.Label>Xác nhận mật khẩu mới</Form.Label>
        <Form.Control type="password" autoComplete="new-password" minLength={8} maxLength={128} required {...register('confirmNewPassword')}
          isInvalid={Boolean(errors.confirmNewPassword)} aria-invalid={Boolean(errors.confirmNewPassword)}
          aria-describedby={errors.confirmNewPassword ? 'recovery-confirm-error' : undefined} />
        {errors.confirmNewPassword && <Form.Control.Feedback type="invalid" id="recovery-confirm-error" role="alert">{errors.confirmNewPassword.message}</Form.Control.Feedback>}
      </Form.Group>
      <p id="recovery-password-hint" className="small text-muted">Từ 8 đến 128 ký tự và tối đa 72 byte UTF-8.</p>
      <Button type="submit" variant="success" className="cx-recovery-action w-100" disabled={Boolean(recovery.busy)}>
        {recovery.busy && <Spinner size="sm" animation="border" className="me-2" aria-hidden="true" />}
        {recovery.busy ? 'Đang đặt lại mật khẩu' : 'Đặt lại mật khẩu'}
      </Button>
    </fieldset>
  </Form>;
}
