# AI Web Automation Suite

## Tổng quan
Bộ dự án gồm 2 phần:
- **automation-master**: Phần trung tâm quản lý, phân phối kịch bản, profile, batch jobs, thống kê và giám sát các node worker.
- **automation-worker**: Node thực thi tự động, kết nối Master, nhận lệnh và gửi trạng thái/metrics về Master.

## Kiến trúc hệ thống
```
┌──────────────┐        ┌───────────────┐        ┌──────────────┐
│  Master      │ <====> │   Worker(s)   │ <====> │ Web Browser  │
│  (API, Job   │        │   (Executor)  │        │ (Automation) │
│   Queue,     │        │               │        │              │
│   Metrics)   │        │               │        │              │
└──────────────┘        └───────────────┘        └──────────────┘
```

- **Master** lưu trữ domain → group → scenario, và quản lý các profile theo group cho từng loại automation.
- Quản lý batch jobs, phân công worker tự động cân đối tải, nhận metrics (sức khỏe, số job, thời gian, v.v).
- UI quản lý linh động, REST API đầy đủ.
- **Worker** tự động kết nối Master, nhận batch hoặc real-time job, hỗ trợ fingerprint, proxy, AI scenario (ChatGPT/Gemini), caching, tái thử, báo cáo
- Tất cả trạng thái realtime gửi về Master (metrics, heartbeat, kết quả job).

## Một số tính năng nổi bật
- Quản lý đa domain, group, scenario, profile linh hoạt.
- Batch job: tạo/lên lịch job tự động cho từng group/domain.
- AI scenario sinh động, có cache/learning; sinh kịch bản tự động sử dụng OpenAI/Gemini.
- Worker chịu lỗi tự động (auto reconnect, retry, resource monitoring).
- Proxy/Fingerprint toàn diện, hỗ trợ stealth, rotation, headless, human-like behavior.
- Metrics chi tiết cho cả Master và Worker: CPU, Mem, Success/Fail, log-job, heartbeat.
- API status, healthcheck, custom report, mở rộng dễ dàng.

## Project Structure
- automation-master: Next.js/Bun, API & UI quản lý, kết nối MongoDB hoặc Redis, cung cấp API job/scenario/profile.
- automation-worker: Node/Bun, worker phân tán, thực thi với puppeteer/stealth, nhận - trả kết quả qua REST/WebSocket.

## Hướng dẫn bắt đầu
Tham khảo từng thư mục `automation-master` & `automation-worker` với README riêng, ví dụ:
- Chạy master: cd automation-master && bun install && bun run dev
- Chạy worker: cd automation-worker && bun install && bun run dev

---

Mọi đóng góp/vấn đề xin gửi qua Issues hoặc Pull Request tại repo này.