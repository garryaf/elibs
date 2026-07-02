# Risk Register (Pre-Implementation)

Risiko apabila implementasi / coding dipaksa berjalan pada kondisi saat ini:

| ID | Kategori | Risiko | Dampak | Probabilitas | Tingkat Risiko | Strategi Mitigasi |
|---|---|---|---|---|---|---|
| **RI-01** | UI/UX | Frontend Engineer membuat desain secara ad-hoc tanpa UI mockup, menyebabkan tampilan tidak konsisten dan UX buruk. | Sangat Tinggi | Sangat Tinggi | **CRITICAL** | Wajib selesaikan Tahap 3 (UIUX) sebelum frontend coding dimulai. |
| **RI-02** | Database | Kolom-kolom krusial atau struktur tabel relasional salah desain di tengah jalan, mengakibatkan migrasi database yang mahal. | Sangat Tinggi | Tinggi | **CRITICAL** | Wajib buat ERD, Physical/Logical model (Tahap 4) sebelum set up Prisma. |
| **RI-03** | API | Terjadi miskomunikasi antara Frontend dan Backend mengenai format data (JSON response/request payload). | Tinggi | Sangat Tinggi | **HIGH** | Wajib buat OpenAPI/Swagger spec (Tahap 7) terlebih dahulu (API First Design). |
| **RI-04** | Bisnis | Logic flow (seperti diskon billing, approval dokter) tidak terimplementasi sesuai *edge case* karena ketiadaan Activity/State Diagram di SRS. | Tinggi | Tinggi | **HIGH** | Wajib selesaikan SRS (Tahap 2) dengan diagram UML lengkap. |
| **RI-05** | Testing | QA/Tester tidak memiliki baseline pengujian karena skenario UAT belum didefinisikan. | Tinggi | Sangat Tinggi | **HIGH** | Siapkan test plan di awal. |
