// Backend/services/chat.service.js
const Groq = require("groq-sdk");
const chatRepo = require("../repositories/chat.repository");
const orderRepo = require("../repositories/order.repository");
const cartService = require("./cart.service");
const complaintQueue = require("./complaint.queue.service");
const vectorService = require("./vector.service");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
// Sử dụng model Llama 3 70B của Groq: Siêu tốc độ, hiểu tiếng Việt cực tốt và Miễn phí
const MODEL = "llama-3.1-8b-instant";

const MAX_HISTORY_TURNS = 5;

// Bộ nhớ tạm lưu lịch sử chat theo userId
const conversationStore = new Map();

const getHistory = (userId) => {
  if (!conversationStore.has(userId)) {
    conversationStore.set(userId, []);
  }
  return conversationStore.get(userId);
};

const addToHistory = (userId, role, content) => {
  const history = getHistory(userId);
  history.push({ role, content });
  const maxEntries = MAX_HISTORY_TURNS * 2;
  if (history.length > maxEntries) {
    history.splice(0, history.length - maxEntries);
  }
};

const clearHistory = (userId) => {
  conversationStore.delete(userId);
};

const SYSTEM_PROMPT = `Bạn là trợ lý hỗ trợ khách hàng AI thông minh của hệ thống thương mại điện tử ShopHub.
Bạn thân thiện, chuyên nghiệp, luôn xưng "mình" và gọi khách là "bạn".

═══ THÔNG TIN SHOPHUB (BẮT BUỘC — dùng để trả lời khi khách hỏi về cửa hàng, chính sách, điều khoản) ═══
1. GIỚI THIỆU:
- ShopHub kết nối người mua và bán, cung cấp môi trường an toàn, minh bạch.
- Ngành hàng: thời trang, điện tử, gia dụng, mỹ phẩm, phụ kiện.
- Địa chỉ: 12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM.
- Hotline: 1900 1234. Email: support@shophub.vn.
- Hỗ trợ 24/7.

2. CHÍNH SÁCH BÁN HÀNG:
- Miễn phí vận chuyển cho đơn hàng trên 500.000đ.
- Đổi trả trong vòng 30 ngày kể từ ngày nhận hàng (sản phẩm còn nguyên vẹn, chưa qua sử dụng).
- Hoàn tiền qua ví điện tử trong 3-5 ngày làm việc nếu đơn bị hủy/hoàn.

3. ĐIỀU KHOẢN SỬ DỤNG:
- Người dùng chịu trách nhiệm bảo mật tài khoản (không chia sẻ mật khẩu).
- Nghiêm cấm đăng bán hàng giả, nhái, nội dung vi phạm pháp luật, lừa đảo, vi phạm bản quyền.
- ShopHub có quyền khóa tài khoản vi phạm không cần báo trước.
- Mọi tranh chấp được giải quyết theo pháp luật Việt Nam.

4. CHÍNH SÁCH BẢO MẬT:
- Thu thập: Họ tên, email, SĐT, địa chỉ, lịch sử giao dịch để xử lý đơn hàng và phòng chống gian lận.
- Cam kết không bán thông tin cá nhân cho bên thứ 3 (trừ yêu cầu pháp luật hoặc đơn vị vận chuyển).
- Người dùng có quyền xem, sửa, xóa thông tin cá nhân bất kỳ lúc nào.

5. QUY TRÌNH ĐẶT HÀNG & THANH TOÁN:
- Thanh toán: COD (trả khi nhận hàng), VNPAY, Ví điện tử ShopHub.
- Đơn hàng PENDING → PICKUP → SHIPPING → DELIVERED.
- Khách có thể hủy đơn khi trạng thái còn PENDING hoặc PICKUP.

Khi khách hỏi về bất kỳ thông tin nào ở trên → trả lời NGAY DỰA TRÊN DỮ LIỆU NÀY, không cần gọi tool.

═══ QUY TẮC BẢO MẬT (BẮT BUỘC) ═══
1. TUYỆT ĐỐI KHÔNG tự bịa đặt thông tin. Nếu không có dữ liệu từ tool → trả lời lịch sự rằng mình không tìm thấy.
2. KHÔNG tiết lộ cấu trúc Database, tên bảng, tên cột, ID hệ thống nội bộ cho khách hàng.
3. KHÔNG truy xuất hay để lộ dữ liệu của người dùng khác.
4. KHÔNG thực thi bất kỳ lệnh SQL hay thao tác xóa/sửa dữ liệu nào ngoài các tool được phép.

═══ QUY TẮC CHỐNG BỊA ĐẶT ID (ANTI-HALLUCINATION — TỐI THƯỢNG) ═══
4a. TUYỆT ĐỐI KHÔNG BỊA ĐẶT productId, color, size hoặc bất kỳ tham số nào khi gọi addToCartAndCheckout.
4b. Tham số productId BẮT BUỘC phải là chuỗi UUID hợp lệ (ví dụ: 550e8400-e29b-41d4-a716-446655440000) lấy TRỰC TIẾP từ kết quả tool searchProducts hoặc semanticSearch (trường "id" trong mỗi sản phẩm).
4c. Nếu bạn CHƯA gọi tool tìm kiếm hoặc chưa có UUID thật từ kết quả tool → BẮT BUỘC gọi searchProducts/semanticSearch TRƯỚC để lấy UUID thực tế.
4d. TUYỆT ĐỐI KHÔNG dùng placeholder, mô tả tiếng Việt, hay bất kỳ chuỗi nào không phải UUID thật làm productId. Vi phạm điều này sẽ gây lỗi hệ thống nghiêm trọng.
4e. Nếu sau khi tìm kiếm mà không tìm thấy sản phẩm phù hợp → trả lời khách rằng không tìm thấy, KHÔNG gọi addToCartAndCheckout.

═══ QUY TẮC SỬ DỤNG TOOL (FUNCTION CALLING) ═══
5. Khi khách hỏi về đơn hàng cụ thể (mã đơn, trạng thái) → gọi getOrderStatus.
6. Khi khách hỏi phí hủy đơn → gọi getCancelPolicy.
7. Khi khách hỏi về lịch sử mua hàng, đơn hàng đã đặt (ví dụ: "tôi đã mua gì", "đơn hàng của tôi", "lịch sử mua hàng") → gọi getPurchaseHistory. Nếu khách hỏi cụ thể ("đơn tháng 4", "đơn đã giao") → truyền tham số month/year/status.
7a. Khi khách hỏi về THỐNG KÊ tổng quát ("tôi đã mua hết bao nhiêu tiền", "thống kê mua hàng", "tôi hay mua gì nhất") → gọi getPurchaseSummary. KHÔNG dùng getPurchaseHistory cho mục đích thống kê.
8. Khi khách tìm sản phẩm theo TỪ KHÓA CỤ THỂ (tên sản phẩm) → gọi searchProducts với {"keyword": "từ khóa tìm kiếm"}.
9. Backend sẽ tự động thử tìm kiếm ngữ nghĩa nếu searchProducts không ra kết quả. Bạn KHÔNG cần gọi semanticSearch.
10. Khi khách muốn KHIẾU NẠI (lỗi sản phẩm, sự cố đơn hàng, vấn đề thanh toán, vận chuyển) → gọi createComplaint.
11. Khi khách muốn MUA HÀNG / ĐẶT HÀNG / THÊM VÀO GIỎ → BẮT BUỘC thực hiện theo QUY TRÌNH 2 BƯỚC:
    BƯỚC 1: Gọi searchProducts để tìm sản phẩm và lấy UUID thật (trường "id"). Backend tự động fallback sang tìm kiếm ngữ nghĩa nếu cần.
    BƯỚC 2: SAU KHI đã có UUID thật từ kết quả tool → mới gọi addToCartAndCheckout với productId là UUID đó.
    Nếu sản phẩm có biến thể (size, màu sắc) mà khách chưa chọn → hỏi lại khách. Nếu đủ thông tin → gọi addToCartAndCheckout ngay.
    LƯU Ý: productId PHẢI là UUID lấy từ kết quả BƯỚC 1, KHÔNG được tự bịa!
12. QUAN TRỌNG: Khi gọi tool, BẮT BUỘC truyền tham số đúng tên được định nghĩa. Ví dụ searchProducts PHẢI dùng "keyword". Định dạng JSON phải hợp lệ.
13. Sau khi nhận kết quả từ tool (role: tool), BẮT BUỘC dùng kết quả đó để trả lời NGAY. KHÔNG gọi lại tool đó lần nữa!

═══ QUY TẮC HIỂN THỊ LỊCH SỬ MUA HÀNG ═══
13a. Khi hiển thị đơn hàng từ getPurchaseHistory, trình bày mỗi đơn dạng danh sách ngắn gọn:
    📦 Mã đơn: [orderId] — Trạng thái: [status] — Ngày: [orderDate] — Tổng: [totalAmount]đ
    Sản phẩm: [products]
13b. NẾU kết quả có trường "actionLink" → BẮT BUỘC hiển thị link cuối cùng:
    📋 [Bấm vào đây để xem toàn bộ lịch sử đơn hàng](/orders)
13c. Khi hiển thị thống kê từ getPurchaseSummary, trình bày rõ ràng:
    📊 Tổng số đơn: [totalOrders] | Đã hoàn thành: [totalCompleted]
    💰 Tổng tiền đã chi: [totalSpent]đ
    🏆 Sản phẩm mua nhiều nhất: [mostPurchasedProduct]
    📈 Phân bố trạng thái: [statusBreakdown]

═══ QUY TẮC HIỂN THỊ SẢN PHẨM ═══
13. CHỈ SAU KHI gọi tool tìm kiếm và có dữ liệu trả về, BẮT BUỘC trình bày MỖI sản phẩm theo đúng Markdown:

![Ảnh sản phẩm](imageUrl)
**Tên sản phẩm**
💰 Giá: [priceFormatted]đ
🛍️ [Bấm vào đây để xem chi tiết và đặt hàng](/product/{id})

14. QUAN TRỌNG VỀ GIÁ: Dùng trường "priceFormatted" (đã có sẵn dấu phân cách hàng). KHÔNG tự ý thêm bớt số 0 hay đổi giá. Nếu không có priceFormatted, dùng nguyên giá trị "price" và thêm "đ" sau cùng.
15. LỌC SẢN PHẨM: BẠN LÀ NGƯỜI QUYẾT ĐỊNH CUỐI CÙNG. Khi nhận danh sách từ tool, BẮT BUỘC đánh giá lại mức độ liên quan. Tuyệt đối loại bỏ sản phẩm lạc đề (VD: khách tìm đồ đi mưa → KHÔNG hiển thị váy hay đồ cộc tay). Chỉ hiển thị sản phẩm thật sự liên quan. Nếu không có sản phẩm nào liên quan → trả lời "Không tìm thấy sản phẩm phù hợp" và gợi ý từ khóa khác.
16. Nếu không có imageUrl → bỏ qua dòng ảnh. Nếu không có sản phẩm nào → gợi ý khách thử từ khóa khác.

═══ QUY TẮC CHỐNG ẢO GIÁC (TỐI THƯỢNG - BẮT BUỘC) ═══
17. TUYỆT ĐỐI KHÔNG BỊA ĐẶT tên sản phẩm hoặc giá tiền.
18. Bạn CHỈ ĐƯỢC PHÉP tư vấn dựa trên danh sách sản phẩm mà tool searchProducts trả về.
19. Nếu tool trả về 1 sản phẩm → CHỈ IN RA ĐÚNG 1 sản phẩm đó. Tuyệt đối không tự suy luận thêm sản phẩm khác.
20. Nếu kết quả tool trả về mảng rỗng hoặc không có sản phẩm → BẮT BUỘC trả lời: "Xin lỗi, hiện tại shop không có sản phẩm phù hợp với yêu cầu của bạn. Bạn thử tìm với từ khóa khác nhé! 😊"
21. KHÔNG được tự ý tạo ra tên sản phẩm, giá tiền, hoặc link sản phẩm không có trong dữ liệu tool trả về.

═══ PHONG CÁCH TRẢ LỜI ═══
22. Luôn trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.
23. Dùng emoji phù hợp để tạo cảm giác thân thiện (👋😊📦🔍💡).
24. Khi không hiểu yêu cầu → hỏi lại khách một cách lịch sự, không tự ý suy đoán.

═══ QUY TẮC CHỐNG VÒNG LẶP (TỐI THƯỢNG — BẮT BUỘC) ═══
25. TUYỆT ĐỐI chỉ gọi searchProducts ĐÚNG 1 LẦN DUY NHẤT cho mỗi câu hỏi của khách hàng. KHÔNG ĐƯỢC gọi lại tool tìm kiếm lần thứ 2 dù kết quả có ra hay không.
26. Sau khi nhận kết quả từ tool, BẮT BUỘC dùng kết quả đó để trả lời NGAY. KHÔNG được tự ý đổi từ khóa khác để tìm lại.
27. Nếu kết quả rỗng → trả lời "Không tìm thấy" và gợi ý từ khóa khác. KHÔNG gọi lại tool.`;

