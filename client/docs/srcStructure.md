# Cấu trúc mã nguồn client

Tổ chức theo trách nhiệm kết hợp nhóm nghiệp vụ. Chỉ thay đổi frontend.

| Thư mục | Trách nhiệm |
| --- | --- |
| `assets/images` | Ảnh tĩnh được Vite xử lý. |
| `assets/styles` | CSS toàn cục và CSS dùng chung; index.css nạp toàn bộ style theo thứ tự cố định trước khi điều hướng lazy. |
| `components/common` | Thành phần giao diện dùng chung. |
| `components/layout` | Khung trang, header và footer. |
| `features/<feature>/components` | Thành phần riêng của từng nghiệp vụ. |
| `features/<feature>/hooks` | State và side effect riêng của nghiệp vụ. |
| `features/<feature>/styles` | CSS riêng của nghiệp vụ. |
| `features/<feature>/utils` | Hàm thuần riêng của nghiệp vụ. |
| `pages` | Trang gắn với URL; `auth` và `admin` gom nhóm route liên quan. |
| `routes` | Cấu hình route, lazy loading và accessibility khi điều hướng. |
| `context` | Context và provider toàn cục. |
| `hooks` | Custom hook dùng chung. |
| `services` | Giao tiếp HTTP; giữ nguyên hợp đồng API hiện tại. |
| `constants` | Hằng số và nhãn phân loại. |
| `utils` | Định dạng, phiên trình duyệt, sự kiện và các hàm tiện ích. |

## Quy tắc bổ sung

- Component dùng PascalCase.jsx; các module JS và CSS dùng camelCase.
- Import bằng đường dẫn tương đối trực tiếp; không tạo barrel hoặc thư mục rỗng.
- Component chỉ thuộc một nghiệp vụ đặt trong features, không đặt trong components dùng chung.
- main.jsx khởi tạo ứng dụng; App.jsx lắp ghép boundary và routes.
- Khi di chuyển module phải cập nhật cả import trong test, kể cả dynamic import có query.
- Refactor cấu trúc không thay đổi endpoint, payload hoặc cơ chế xác thực.

## Danh sách file di chuyển

Đường dẫn tuyệt đối ở máy thực hiện để đối chiếu thay đổi:

| Trước | Sau |
| --- | --- |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/Admin.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/styles/admin.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/AdminAi.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/styles/adminAi.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/App.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/styles/app.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/ChatAi.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/chat/styles/chatAi.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/Discovery.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/styles/discovery.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/Explore.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/styles/explore.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/FoodScanner.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/foodScanner/styles/foodScanner.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/FoodSwap.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/foodSwap/styles/foodSwap.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/Home.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/styles/home.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/Journal.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/journal/styles/journal.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/MealPlan.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/mealPlan/styles/mealPlan.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/NearbyPlaces.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/restaurants/styles/nearbyPlaces.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/Profile.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/profile/styles/profile.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/RestaurantDetail.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/restaurants/styles/restaurantDetail.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/Ui.css` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/styles/ui.css` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/chayxanh-bowl.webp` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/images/chayxanh-bowl.webp` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/AuthForm.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/auth/components/AuthForm.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/AuthHeader.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/auth/components/AuthHeader.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/ChatBox.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/chat/components/ChatBox.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/ContentDialog.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/common/ContentDialog.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/ContentImage.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/common/ContentImage.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/ContentVideo.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/common/ContentVideo.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/Footer.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/layout/Footer.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/Header.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/layout/Header.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/HomeContentDialog.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/home/components/HomeContentDialog.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/HomeMain.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/home/components/HomeMain.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/MarkdownMessage.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/chat/components/MarkdownMessage.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/MealPlanDialog.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/mealPlan/components/MealPlanDialog.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/NearbyPlaces.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/restaurants/components/NearbyPlaces.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/PostMedia.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/components/PostMedia.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/RestaurantDetail.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/restaurants/components/RestaurantDetail.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/RestaurantMap.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/restaurants/components/RestaurantMap.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/RouteAccessibility.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/routes/RouteAccessibility.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/SiteLayout.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/layout/SiteLayout.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/SiteStatus.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/common/SiteStatus.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/WelcomeModal.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/diet/components/WelcomeModal.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/DatabaseContext.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/context/DatabaseProvider.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/aiApi.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/services/aiApi.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/aiHelpers.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/aiHelpers.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/api.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/services/api.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/chatReplies.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/chatReplies.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/databaseContext.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/context/databaseContext.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/dietSelection.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/dietSelection.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/foodScanner.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/foodScanner.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/journal.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/journal.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/modelFields.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/formatters.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/postAttachments.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/postAttachments.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/recipeFilters.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/recipeFilters.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/restaurantDirections.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/restaurantDirections.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/restaurantLabels.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/constants/restaurantLabels.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/lib/syncEvents.js` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/syncEvents.js` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/AdminAi.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminAi.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Login.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/auth/Login.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Register.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/auth/Register.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminAiInterveneModal.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminAiInterveneModal.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminAiModerationTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminAiModerationTab.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminAiMonitorTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminAiMonitorTab.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminCategoriesTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminCategoriesTab.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminCommentsTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminCommentsTab.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminDashboardTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminDashboardTab.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminMembersTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminMembersTab.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminPostsTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminPostsTab.jsx` |
| `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminReportsTab.jsx` | `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminReportsTab.jsx` |

## File bổ sung

- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/assets/styles/index.css`

- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/chat/components/ChatMessage.jsx`

- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/hooks/useDatabase.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/utils/session.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/constants/dietTypes.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/routes/AppRoutes.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/components/common/ErrorBoundary.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/chat/hooks/useChatBox.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/chat/hooks/useChatRequest.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/profile/hooks/useProfileForm.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/profile/utils/profileValues.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/profile/components/ProfileForm.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/ingredients/components/IngredientPreview.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/admin/components/AdminMemberContentModal.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/mealPlan/components/TagField.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/mealPlan/components/PlanResult.jsx`

## File cập nhật import và tài liệu

- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/App.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/main.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/admin/AdminPortal.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Community.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/FoodScanner.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/FoodSwap.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Home.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/IngredientDictionary.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Journal.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Profile.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Recipes.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/Restaurants.jsx`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/services/adminService.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/services/apiClient.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/admin.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/aiApi.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/api.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/dietSelection.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/foodScanner.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/journal.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/postAttachments.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/recipeFilters.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/restaurantDirections.test.js`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/README.md`
- `C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/docs/srcStructure.md`
