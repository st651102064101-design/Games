# SURVIVAL HUB — แก้ /api/stats 404 (Netlify)

## สาเหตุ
ในภาพ DevTools หน้า `https://capable-gumption-c3b028.netlify.app/survival_hub_same_folder_6_games` เรียก `GET /api/stats` แล้วได้ 404 เพราะ Deployment นั้นยังไม่มี Netlify Function `stats` หรือ deploy จากไฟล์ HTML แบบ static

## สิ่งที่แก้แล้วใน GitHub
- `netlify/functions/stats.mjs`: GET/POST `/api/stats` สำหรับ 7 เกม
- `netlify.toml`: กำหนด Functions, Rewrite และ Publish Directory `dist`
- `package.json`: ติดตั้ง `@netlify/blobs` และสั่ง Build
- `scripts/build.mjs`: คัดลอกไฟล์เกมกับหน้าเลือกเกมลง `dist` โดยไม่เผยแพร่ซอร์ส Functions
- `index.html` และ `Survival_Hub_Same_Folder_6_Games.html`: แสดงยอดกดเล่นไม่ซ้ำเมื่อไม่มี tracker, ลดการเรียก API ซ้ำเมื่อเกิดข้อผิดพลาด

## ขั้นตอน Deploy ให้เว็บไซต์เดิมใช้งานได้
1. Netlify > เปิด **โปรเจกต์เดิม** `capable-gumption-c3b028`.
2. ไปที่ **Project configuration > Build & deploy > Continuous deployment** แล้วเชื่อม GitHub repository `st651102064101-design/Games` branch `main` (ถ้าเชื่อมอยู่แล้ว ให้ Trigger deploy ใหม่).
3. ตั้ง Base directory เป็นราก Repository, Build command เป็น `npm run build`, Publish directory เป็น `dist`, Functions directory เป็น `netlify/functions` (ค่าใน `netlify.toml` จะใช้แทนเมื่อเชื่อม Repository และ Netlify อ่านไฟล์).
4. รอให้ Production deploy สำเร็จ และดูว่ามี Function ชื่อ `stats` ใน Netlify > Logs / Functions.
5. เปิด `https://capable-gumption-c3b028.netlify.app/api/stats`. ต้องได้ JSON ที่มี `games`, `totalLaunches` และข้อมูล 7 เกม ไม่ใช่ HTML หรือ 404
6. เข้า `https://capable-gumption-c3b028.netlify.app/`, กดเกมหนึ่งครั้ง กลับมาแล้วรีเฟรชสถิติ ยอด `launches` ของเกมนั้นควรเพิ่ม

**อย่าใช้ Netlify Drop หรือ Manual drag-and-drop ของไฟล์ HTML/ZIP แบบ static เท่านั้น** เพราะ Netlify Functions ต้องได้รับการ Build/Deploy ผ่าน Git integration หรือ Netlify CLI.

## ความหมายของตัวเลข
- `launches`: จำนวนกดเล่นจากหน้า HUB รวมทุกครั้ง
- `browsers`: เบราว์เซอร์ที่กดเล่นจากหน้า HUB แบบไม่ซ้ำต่อเกม (ประมาณ)
- `visits`/`visitors`: จำนวนเปิดหน้าเกมจริง ต้องติด tracker ในเกม
- `plays`/`players`: จำนวนเริ่มเล่นภายในเกม ต้องเชื่อม tracker กับปุ่ม Start
- ไม่ใช่ยอดผู้เล่นออนไลน์แบบเรียลไทม์ และไม่รวมผู้เข้าเกมโดยตรงหากยังไม่ติด tracker

ข้อมูลเก็บบน Netlify Blobs ใน store `survival-hub-metrics` ของ Netlify Site ที่ deploy. หากสร้าง Site ใหม่ ยอดเก่า **ไม่ย้ายตาม**; ต้อง Deploy ลง Site เดิมเพื่อคง storage.

## การแก้ข้อผิดพลาด
- `404 /api/stats`: Functions ยังไม่ถูก deploy หรือกำหนด Build/Publish ผิด
- `503 STORAGE_ERROR`: Function ทำงานแล้วแต่ Blobs มีปัญหา ตรวจ Logs ของ Function และ dependency
- `200 JSON` แต่ยอด `0`: เริ่มเก็บข้อมูลหลังระบบใช้งาน หรือ Netlify Site ใหม่มี store ว่าง
- หาก Site เดิมอยู่บนระบบจัดการ Deployment อื่นที่ไม่ได้เชื่อม Repository นี้ การ Push ไป GitHub **ยังไม่อัปเดต Site นั้น** ต้องเชื่อมหรือ Deploy จาก Repository นี้ให้ถูก Site ก่อน

เอกสาร Netlify: https://docs.netlify.com/build/functions/configuration/ และ https://docs.netlify.com/build/data-and-storage/netlify-blobs/
