import { meals } from '../data/homeData.js';

export function getDemoReply(question, dietName) {
  const text = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  if (/thuc don|tuan/.test(text)) {
    return {
      title: 'Một tuần với những món chay dễ làm',
      text: `Đây là thực đơn minh họa để bạn tham khảo, không phải tư vấn dinh dưỡng cá nhân. Chế độ bạn đã chọn: ${dietName}.`,
      items: Array.from(
        { length: 7 },
        (_, index) =>
          `${index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`}: ${meals[index % meals.length].recipe_name}`
      ),
    };
  }
  if (/dam|protein/.test(text)) {
    return {
      title: 'Gợi ý món từ đậu và hạt',
      text: 'Bạn có thể bắt đầu với những món quen thuộc trong căn bếp chay:',
      items: [
        'Đậu hũ áp chảo cùng rau củ.',
        'Đậu gà trộn salad và sốt chanh.',
        'Đậu lăng nấu cùng rau củ.',
        'Salad bơ với hạt óc chó.',
      ],
      footer: 'Các gợi ý mẫu chưa tính lượng đạm hay nhu cầu cá nhân.',
    };
  }
  if (/b12|vitamin|bmi|calo|can nang|giam can/.test(text)) {
    return {
      title: 'Câu hỏi dinh dưỡng của bạn',
      text: 'Bản giao diện này chưa kết nối dịch vụ AI hoặc hồ sơ sức khỏe nên chưa thể tính toán hay đưa ra khuyến nghị cá nhân. Bạn có thể khám phá công thức mẫu hoặc yêu cầu thực đơn tuần.',
      footer:
        'Với câu hỏi sức khỏe cụ thể, hãy trao đổi với chuyên gia dinh dưỡng.',
    };
  }
  if (/video|tom tat/.test(text)) {
    return {
      title: 'Tóm tắt nội dung nấu ăn',
      text: 'Hãy dán phần lời thoại hoặc nội dung hướng dẫn vào ô chat tiếp theo. Mình sẽ trích ba câu đầu để bạn xem nhanh trong bản demo. Hiện chưa đọc được nội dung từ đường dẫn video.',
    };
  }
  if (/salad|bo/.test(text)) {
    return {
      title: meals[1].recipe_name,
      text: `Nguyên liệu: ${meals[1].ingredients.join(', ')}.`,
      items: meals[1].instructions.split('\n'),
    };
  }
  if (/dau hu|cong thuc|mon|nau/.test(text)) {
    return {
      title: meals[0].recipe_name,
      text: `Nguyên liệu: ${meals[0].ingredients.join(', ')}.`,
      items: meals[0].instructions.split('\n'),
    };
  }
  return {
    text: 'Mình có thể minh họa cách trò chuyện về công thức chay, gợi ý thực đơn tuần hoặc tóm tắt văn bản nấu ăn. Bạn thử hỏi “Gợi ý món đậu hũ” nhé!',
    footer: 'Đây là câu trả lời mẫu, chưa được tạo bởi AI.',
  };
}

export function summarizeDemoText(text) {
  const sentences = text
    .trim()
    .split(/(?<=[.!?。])\s+|\n+/)
    .filter(Boolean);
  return {
    title: 'Trích nội dung bạn gửi',
    items: sentences.slice(0, 3),
    footer: 'Bản demo trích ba câu đầu của văn bản, chưa dùng AI để tóm tắt.',
  };
}
