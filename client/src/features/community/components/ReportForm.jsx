// client/src/features/community/components/ReportForm.jsx
import { Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const REPORT_SCHEMA = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Vui lòng nhập lý do báo cáo chi tiết hơn (tối thiểu 5 ký tự).')
    .max(1000, 'Lý do báo cáo không được vượt quá 1000 ký tự.'),
});

export default function ReportForm({ onSubmit, isSubmitting = false, formId = 'community-report-form' }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(REPORT_SCHEMA),
    mode: 'onBlur',
    defaultValues: { reason: '' },
  });

  return (
    <Form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Form.Group controlId="community-report-reason">
        <Form.Label>
          Lý do báo cáo <span aria-hidden="true">*</span>
        </Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          {...register('reason')}
          isInvalid={Boolean(errors.reason)}
          placeholder="Mô tả cụ thể lý do vi phạm (spam, ngôn từ kích động, sai lệch thông tin dinh dưỡng...)"
          aria-required="true"
          autoFocus
          disabled={isSubmitting}
          aria-describedby={`community-report-reason-help${errors.reason ? ' community-report-reason-error' : ''}`}
        />
        <Form.Control.Feedback type="invalid" id="community-report-reason-error">
          {errors.reason?.message}
        </Form.Control.Feedback>
        <Form.Text id="community-report-reason-help">
          Nêu rõ vấn đề để ban quản trị có thể xem xét và xử lý bảo vệ cộng đồng.
        </Form.Text>
      </Form.Group>
    </Form>
  );
}