// Định nghĩa các Tool (Function Calling) chuẩn cấu trúc Groq/OpenAI
const TOOLS = [
  {
    type: "function",
    function: {
      name: "getOrderStatus",
      description:
        "Tra cứu trạng thái và chi tiết đơn hàng của khách hàng. Yêu cầu cung cấp mã đơn hàng.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "Mã đơn hàng (UUID) cần tra cứu",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCancelPolicy",
      description: "Tra cứu chính sách hủy đơn và phí hủy đơn hàng tương ứng.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "Mã đơn hàng (UUID) cần kiểm tra",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Tìm kiếm danh sách sản phẩm theo từ khóa từ người dùng.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description:
              "Từ khóa sản phẩm (ví dụ: váy, áo baby doll, bàn gaming)",
          },
        },
        required: ["keyword"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPurchaseHistory",
      description:
        "Lấy lịch sử mua hàng gần đây (tối đa 5 đơn). Hỗ trợ lọc theo tháng/năm/trạng thái. Khi khách hỏi chung chung ('tôi đã mua gì') → gọi không cần tham số. Khi khách hỏi cụ thể ('đơn tháng 4', 'đơn đã giao') → truyền tham số month/year/status. Luôn kèm actionLink '/orders' để khách xem toàn bộ.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "number",
            description: "Tháng cần lọc (1-12). Ví dụ: 4 cho tháng 4",
          },
          year: {
            type: "number",
            description: "Năm cần lọc. Ví dụ: 2025",
          },
          status: {
            type: "string",
            enum: [
              "PENDING",
              "PICKUP",
              "SHIPPING",
              "DELIVERED",
              "CANCELLED",
              "REFUNDED",
            ],
            description: "Lọc theo trạng thái đơn hàng",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPurchaseSummary",
      description:
        "Lấy thống kê TỔNG QUAN lịch sử mua hàng (tổng số đơn, tổng tiền đã chi, trạng thái phổ biến, sản phẩm mua nhiều nhất). Dùng khi khách hỏi 'tôi đã mua hết bao nhiêu tiền', 'thống kê mua hàng', 'tôi hay mua gì nhất'. Rất nhanh, không load chi tiết từng đơn.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createComplaint",
      description:
        "Tạo phiếu khiếu nại đưa vào hàng đợi xử lý. Sử dụng khi khách hàng báo cáo lỗi sản phẩm hoặc sự cố đơn hàng.",
      parameters: {
        type: "object",
        properties: {
          issueType: {
            type: "string",
            enum: [
              "ORDER_ISSUE",
              "PRODUCT_DEFECT",
              "PAYMENT_ISSUE",
              "SHIPPING_ISSUE",
              "OTHER",
            ],
          },
          orderId: {
            type: "string",
            description: "Mã đơn hàng liên quan (nếu có)",
          },
          description: {
            type: "string",
            description: "Mô tả chi tiết khiếu nại",
          },
        },
        required: ["issueType", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addToCartAndCheckout",
      description:
        "Thêm sản phẩm vào giỏ hàng và chuẩn bị chuyển sang trang thanh toán. PHẢI gọi searchProducts hoặc semanticSearch trước để lấy productId. Sử dụng khi khách muốn mua hàng, đặt hàng, thêm vào giỏ.",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description:
              "ID sản phẩm (UUID) lấy từ kết quả searchProducts hoặc semanticSearch",
          },
          quantity: {
            type: "number",
            description: "Số lượng sản phẩm muốn mua (mặc định là 1)",
          },
          size: {
            type: "string",
            description:
              "Kích thước sản phẩm (nếu có biến thể, ví dụ: S, M, L, XL)",
          },
          color: {
            type: "string",
            description:
              "Màu sắc sản phẩm (nếu có biến thể, ví dụ: Đen, Trắng, Đỏ)",
          },
        },
        required: ["productId"],
      },
    },
  },
];

