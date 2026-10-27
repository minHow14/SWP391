// client/src/features/profile/components/ChangePasswordModal.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { authService } from '../../../services/authService.js';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.'),
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmNewPassword'],
  });

export default function ChangePasswordModal({ show, onHide }) {
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const handleClose = () => {
    reset();
    setServerError('');
    setSuccessMessage('');
    onHide();
  };

  const onSubmit = async (data) => {
    setServerError('');
    setSuccessMessage('');
    try {
      const response = await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMessage(response?.message || 'Đổi mật khẩu thành công!');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setServerError(err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 fw-bold text-success">
          <i className="bi bi-shield-lock-fill me-2" aria-hidden="true" />
          Đổi mật khẩu
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Modal.Body className="px-4 py-3">
          {serverError && (
            <Alert variant="danger" dismissible onClose={() => setServerError('')}>
              <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
              {serverError}
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success">
              <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
              {successMessage}
            </Alert>
          )}

          <Form.Group className="mb-3" controlId="currentPassword">
            <Form.Label className="fw-semibold small text-secondary">Mật khẩu hiện tại</Form.Label>
            <Form.Control
              type="password"
              placeholder="Nhập mật khẩu hiện tại"
              isInvalid={!!errors.currentPassword}
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            <Form.Control.Feedback type="invalid">
              {errors.currentPassword?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="newPassword">
            <Form.Label className="fw-semibold small text-secondary">Mật khẩu mới (tối thiểu 8 ký tự)</Form.Label>
            <Form.Control
              type="password"
              placeholder="Nhập mật khẩu mới"
              isInvalid={!!errors.newPassword}
              autoComplete="new-password"
              {...register('newPassword')}
            />
            <Form.Control.Feedback type="invalid">
              {errors.newPassword?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="confirmNewPassword">
            <Form.Label className="fw-semibold small text-secondary">Xác nhận mật khẩu mới</Form.Label>
            <Form.Control
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              isInvalid={!!errors.confirmNewPassword}
              autoComplete="new-password"
              {...register('confirmNewPassword')}
            />
            <Form.Control.Feedback type="invalid">
              {errors.confirmNewPassword?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className="px-4 py-2 bg-light">
          <Button variant="outline-secondary" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button variant="success" type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            )}
            {isSubmitting ? 'Đang cập nhật…' : 'Lưu mật khẩu'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
