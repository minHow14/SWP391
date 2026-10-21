// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/components/ReportForm.jsx
import { Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const REPORT_SCHEMA = z.object({
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do báo cáo.'),
});

export default function ReportForm() {
  const { register, formState: { errors } } = useForm({
    resolver: zodResolver(REPORT_SCHEMA), mode: 'onBlur', defaultValues: { reason: '' },
  });
  return <Form onSubmit={event => event.preventDefault()} noValidate>
    <Form.Group controlId="community-report-reason">
      <Form.Label>Lý do báo cáo <span aria-hidden="true">*</span></Form.Label>
      <Form.Control as="textarea" rows={4} {...register('reason')} isInvalid={Boolean(errors.reason)}
        placeholder="Mô tả vấn đề bạn gặp với nội dung này…" aria-required="true" autoFocus
        aria-describedby={`community-report-reason-help${errors.reason ? ' community-report-reason-error' : ''}`} />
      <Form.Control.Feedback type="invalid" id="community-report-reason-error">{errors.reason?.message}</Form.Control.Feedback>
      <Form.Text id="community-report-reason-help">Nêu rõ vấn đề để quản trị viên có thể xem xét. Nội dung bạn nhập chưa được gửi hoặc lưu.</Form.Text>
    </Form.Group>
  </Form>;
}