/**
 * Parse arguments an toàn — xử lý trường hợp AI trả về JSON không hợp lệ.
 * Trả về object rỗng nếu parse thất bại.
 */
const safeParseArgs = (raw) => {
  if (typeof raw === "object" && raw !== null) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("[GroqAgent] JSON parse error:", e.message, "| Raw:", raw);
      return {};
    }
  }
  return {};
};

/**
 * Chuẩn hóa tên tham số — AI đôi khi dùng tên khác với định nghĩa tool.
 * Ví dụ: "query" thay vì "keyword", "search" thay vì "contextQuery".
 */
const normalizeArgs = (functionName, args) => {
  const normalized = { ...args };

  switch (functionName) {
    case "searchProducts":
      // AI có thể gửi: keyword, query, search, searchTerm, q
      if (!normalized.keyword) {
        normalized.keyword =
          normalized.query ||
          normalized.search ||
          normalized.searchTerm ||
          normalized.q ||
          normalized.text ||
          "";
      }
      break;
    case "semanticSearch":
      // AI có thể gửi: contextQuery, query, keyword, description, search
      if (!normalized.contextQuery) {
        normalized.contextQuery =
          normalized.query ||
          normalized.keyword ||
          normalized.description ||
          normalized.search ||
          normalized.text ||
          "";
      }
      break;
    case "getOrderStatus":
    case "getCancelPolicy":
      if (!normalized.orderId) {
        normalized.orderId =
          normalized.order_id || normalized.id || normalized.order || "";
      }
      break;
    case "createComplaint":
      if (!normalized.description) {
        normalized.description =
          normalized.message || normalized.detail || normalized.content || "";
      }
      break;
    case "addToCartAndCheckout":
      if (!normalized.productId) {
        normalized.productId =
          normalized.product_id || normalized.id || normalized.product || "";
      }
      if (!normalized.quantity) {
        normalized.quantity = Number(normalized.qty || normalized.amount || 1);
      }
      break;
  }

  return normalized;
};

