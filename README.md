# Affinity Batch Exporter

Affinity Batch Exporter adalah script untuk mengekspor banyak dokumen `.af`
sekaligus menggunakan preset export yang tersedia di Affinity.

Script berjalan langsung di dalam Affinity 3.3.3 atau versi lebih baru. Tidak
diperlukan aplikasi tambahan atau instalasi Node.js untuk menggunakannya.

## Fitur

- Mengekspor semua file `.af` dalam satu folder.
- Memproses subfolder bila diperlukan.
- Menggunakan satu atau beberapa preset dalam sekali proses.
- Menentukan folder output yang berbeda dari folder sumber.
- Menyaring file berdasarkan sebagian nama.
- Menambahkan suffix pada nama file hasil.
- Melewati atau menimpa file hasil yang sudah ada.
- Mengingat preset yang terakhir dipilih.
- Membuat laporan untuk setiap proses export.

## Persyaratan

Sebelum mulai, siapkan:

1. Affinity versi 3.3.3 atau lebih baru.
2. File `affinity-batch-exporter 3.0.0.js` dari repositori ini.
3. Satu folder yang berisi dokumen `.af`.
4. Folder output yang sudah dibuat.

Contoh folder:

```text
E:\Desain\
├── poster.af
├── brosur.af
└── Klien A\
    └── logo.af

E:\Hasil\
```

## 1. Mengaktifkan scripting dan akses folder

Affinity melindungi file komputer dari akses script yang tidak diizinkan.
Karena itu, folder sumber dan folder output harus didaftarkan terlebih dahulu.

1. Buka Affinity.
2. Buka **Settings > Scripting**.
3. Aktifkan scripting.
4. Aktifkan **File System Access**.
5. Tambahkan folder yang berisi file `.af` ke daftar folder yang diizinkan.
6. Tambahkan folder output ke daftar yang sama.

Contoh folder yang perlu ditambahkan:

```text
E:\Desain
E:\Hasil
```

Jika folder sumber dan output sama, cukup tambahkan folder tersebut satu kali.

## 2. Memasang script

1. Buka **Window > Scripts > Script Editor**.
2. Pilih **New Script**.
3. Buka `affinity-batch-exporter 3.0.0.js` menggunakan editor teks seperti
   Notepad.
4. Salin seluruh isinya.
5. Tempelkan ke Script Editor di Affinity.
6. Jalankan script sekali untuk memastikan tidak ada kesalahan.
7. Pilih **Save As**.
8. Simpan dengan nama **Affinity Batch Exporter** agar mudah ditemukan di
   Scripts Library.

Setelah tersimpan, script dapat dijalankan dari
**Window > Scripts > Scripts Library** tanpa menyalin kode lagi.

## 3. Menjalankan batch export

### Memilih folder sumber

1. Jalankan **Affinity Batch Exporter** dari Scripts Library.
2. Masukkan path folder yang berisi file `.af`.

Contoh:

```text
E:\Desain
```

Jika ada dokumen yang sedang terbuka, script memakai lokasi dokumen tersebut
sebagai nilai awal. Anda tetap dapat menggantinya.

### Mengatur opsi export

Dialog **Opsi Batch Export** menyediakan pengaturan berikut:

- **Folder output** menentukan lokasi penyimpanan file hasil. Folder harus
  sudah dibuat dan diizinkan melalui Settings.
- **Filter nama** hanya memproses file yang namanya mengandung teks tersebut.
  Kosongkan opsi ini untuk memproses semua file.
- **Suffix nama** menambahkan teks di belakang nama file sebelum ekstensi.
- **Proses subfolder** mencari file `.af` di folder sumber dan seluruh folder
  di bawahnya.
- **Timpa file yang sudah ada** mengizinkan Affinity mengganti file hasil
  dengan nama yang sama. Jika tidak dicentang, file tersebut dilewati.

Contoh filter:

```text
poster
```

Filter tersebut cocok dengan `poster.af`, `Poster A3.af`, dan
`poster-final.af`. Huruf besar dan kecil tidak dibedakan.

Contoh suffix:

```text
-cetak
```

`poster.af` akan menghasilkan nama seperti `poster-cetak.pdf`.

### Memilih preset dan format

