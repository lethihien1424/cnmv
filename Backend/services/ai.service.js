const { Category } = require("../models");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Phân tích chuỗi tìm kiếm tự nhiên của người dùng thành các tham số filter
 * Trả về: { keyword: string, minPrice: number, maxPrice: number, category_id: string }
 */
const parseSearchQuery = async (query) => {
  if (!GEMINI_API_KEY) {
    return null; // Không có key thì fallback về search thường
  }

  try {
    // Lấy danh sách danh mục để AI có thể map chính xác
    const categories = await Category.findAll({ attributes: ["id", "name"] });
    const categoryListStr = categories.map(c => `ID: ${c.id} - Tên: ${c.name}`).join("\n");

    const prompt = `
Bạn là AI hỗ trợ tìm kiếm sản phẩm cho sàn thương mại điện tử.
Dưới đây là danh sách các danh mục có sẵn trên hệ thống:
${categoryListStr}

Phân tích câu tìm kiếm của người dùng và trích xuất các thông tin sau:
- "keyword": Từ khóa cốt lõi của sản phẩm (ví dụ: "điện thoại", "laptop asus"). Nếu không có, để rỗng "".
- "minPrice": Giá thấp nhất (VND) mà người dùng muốn. Nếu không có, trả về null. (ví dụ "trên 10 triệu" -> 10000000)
- "maxPrice": Giá cao nhất (VND) mà người dùng muốn. Nếu không có, trả về null. (ví dụ "dưới 5 triệu" -> 5000000)
- "category_id": ID danh mục phù hợp nhất từ danh sách trên. Nếu không tìm thấy hoặc không khớp rõ ràng, trả về null.

Câu tìm kiếm của người dùng: "${query}"

YÊU CẦU: CHỈ trả về duy nhất 1 chuỗi JSON thuần túy (không bọc trong markdown \`\`\`json).
Ví dụ: {"keyword": "điện thoại samsung", "minPrice": null, "maxPrice": 10000000, "category_id": "uuid-here"}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
        }
      })
    });

    if (!response.ok) {
      console.error("Gemini API Error:", await response.text());
      return null;
    }

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Loại bỏ markdown nếu AI lỡ sinh ra
    const cleanedJsonStr = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(cleanedJsonStr);
  } catch (err) {
    console.error("AI Parse Error:", err.message);
    return null;
  }
};

module.exports = {
  parseSearchQuery,
};