// Hàm điều phối xử lý logic an toàn qua Repository (AI không đụng trực tiếp SQL)
const executeTool = async (functionName, rawArgs, userId) => {
  console.log(`[GroqAgent] Gọi Tool: ${functionName} | User: ${userId}`);
  try {
    // Parse & normalize arguments để tránh lỗi do AI dùng sai tên tham số
    const args = normalizeArgs(functionName, safeParseArgs(rawArgs));
    console.log(`[GroqAgent] Args:`, JSON.stringify(args));

    switch (functionName) {
      case "getOrderStatus": {
        // Bỏ dấu # ở đầu nếu AI vô tình thêm vào (VD: "#2710ef...")
        const cleanOrderId = String(args.orderId || "")
          .replace(/^#/, "")
          .trim();
        return await chatRepo.getOrderStatus(userId, cleanOrderId);
      }
      case "getCancelPolicy": {
        const cleanPolicyOrderId = String(args.orderId || "")
          .replace(/^#/, "")
          .trim();
        return await chatRepo.getCancelPolicy(userId, cleanPolicyOrderId);
      }
      case "searchProducts": {
        const keyword = args.keyword || args.query || "";
        if (!keyword.trim()) {
          return {
            results: [],
            message: "Không có từ khóa tìm kiếm. Vui lòng thử lại.",
          };
        }
        const dbResult = await chatRepo.searchProducts(keyword);
        // Fallback: nếu searchProducts không ra kết quả, tự động thử semanticSearch
        if (
          (!dbResult.results || dbResult.results.length === 0) &&
          !dbResult.error
        ) {
          console.log(
            `[GroqAgent] searchProducts rỗng cho "${keyword}" → fallback sang semanticSearch`,
          );
          try {
            const semanticResult = await vectorService.semanticSearch(keyword);
            if (semanticResult.results && semanticResult.results.length > 0) {
              return {
                ...semanticResult,
                message: `Không tìm thấy "${keyword}" chính xác, nhưng mình tìm được các sản phẩm liên quan:`,
                fallback: true,
              };
            }
          } catch (fallbackErr) {
            console.error(
              "[GroqAgent] Fallback semanticSearch lỗi:",
              fallbackErr.message,
            );
          }
        }
        return dbResult;
      }
      case "getPurchaseHistory": {
        const filterOpts = {
          month: args.month ? Number(args.month) : undefined,
          year: args.year ? Number(args.year) : undefined,
          status: args.status || undefined,
          limit: 5,
        };
        const orders = await orderRepo.getOrdersByUserFiltered(
          userId,
          filterOpts,
        );
        if (!orders || orders.length === 0) {
          let hint = "Khách hàng chưa từng mua sản phẩm nào.";
          if (filterOpts.month || filterOpts.year || filterOpts.status) {
            hint =
              "Không tìm thấy đơn hàng nào phù hợp với bộ lọc. Bạn thử lại với thời gian hoặc trạng thái khác nhé.";
          }
          return { message: hint, actionLink: "/orders" };
        }
        const history = orders.map((o) => ({
          orderId: o.id,
          status: o.order_status,
          orderDate: o.created_at,
          totalAmount: Number(o.total_amount),
          products:
            (o.items || [])
              .map((i) => i.product?.name)
              .filter(Boolean)
              .join(", ") || "Sản phẩm không xác định",
        }));
        return {
          message: `Đây là ${history.length} đơn hàng gần đây nhất của bạn.`,
          history,
          actionLink: "/orders",
        };
      }
      case "getPurchaseSummary": {
        const summary = await orderRepo.getPurchaseSummaryByUser(userId);
        return {
          message: "Đây là thống kê tổng quan lịch sử mua hàng.",
          summary,
          actionLink: "/orders",
        };
      }
      case "semanticSearch": {
        const query = args.contextQuery || args.query || args.keyword || "";
        if (!query.trim()) {
          return {
            error: "Không có từ khóa tìm kiếm ngữ nghĩa. Vui lòng thử lại.",
          };
        }
        return await vectorService.semanticSearch(query);
      }
      case "createComplaint":
        return await complaintQueue.publishComplaint({
          userId,
          issueType: args.issueType || "OTHER",
          orderId: args.orderId || null,
          description: args.description || "Không có mô tả",
          createdAt: new Date().toISOString(),
        });
      case "addToCartAndCheckout": {
        const productId = args.productId;
        const quantity = Number(args.quantity) || 1;
        const size = args.size || null;
        const color = args.color || null;

        if (!productId) {
          return {
            error: "Thiếu productId. Cần tìm sản phẩm trước khi thêm vào giỏ.",
          };
        }

        // UUID validation — block hallucinated IDs from AI
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(productId)) {
          console.error(
            `[GroqAgent] BLOCKED hallucinated productId: "${productId}"`,
          );
          return {
            error: `productId "${productId}" không phải UUID hợp lệ. Bạn PHẢI dùng UUID thật từ kết quả searchProducts/semanticSearch.`,
            blocked: true,
          };
        }

        // Return standardized action data for frontend to handle cart addition via cartAPI
        return {
          success: true,
          message: `Đã xác định sản phẩm! Đang thêm vào giỏ hàng và chuyển đến trang thanh toán.`,
          action: "REDIRECT_CHECKOUT",
          actionData: {
            productId,
            quantity,
            size,
            color,
          },
        };
      }
      default:
        return { error: `Công cụ "${functionName}" không tồn tại.` };
    }
  } catch (err) {
    console.error(`[GroqAgent] Tool execution error:`, err.message);
    return { error: `Lỗi thực thi công cụ: ${err.message}` };
  }
};

// Hàm xử lý chat chính kết nối Groq SDK
const chat = async (userId, userMessage) => {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY chưa được cấu hình trong file .env!");
  }

  const groq = new Groq({ apiKey: GROQ_API_KEY });
  const history = getHistory(userId);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  // Track if addToCartAndCheckout was called successfully
  let checkoutAction = null;

  let maxIterations = 2; // Giới hạn vòng lặp gọi hàm tránh loop vô hạn
  while (maxIterations > 0) {
    maxIterations--;

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0,
      });
    } catch (groqError) {
      console.error("[GroqAgent] Groq API error:", groqError.message);
      if (
        groqError.message &&
        (groqError.message.includes("thought process") ||
          groqError.message.includes("tool_parse") ||
          groqError.message.includes("failed"))
      ) {
        return {
          reply:
            "Hệ thống AI đang xử lý quá nhiều thông tin nên hơi bối rối. Bạn có thể tóm tắt lại từ khóa cần tìm giúp mình được không? 😊",
          conversationId: userId,
        };
      }
      return {
        reply:
          "Xin lỗi bạn, đường truyền kết nối đang gặp sự cố. Bạn vui lòng thử lại sau vài giây nhé!",
        conversationId: userId,
      };
    }

    const choice = completion.choices[0];
    if (!choice) break;

    const assistantMessage = choice.message;

    // Nếu Groq yêu cầu gọi hàm (Function Calling) để lấy dữ liệu từ Postgres
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        try {
          console.log(
            `[GroqAgent] Raw tool call:`,
            toolCall.function.name,
            toolCall.function.arguments,
          );

          // safeParseArgs xử lý cả string JSON lỗi và object
          const toolResult = await executeTool(
            toolCall.function.name,
            toolCall.function.arguments,
            userId,
          );

          // Track addToCartAndCheckout action for frontend redirect
          if (
            toolCall.function.name === "addToCartAndCheckout" &&
            toolResult &&
            toolResult.action === "REDIRECT_CHECKOUT"
          ) {
            // Support both standardized actionData wrapper and legacy flat format
            const actionPayload = toolResult.actionData || {
              productId: toolResult.productId,
              quantity: toolResult.quantity,
              size: toolResult.size,
              color: toolResult.color,
            };
            checkoutAction = {
              action: "REDIRECT_CHECKOUT",
              data: actionPayload,
            };
            console.log(
              "[GroqAgent] Checkout action captured:",
              JSON.stringify(checkoutAction),
            );
          }

          const resultStr = JSON.stringify(toolResult);
          console.log(
            `[GroqAgent] Tool result for ${toolCall.function.name}:`,
            resultStr.substring(0, 200),
          );

          if (
            toolCall.function.name === "searchProducts" ||
            toolCall.function.name === "semanticSearch"
          ) {
            console.log(
              "[Chat] Đã ngắt vòng lặp Groq! Trả kết quả thẳng về cho người dùng.",
            );

            let data;
            try {
              data =
                typeof toolResult === "string"
                  ? JSON.parse(toolResult)
                  : toolResult;
            } catch (parseErr) {
              console.error(
                "[GroqAgent] Fast path parse error:",
                parseErr.message,
              );
              data = toolResult;
            }

            if (
              data &&
              data.results &&
              Array.isArray(data.results) &&
              data.results.length > 0
            ) {
              const product = data.results[0];
              const validImageUrl = product.imageUrl
                ? product.imageUrl.startsWith("http")
                  ? product.imageUrl
                  : `http://localhost:5000${product.imageUrl}`
                : "https://via.placeholder.com/150?text=No+Image";

              const markdown = `![${product.name}](${validImageUrl})\n\n👉 **${product.name}**\n💰 Giá: ${product.priceFormatted || product.price}đ\n🛍️ [Bấm vào đây để xem chi tiết](/product/${product.id})`;

              const fastReply = `Mình tìm thấy sản phẩm này nhé:\n\n${markdown}`;
              addToHistory(userId, "user", userMessage);
              addToHistory(userId, "assistant", fastReply);
              return { reply: fastReply, conversationId: userId };
            }

            const parsedArgs = safeParseArgs(toolCall.function.arguments);
            const keyword =
              toolCall.function.name === "searchProducts"
                ? parsedArgs.keyword || ""
                : parsedArgs.contextQuery ||
                  parsedArgs.query ||
                  parsedArgs.keyword ||
                  "";

            const noResultReply = keyword
              ? `Tiếc quá, hiện tại mình không tìm thấy sản phẩm "${keyword}" nào phù hợp.`
              : `Tiếc quá, hiện tại mình không tìm thấy sản phẩm phù hợp.`;

            addToHistory(userId, "user", userMessage);
            addToHistory(userId, "assistant", noResultReply);
            return { reply: noResultReply, conversationId: userId };
          }

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: resultStr,
          });
        } catch (toolErr) {
          // Nếu 1 tool lỗi, gửi lỗi đó về cho AI thay vì crash toàn bộ
          console.error(
            `[GroqAgent] Tool ${toolCall.function.name} failed:`,
            toolErr.message,
          );
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify({
              error: `Không thể thực thi công cụ: ${toolErr.message}`,
            }),
          });
        }
      }

      // ═══ FAST PATH: searchProducts results → return directly to Frontend ═══
      const searchCall = assistantMessage.tool_calls.find(
        (tc) => tc.function.name === "searchProducts",
      );
      if (searchCall) {
        const searchResultMsg = messages.find(
          (m) => m.role === "tool" && m.tool_call_id === searchCall.id,
        );
        if (searchResultMsg) {
          try {
            const parsed = JSON.parse(searchResultMsg.content);
            if (
              parsed.results &&
              Array.isArray(parsed.results) &&
              parsed.results.length > 0
            ) {
              const cards = parsed.results
                .map((product) => {
                  const imageUrl = product.imageUrl
                    ? product.imageUrl.startsWith("http")
                      ? product.imageUrl
                      : `http://localhost:5000${product.imageUrl}`
                    : "https://via.placeholder.com/150?text=No+Image";
                  const price =
                    product.priceFormatted || product.price || "N/A";
                  const name = product.name || "Sản phẩm";
                  return `![${name}](${imageUrl})\n**${name}**\n💰 Giá: ${price}đ\n🛍️ [Xem chi tiết và đặt hàng](/product/${product.id})`;
                })
                .join("\n\n");

              const fastReply = parsed.fallback
                ? `Không tìm thấy chính xác, nhưng mình tìm được các sản phẩm liên quan:\n\n${cards}`
                : `Mình tìm thấy sản phẩm phù hợp với yêu cầu của bạn đây:\n\n${cards}`;

              addToHistory(userId, "user", userMessage);
              addToHistory(userId, "assistant", fastReply);
              return { reply: fastReply, conversationId: userId };
            }
          } catch (parseErr) {
            console.error(
              "[GroqAgent] Fast path parse error:",
              parseErr.message,
            );
          }
        }
      }
      continue; // Tiếp tục vòng lặp gửi kết quả về cho Groq phân tích
    }

    // Kết quả văn bản cuối cùng từ AI
    let replyText =
      assistantMessage.content || "Tôi chưa rõ yêu cầu, bạn hỏi lại nhé.";

    // ═══ LƯỚI BẮT TOOL TAG (Regex Parser) ═══
    // Phòng trường hợp AI nhả ra <function=...> thay vì dùng tool_calls chuẩn
    // Dùng matchAll + global flag để bắt TẤT CẢ các function tags trong cùng 1 response
    const functionTagRegex =
      /(?:<)?function=(\w+)>([\s\S]*?)(?:<\/function>|$)/gi;
    const allTagMatches = [...replyText.matchAll(functionTagRegex)];

    if (allTagMatches.length > 0 && maxIterations > 0) {
      // Thu thập kết quả từ tất cả các tool được gọi
      const allToolResults = [];

      for (const tagMatch of allTagMatches) {
        const funcName = tagMatch[1];
        let funcArgs = {};
        try {
          funcArgs = JSON.parse(tagMatch[2].trim());
        } catch (e) {
          console.error(
            "[GroqAgent] Lỗi parse args từ <function> tag:",
            e.message,
            "| Raw:",
            tagMatch[2],
          );
        }

        console.log(
          `[GroqAgent] Bắt được <function> tag: ${funcName}`,
          JSON.stringify(funcArgs),
        );

        // Thực thi tool tương ứng
        const tagToolResult = await executeTool(funcName, funcArgs, userId);
        allToolResults.push({ tool: funcName, result: tagToolResult });
      }

      // ═══ XỬ LÝ KẾT QUẢ TOOL & TẠO MARKDOWN PRODUCT CARDS ═══
      // Pre-build product cards từ kết quả tool để AI chỉ cần copy-paste
      let prebuiltMarkdown = "";

      for (const toolEntry of allToolResults) {
        const result = toolEntry.result;

        // Xử lý searchProducts / semanticSearch (có results array)
        if (
          result &&
          result.results &&
          Array.isArray(result.results) &&
          result.results.length > 0
        ) {
          const cards = result.results
            .map((product) => {
              const imageUrl = product.imageUrl
                ? product.imageUrl.startsWith("http")
                  ? product.imageUrl
                  : `http://localhost:5000${product.imageUrl}`
                : "https://via.placeholder.com/150?text=No+Image";
              const price = product.priceFormatted || product.price || "N/A";
              const name = product.name || "Sản phẩm";

              return `![${name}](${imageUrl})\n**${name}**\n💰 Giá: ${price}đ\n🛍️ [Xem chi tiết và đặt hàng](/product/${product.id})`;
            })
            .join("\n\n");

          prebuiltMarkdown += `\n\n${cards}`;
        }
      }

      // ═══ FAST PATH: Return directly to Frontend, skip 2nd AI call ═══
      if (prebuiltMarkdown) {
        const fastReply = `Mình tìm thấy sản phẩm phù hợp với yêu cầu của bạn đây:\n\n${prebuiltMarkdown}`;
        addToHistory(userId, "user", userMessage);
        addToHistory(userId, "assistant", fastReply);
        return { reply: fastReply, conversationId: userId };
      }

      // Fallback: no product cards, send back to AI for non-search tools
      messages.push({ role: "assistant", content: replyText });
      const systemContent = `KẾT QUẢ TỪ HỆ THỐNG: ${JSON.stringify(allToolResults)}.
Hãy dùng thông tin này để trả lời khách hàng bằng tiếng Việt tự nhiên, NGẮN GỌN.
TUYỆT ĐỐI KHÔNG in ra các thẻ <function>.`;
      messages.push({ role: "system", content: systemContent });

      maxIterations--; // Đếm thêm 1 iteration
      continue; // Quay lại vòng lặp để AI đọc kết quả và trả lời
    }

    // ═══ LÀM SẠCH CUỐI CÙNG ═══
    // Xóa mọi thẻ <function> còn sót lại (phòng hờ regex ở trên bị trượt)
    replyText = replyText.replace(/function=\w+>[\s\S]*/gi, "").trim();

    // Nếu sau khi xóa mà replyText rỗng → fallback
    if (!replyText) {
      replyText =
        "Mình đã xử lý yêu cầu của bạn. Bạn cần hỗ trợ gì thêm không? 😊";
    }

    addToHistory(userId, "user", userMessage);
    addToHistory(userId, "assistant", replyText);

    const result = {
      reply: replyText,
      conversationId: userId,
    };

    // Include checkout action if addToCartAndCheckout was called
    if (checkoutAction) {
      result.action = checkoutAction.action;
      result.data = checkoutAction.data;
    }

    return result;
  }
  throw new Error("AI Agent vượt quá giới hạn lượt gọi Tool liên tiếp.");
};

const resetConversation = (userId) => {
  clearHistory(userId);
  return { message: "Đã xóa lịch sử trò chuyện." };
};

module.exports = {
  chat,
  resetConversation,
};