1. Pilih preset dari dropdown **Pilih Preset Export**.
2. Tekan **OK**.
3. Periksa ekstensi yang disarankan, misalnya `pdf`, `png`, atau `jpg`.
4. Koreksi ekstensi jika diperlukan, lalu tekan **OK**.
5. Saat ditanya apakah ingin menambahkan format lain:
   - Pilih **Yes** untuk memilih preset tambahan.
   - Pilih **No** untuk melanjutkan export.

Setiap format harus memakai ekstensi yang berbeda agar hasilnya tidak saling menimpa.

### Memeriksa konfirmasi akhir

Sebelum memulai, script menampilkan:

- Jumlah file `.af` yang ditemukan.
- Daftar preset dan ekstensi.
- Folder output.
- Status pemrosesan subfolder.
- Kebijakan file lama.
- Filter nama dan suffix.

Pilih **Yes** untuk memulai atau **No** untuk membatalkan. Dokumen sumber
`.af` tidak diubah.

## 4. Memahami hasil export

Setelah selesai, Affinity menampilkan tiga jumlah:

- **Selesai**: export berhasil dibuat.
- **Dilewati**: file hasil sudah ada dan opsi timpa tidak dipilih.
- **Gagal**: Affinity tidak dapat membuka atau mengekspor file tersebut.

Script juga membuat laporan di folder output dengan nama seperti:

```text
affinity-batch-export-report-20260102-030405006.txt
```

Laporan mencatat sumber, tujuan, preset, dan status setiap export.

Preset terakhir disimpan dalam file berikut di folder sumber:

```text
.affinity-batch-exporter-last-preset.txt
```

File tersebut hanya berisi nama preset agar pilihan yang sama dapat ditampilkan
saat script dijalankan kembali.

## Pemrosesan subfolder

Jika **Proses subfolder** tidak dicentang, hanya file di folder sumber utama
yang diproses.

Jika dicentang, file di seluruh folder turunannya ikut diproses. Struktur folder
dipertahankan di lokasi output.

Contoh sumber:

```text
E:\Desain\poster.af
E:\Desain\Klien A\logo.af
```

Hasil di `E:\Hasil`:

```text
E:\Hasil\poster.pdf
E:\Hasil\Klien A\logo.pdf
```

## Pemecahan masalah

### Muncul `PERMISSION_DENIED`

Affinity belum memberikan izin untuk folder yang dimasukkan.

1. Buka **Settings > Scripting**.
2. Pastikan **File System Access** aktif.
3. Tambahkan folder sumber dan output yang persis sama dengan path pada script.
4. Jalankan script kembali.

### Folder tidak ditemukan

- Pastikan folder sudah dibuat.
- Periksa kembali huruf drive dan nama folder.
- Path dapat ditulis dengan `\` atau `/`.
- Tanda kutip di sekeliling path diperbolehkan saat menyalin path dari Windows.

### Tidak ada file yang cocok

- Pastikan folder berisi file dengan ekstensi `.af`.
- Kosongkan **Filter nama** untuk memproses semua file.
- Aktifkan **Proses subfolder** jika file berada di dalam folder turunan.

### File dilewati

File hasil dengan nama yang sama sudah ada. Aktifkan
**Timpa file yang sudah ada** jika memang ingin menggantinya.

### Export gagal

- Buka file `.af` secara manual untuk memastikan Affinity dapat membacanya.
- Pastikan preset yang dipilih masih tersedia di Affinity.
- Pastikan folder output dapat ditulis.
- Baca laporan export untuk melihat pesan kesalahan setiap file.

## Batasan

- Script hanya dapat dijalankan di dalam Affinity, bukan dari Command Prompt
  atau PowerShell.
- Folder dipilih dengan memasukkan path karena Scripting SDK saat ini tidak
  menyediakan dialog pemilih folder.
- Preset yang tersedia mengikuti preset export pada instalasi Affinity pengguna.
- Folder output harus dibuat sebelum script dijalankan.

## Pemeriksaan untuk pengembang

Node.js hanya diperlukan untuk menjalankan pemeriksaan kode, bukan untuk
memakai script di Affinity.

```powershell
node --check "affinity-batch-exporter 3.0.0.js"
node --test affinity-batch-exporter.test.js
```

## Status proyek

Proyek ini tidak resmi dan tidak berafiliasi dengan Canva atau Affinity.
