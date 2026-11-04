# VEOLIA CABINET: FAYL VA RASM YUKLASH JARAYONINING BOSQICHMA-BOSQICH (STEP-BY-STEP) TO‘LIQ TEXNIK YO‘RIQNOMASI

> **Mavzu:** Frontendda rasm/hujjat tanlanishidan to fayl serveri va ma’lumotlar bazasida (DB) saqlanguncha bo‘lgan to‘liq jarayon  
> **Loyiha:** Veolia Cabinet Frontend (`veolia-cabinet`)  
> **Modullar:** `Obxod` (`/bypass`), `Mening topshiriqlarim`, `file-upload-field`, `ApiService`  
> **Til:** O‘zbek tili (Lotin alifbosida)  
> **Hujjat turi:** Arxitektura tahlili va ishlab chiquvchilar/foydalanuvchilar uchun qo‘llanma  

---

## MUNDARIJA

1. [Umumiy arxitektura va oqim diagrammasi (Flowchart)](#1-umumiy-arxitektura-va-oqim-diagrammasi)
2. [1-QADAM: Frontendda foydalanuvchi harakati va faylni tanlash](#2-1-qadam-frontendda-foydalanuvchi-harakati-va-faylni-tanlash)
3. [2-QADAM: Klient darajasidagi qat’iy validatsiya (Tekshirishlar)](#3-2-qadam-klient-darajasidagi-qatiy-validatsiya)
4. [3-QADAM: Mahalliy ko‘rik (Instant Local Preview — ObjectURL)](#4-3-qadam-mahalliy-korik-instant-local-preview)
5. [4-QADAM: Multipart/FormData shakllantirish va HTTP Interceptor](#5-4-qadam-multipartformdata-shakllantirish-va-http-interceptor)
6. [5-QADAM: Fayl saqlash serveriga yuklash (Storage Server / MinIO)](#6-5-qadam-fayl-saqlash-serveriga-yuklash)
7. [6-QADAM: Frontendda javobni qayta ishlash va Media Metadata shakllantirish](#7-6-qadam-frontendda-javobni-qayta-ishlash-va-media-metadata-shakllantirish)
8. [7-QADAM: Asosiy biznes-natija va geolokatsiya bilan birga yuborish](#8-7-qadam-asosiy-biznes-natija-va-geolokatsiya-bilan-birga-yuborish)
9. [8-QADAM: Backendda biznes-qoidalar va Ma’lumotlar bazasiga (DB) saqlash](#9-8-qadam-backendda-biznes-qoidalar-va-malumotlar-bazasiga-saqlash)
10. [9-QADAM: Foydalanuvchi interfeysida ko‘rsatish va monitoring (Tarix va Drayver)](#10-9-qadam-foydalanuvchi-interfeysida-korsatish-va-monitoring)
11. [Xavfsizlik choralari va xatoliklarni bartaraf etish (Troubleshooting)](#11-xavfsizlik-choralari-va-xatoliklarni-bartaraf-etish)

---

## 1. UMUMIY ARXITEKTURA VA OQIM DIAGRAMMASI

Tizimda fayllar (fotosuratlar, dalolatnomalar, to‘lov cheklari va h.k.) to‘g‘ridan-to‘g‘ri ma’lumotlar bazasiga (BLOB formatida) emas, balki **ikki bosqichli zamonaviy arxitektura** orqali yuklanadi:
1. **1-bosqich:** Jismoniy fayl (Binary/Multipart) maxsus Fayl Saqlash Serveriga (`File Server / MinIO`) yuklanadi va undan noyob URL havola olinadi.
2. **2-bosqich:** Olingan URL havola va metama’lumotlar biznes-obyekt (Amal natijasi, plomba raqami, GPS koordinatalari) bilan birga Backend API orqali Relyatsion Ma’lumotlar Bazasiga (`PostgreSQL / Oracle`) yoziladi.

### Jarayonning to‘liq ketma-ketlik diagrammasi:

```mermaid
sequenceDiagram
    autonumber
    actor User as Foydalanuvchi (Inspektor)
    participant UI as Brauzer / UI Form (Angular)
    participant Interceptor as HttpRequestInterceptor
    participant FileServer as Fayl Serveri (MinIO / S3)
    participant Backend as Backend API Gateway
    participant DB as Ma'lumotlar Bazasi (DB)

    User->>UI: Rasmga oladi yoki fayl tanlaydi (Kamera/Galereya)
    UI->>UI: Validatsiya: format (.jpg/.png), hajm (<=5MB), limit (<=20)
    UI->>UI: Prevyu generatsiya (URL.createObjectURL)
    User->>UI: "Saqlash" tugmasini bosadi
    
    rect rgb(240, 248, 255)
    note right of UI: 1-Faza: Jismoniy faylni yuklash
    UI->>Interceptor: POST /file/upload (FormData: files, source)
    Interceptor->>FileServer: Bearer Token bilan uzatish (Shifrlanmasdan)
    FileServer->>FileServer: Hash/UUID generatsiya, diskka/bucketga saqlash
    FileServer-->>UI: JSON javob: { originalFileName, savedFileName, url, fileSize }
    end

    rect rgb(245, 255, 245)
    note right of UI: 2-Faza: Biznes natija va metama'lumotlarni saqlash
    UI->>UI: GPS Geolokatsiyani olish (lat, lng, accuracy)
    UI->>UI: Media metadata massivini yig'ish (type, url, name, size)
    UI->>Interceptor: POST /bypass/inspector/actions/result (JSON Payload)
    Interceptor->>Backend: Authorization va Payload uzatish
    Backend->>Backend: Biznes qoidalarni tekshirish (bypassResultRules)
    Backend->>DB: Tranzaksiya: action holatini yangilash va media yozuvlarini INSERT qilish
    DB-->>Backend: OK (Yozuvlar saqlandi)
    Backend-->>UI: { code: 0, msg: "Success" }
    end

    UI->>User: "Muvaffaqiyatli saqlandi" xabarnomasi va ro'yxat yangilanishi
```

---

## 2. 1-QADAM: FRONTENDDA FOYDALANUVCHI HARAKATI VA FAYLNI TANLASH

Foydalanuvchi (ko‘pincha joylardagi inspektor) xonadonga borganda natijani kiritish tugmasini bosadi.

1. **HTML Fayl tanlash komponenti:**
   Interfeysda yashirin yoki maxsus dizayndagi `<input type="file">` elementi ishlaydi:
   ```html
   <!-- Ko'p rasmli tanlov (Fotosuratlar uchun) -->
   <input
     type="file"
     #photoInput
     [accept]="photoAccept"
     (change)="selectPhotos($event)"
     multiple
     class="d-none"
   />

   <!-- Alohida fayllar (Akt, Video, To'lov kvitansiyasi uchun) -->
   <input
     type="file"
     [accept]="field.accept"
     (change)="selectFile($event, field)"
   />
   ```
2. **Qurilma imkoniyatlari:**
   - Agar inspektor planshet yoki mobil qurilmadan kirgan bo‘lsa, tizim bevosita **qurilma kamerasini** ochishni taklif qiladi.
   - Foydalanuvchi hisoblagich, o‘rnatilgan plomba yoki tuzilgan qog‘oz dalolatnomaning (akt) suratini oladi.

---

## 3. 2-QADAM: KLIENT DARAJASIDAGI QAT’IY VALIDATSIYA

Fayl tanlanishi bilan frontend uni serverga yuborishdan oldin brauzer xotirasida chuqur tekshiradi (`action-result-dialog.component.ts` dagi `appendResultPhotos` funksiyasi):

```typescript
function appendResultPhotos(current: File[], incoming: File[]): { photos: File[]; error: string } {
  const photos = [...current];
  for (const file of incoming) {
    // 1. Format tekshiruvi: faqat JPG, JPEG, PNG
    if (!/\.(jpe?g|png)$/i.test(file.name) || (file.type && !['image/jpeg', 'image/png'].includes(file.type))) {
      return { photos: current, error: 'mib.my_tasks.media.photo_invalid' };
    }
    // 2. Fayl hajmi tekshiruvi: 5 Megabaytdan oshmasligi kerak
    if (file.size > 5 * 1024 * 1024) {
      return { photos: current, error: 'mib.my_tasks.media.photo_size_error' };
    }
    // 3. Dublikatlarni oldini olish (bir xil faylni qayta qo'shmaslik)
    if (!photos.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
      photos.push(file);
    }
  }
  // 4. Jami fayllar soni limiti: ko'pi bilan 20 ta rasm
  return photos.length > RESULT_PHOTO_LIMIT
    ? { photos: current, error: 'mib.my_tasks.media.photo_limit_error' }
    : { photos, error: '' };
}
```

### Validatsiya qoidalari xulosasi:
- **Format:** Fotosuratlar uchun `.jpg`, `.jpeg`, `.png`; akt va kvitansiyalar uchun `.pdf`, `.jpg`, `.png`; video uchun `.mp4`.
- **Hajm:** Har bir rasm uchun maksimal **5 MB** (boshqa tizim hujjatlarida 10 MB gacha).
- **Maksimal soni:** Bitta amalda jami **20 tagacha** fayl.
- Agar shart bajarilmasa, forma bloklanadi va foydalanuvchiga qizil ogohlantirish xabari ko‘rsatiladi.

---

## 4. 3-QADAM: MAHALLIY KO‘RIK (INSTANT LOCAL PREVIEW)

Fayl serverga hali ketmasidanoq, foydalanuvchi o‘zi olgan suratni ekranda darhol ko‘rishi kerak:

1. Frontend brauzer API ning `URL.createObjectURL(file)` mexanizmidan foydalanadi:
   ```typescript
   // Har bir fayl uchun xotirada virtual blob-havola ochiladi
   if (!this.photoPreviews.has(photo)) {
     this.photoPreviews.set(photo, URL.createObjectURL(photo));
   }
   ```
2. Shunda rasm yuklanishini kutmasdan darhol `<img [src]="getPhotoPreview(photo)">` orqali galereyada miniatyura (thumbnail) ko‘rsatiladi.
3. **Xotira boshqaruvi (Memory Leak Prevention):** Rasm o‘chirilganda yoki dialog yopilganda `URL.revokeObjectURL(url)` chaqirilib, operativ xotira (RAM) tozalanadi.

---

## 5. 4-QADAM: MULTIPART/FORMDATA VA HTTP INTERCEPTOR

Foydalanuvchi "Saqlash" tugmasini bosganda, binar fayllarni tarmoq orqali uzatish jarayoni boshlanadi.

### 5.1. FormData yig‘ish
Fayllar oddiy JSON orqali yuborilmaydi, balki `multipart/form-data` konteyneriga joylanadi:
```typescript
const formData = new FormData();
formData.append('files', item.file, item.file.name);
formData.append('source', !environment.production ? 'dev_veolia_cabinet' : 'veolia_cabinet');
```

### 5.2. HTTP Interceptor va Shifrlash istisnosi (Critical Invariant)
Loyiha arxitekturasida `HttpRequestInterceptor` (`src/app/guard/http-request.interceptor.ts`) mavjud:
- Tizimda iste’molchi va kadastr yo‘llari (`/consumer`, `/cadastre`, `/justice`) xavfsizlik maqsadida **AES-256 bilan shifrlanadi**.
- **Lekin Fayl yuklash yo‘li (`/file/upload`) SHIFRLANMAYDI!** Chunki binar oqimni matnga shifrlash faylning buzilishiga olib keladi.
- Interceptor so‘rovga faqat avtorizatsiya sarlavhasini biriktiradi:
  ```http
  POST /file/upload HTTP/1.1
  Host: api.veoliaenergy.uz:19002
  Authorization: Bearer eyJhbGciOiJSUzI1NiIs... (JWT Token)
  Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXyZ123
  ```

---

## 6. 5-QADAM: FAYL SAQLASH SERVERIGA YUKLASH (MINIO / S3)

So‘rov Fayl Serveriga (`environment.fileUrl = 'https://api.veoliaenergy.uz:19002'`) yetib borgach, quyidagi amallar bajariladi:

1. **Autentifikatsiya:** Token orqali foydalanuvchining fayl yuklash huquqi tasdiqlanadi.
2. **Virus/Xavfsizlik skaneri:** Kelgan fayl kengaytmasi va binar sarlavhasi (magic bytes) tekshiriladi.
3. **Noyob fayl nomi (UUID/Hash):** Fayl nomlari to‘qnash kelmasligi uchun unga serverda noyob nom beriladi (masalan: `a5f2e8c1-7b3d-4c8e-9f0a-1b2c3d4e5f6a.jpg`).
4. **Fizik diskka/Bucketga yozish:** Fayl MinIO / S3 obyektlar omboridagi tegishli manzilga joylanadi:
   `s3://veolia_cabinet/2026/10/23/a5f2e8c1-7b3d-4c8e-9f0a-1b2c3d4e5f6a.jpg`
5. **Server javobi (Response):**
   Fayl serveri frontendga muvaffaqiyatli `200 OK` javobini va fayl parametrlarini qaytaradi:
   ```json
   {
     "code": 0,
     "file_details": [
       {
         "id": 892341,
         "originalFileName": "hisoblagich_plombasi.jpg",
         "savedFileName": "a5f2e8c1-7b3d-4c8e-9f0a-1b2c3d4e5f6a.jpg",
         "url": "https://api.veoliaenergy.uz:19002/files/veolia_cabinet/a5f2e8c1-7b3d-4c8e-9f0a-1b2c3d4e5f6a.jpg",
         "fileSize": 184520,
         "mimeType": "image/jpeg"
       }
     ]
   }
   ```

---

## 7. 6-QADAM: FRONTENDDA MEDIA METADATA SHAKLLANTIRISH

Fayl jismonan saqlanib, uning doimiy URL havolasi olingandan so‘ng, frontend biznes-obyekt uchun `media` massivini hosil qiladi (`my-task-detail.component.ts`):

```typescript
// Server qaytargan javobdan URL va metadatalar ajratib olinadi
const uploadedFile = this.getUploadedFileDetails(resp);
const fileUrl = this.getUploadedFileUrl(uploadedFile);

media.push({
  type: this.mapMediaType(item.controlName), // 'PHOTO', 'ACT', 'VIDEO', 'RECEIPT'
  url: fileUrl,                              // Fayl serveridagi to'liq havola
  fileName: uploadedFile?.originalFileName || item.file.name,
  mimeType: uploadedFile?.mimeType || item.file.type,
  fileSize: uploadedFile?.fileSize || item.file.size,
});
```

> **E’tibor bering:** Shu daqiqadan boshlab og‘ir binar fayl bilan ishlash tugaydi. Backendga endi faqat uning yengil URL manzili va parametrlari yuboriladi!

---

## 8. 7-QADAM: BIZNES-NATIJA VA GEOLOKATSIYA BILAN BIRGA YUBORISH

Endi amaldagi barcha ma’lumotlar yagona paketga jamlanadi:

1. **Geolokatsiya aniqlanadi:** Brauzer `navigator.geolocation.getCurrentPosition` orqali joyning aniq koordinatalarini oladi (`latitude`, `longitude`, `accuracy`).
2. **Yakuniy JSON Payload shakllantiriladi:**
   ```json
   POST /bypass/inspector/actions/result
   {
     "actionId": 54210,
     "resultStatus": "DISCONNECTED_AND_SEALED",
     "comment": "Issiq suv o'chirildi va plomba o'rnatildi",
     "sealNumber": "UZ-8849201",
     "disconnectionReason": "DEBT",
     "latitude": 41.311081,
     "longitude": 69.240562,
     "accuracy": 12.5,
     "media": [
       {
         "type": "PHOTO",
         "url": "https://api.veoliaenergy.uz:19002/files/veolia_cabinet/a5f2e8c1-7b3d-4c8e-9f0a-1b2c3d4e5f6a.jpg",
         "fileName": "hisoblagich_plombasi.jpg",
         "mimeType": "image/jpeg",
         "fileSize": 184520
       },
       {
         "type": "ACT",
         "url": "https://api.veoliaenergy.uz:19002/files/veolia_cabinet/f93b1e22-8c4a-412e-8a1d-2c3b4a5e6f7d.pdf",
         "fileName": "dalolatnoma_№124.pdf",
         "mimeType": "application/pdf",
         "fileSize": 412900
       }
     ]
   }
   ```
3. Ushbu so‘rov Backend API ga (`/bypass/inspector/actions/result`) jo‘natiladi.

---

## 9. 8-QADAM: BACKENDDA MA’LUMOTLAR BAZASIGA (DB) SAQLASH

Backend ushbu so‘rovni qabul qilganda ma’lumotlar bazasida relyatsion yaxlitlikni ta’minlovchi **tranzaksiya (DB Transaction)** ochadi:

1. **Biznes qoidalar tekshiruvi:**
   - Masalan, agar `DISCONNECTED_AND_SEALED` tanlangan bo‘lsa-yu, `media` massivida `PHOTO` yoki `ACT` bo‘lmasa, yoki `sealNumber` bo‘sh bo‘lsa, backend tranzaksiyani to‘xtatadi va xato qaytaradi.
2. **1-Jadval: Asosiy amal yangilanadi (`bypass_actions`):**
   ```sql
   UPDATE bypass_actions
   SET 
       status = 'COMPLETED',
       result_status = 'DISCONNECTED_AND_SEALED',
       seal_number = 'UZ-8849201',
       disconnection_reason = 'DEBT',
       latitude = 41.311081,
       longitude = 69.240562,
       accuracy = 12.5,
       completed_at = NOW(),
       updated_at = NOW()
   WHERE id = 54210;
   ```
3. **2-Jadval: Media fayllar kiritiladi (`bypass_action_media`):**
   Har bir fayl uchun alohida yozuv yaratilib, `action_id` bilan bog‘lanadi:
   ```sql
   INSERT INTO bypass_action_media 
   (action_id, media_type, file_url, file_name, file_size, mime_type, created_at)
   VALUES 
   (54210, 'PHOTO', 'https://api.veoliaenergy.uz:19002/files/veolia_cabinet/a5f2e8c1-7b3d-4c8e-9f0a-1b2c3d4e5f6a.jpg', 'hisoblagich_plombasi.jpg', 184520, 'image/jpeg', NOW()),
   (54210, 'ACT', 'https://api.veoliaenergy.uz:19002/files/veolia_cabinet/f93b1e22-8c4a-412e-8a1d-2c3b4a5e6f7d.pdf', 'dalolatnoma_№124.pdf', 412900, 'application/pdf', NOW());
   ```
4. **Billing/Tizim yangilanishi:** Agar natija qarz to‘lanishi yoki hisoblagich uzilishi bo‘lsa, iste’molchi balans hisobiga tegishli bayroqlar (flag) qo‘yiladi.
5. **Tranzaksiya muvaffaqiyatli yakunlanadi (COMMIT).**
6. Frontendga `{ code: 0, msg: "Success" }` xabari qaytadi.

---

## 10. 9-QADAM: FOYDALANUVCHI INTERFEYSIDA KO‘RSATISH VA MONITORING

Tranzaksiya tugagach:
1. **Inspektor ekranida:** Manzil kartochkasi yashil rangga kiradi, topshiriq progressi (masalan, `12/30` dan `13/30` ga) oshadi.
2. **Operator ekranida:**
   - **"Obxodlar tarixi"** (`/bypass/history`) yoki **"Topshiriq tafsilotlari"** bo‘limida o‘sha iste’molchi amali tanlanganda o‘ng tomondan drayver (yon panel) ochiladi.
   - Drayver bazadagi `file_url` orqali fotosuratlarni, aktlarni va to‘lov cheklarini ko‘rsatadi.
   - Operator rasm ustiga bosganda, rasm to‘liq hajmda yangi oynada ochiladi yoki kattalashtirib ko‘rsatiladi.

---

## 11. XAVFSIZLIK CHORALARI VA XATOLIKLARNI BARTARAF ETISH (TROUBLESHOOTING)

| Mumkin bo‘lgan muammo | Sababi | Qanday hal qilinadi? |
|---|---|---|
| **"Fayl formati noto‘g‘ri" (photo_invalid)** | Foydalanuvchi `.bmp`, `.heic` yoki noma’lum format yukladi. | Faqat `.jpg`, `.jpeg` yoki `.png` formatdagi fayllarni yuklash lozim. |
| **"Fayl hajmi juda katta" (photo_size_error)** | Surat hajmi 5 MB dan oshgan. | Kamera sozlamalarida surat sifatini optimallashtirish yoki o‘lchamini kichraytirish kerak. |
| **"Fayllar soni ko‘p" (photo_limit_error)** | 20 tadan ortiq rasm yuklanmoqda. | Faqat eng muhim dalil suratlari (hisoblagich, plomba, akt) tanlanishi kerak. |
| **"Fayl yuklashda xatolik" (file_upload_failed)** | Fayl serveri (`:19002`) bilan aloqa yo‘q yoki tarmoq sekin. | Internet aloqasi tekshiriladi, tizim xatolik haqida xabar beradi va qayta yuborish imkonini saqlab qoladi. |
| **"Kamera ochilmadi / Ruxsat berilmadi"** | Brauzerda kamera yoki geolokatsiyaga ruxsat berilmagan. | Brauzer sozlamalaridan `Kamera` va `Joylashuv (Location)` ruxsatlarini yoqish kerak (`StartBypassDialogComponent`). |

---

## 12. XULOSA
Veolia Cabinet tizimida fayllarni yuklash jarayoni **foydalanuvchi qulayligi** va **tizim barqarorligini** ta’minlashga qaratilgan:
- Brauzerda tezkor lokal prevyu (foydalanuvchi kutib qolmaydi);
- MinIO orqali og‘ir binar oqimlarni alohida serverga chiqarish (asosiy backend yuklamasini kamaytiradi);
- Ma’lumotlar bazasida faqat URL va metadatalarni saqlash (baza hajmini yengil va tezkor saqlaydi);
- Qat’iy biznes-qoidalar asosida nazorat (soxta yoki chala hisobotlarning oldini oladi).
