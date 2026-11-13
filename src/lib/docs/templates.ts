export type TemplateDef = { key: string; label: string; vars: string; text: string };

const COMMON =
  "nama_sekolah, npsn, alamat_sekolah, desa, kecamatan, kabupaten, provinsi, kepala_sekolah, nip_kepsek, bendahara, tahun_anggaran";

export const TEMPLATES: TemplateDef[] = [
  {
    key: "undangan_pembuka",
    label: "Undangan Rapat - Paragraf Pembuka",
    vars: `${COMMON}, nama_kegiatan`,
    text: "Dengan hormat,\n\nSehubungan dengan akan dilaksanakannya {{nama_kegiatan}}, kami mengundang Bapak/Ibu untuk dapat hadir pada:",
  },
  {
    key: "undangan_penutup",
    label: "Undangan Rapat - Paragraf Penutup",
    vars: COMMON,
    text: "Demikian undangan ini kami sampaikan. Atas perhatian dan kehadiran Bapak/Ibu, kami ucapkan terima kasih.",
  },
  {
    key: "sk_pramuka",
    label: "SK Pelatih Pramuka - Isi Keputusan",
    vars: `${COMMON}, pembina, tahun_pelajaran, nomor_sk, tanggal_sk`,
    text: [
      "Menimbang:",
      "a. bahwa untuk kelancaran pelaksanaan kegiatan ekstrakurikuler Pramuka di {{nama_sekolah}} perlu menunjuk pelatih Pramuka;",
      "b. bahwa nama yang tercantum dalam keputusan ini dipandang mampu dan memenuhi syarat untuk melaksanakan tugas tersebut;",
      "",
      "Mengingat:",
      "1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
      "2. Undang-Undang Nomor 12 Tahun 2010 tentang Gerakan Pramuka;",
      "3. Petunjuk teknis pengelolaan dana BOSP yang berlaku pada Tahun Anggaran {{tahun_anggaran}}.",
      "",
      "MEMUTUSKAN",
      "",
      "Menetapkan:",
      "KESATU: Menunjuk Sdr./Sdri. {{pembina}} sebagai pelatih ekstrakurikuler Pramuka pada {{nama_sekolah}} Tahun Pelajaran {{tahun_pelajaran}}.",
      "KEDUA: Pelatih sebagaimana dimaksud pada diktum KESATU bertugas membina dan melatih peserta didik dalam kegiatan ekstrakurikuler Pramuka.",
      "KETIGA: Honor/transport pelatih dibebankan pada dana BOSP {{nama_sekolah}} Tahun Anggaran {{tahun_anggaran}}.",
      "KEEMPAT: Keputusan ini berlaku sejak tanggal ditetapkan.",
    ].join("\n"),
  },
  {
    key: "sk_tahfidz",
    label: "SK Pembimbing Tahfidz Al-Qur'an - Isi Keputusan",
    vars: `${COMMON}, pembina, tahun_pelajaran, nomor_sk, tanggal_sk`,
    text: [
      "Menimbang:",
      "a. bahwa untuk kelancaran kegiatan ekstrakurikuler Tahfidzul Qur'an di {{nama_sekolah}} perlu menunjuk pembimbing baca Al-Qur'an;",
      "b. bahwa nama yang tercantum dalam keputusan ini dipandang mampu dan memenuhi syarat untuk melaksanakan tugas tersebut;",
      "",
      "Mengingat:",
      "1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;",
      "2. Petunjuk teknis pengelolaan dana BOSP yang berlaku pada Tahun Anggaran {{tahun_anggaran}}.",
      "",
      "MEMUTUSKAN",
      "",
      "Menetapkan:",
      "KESATU: Menunjuk Sdr./Sdri. {{pembina}} sebagai pembimbing baca Al-Qur'an dalam kegiatan ekstrakurikuler Tahfidzul Qur'an pada {{nama_sekolah}} Tahun Pelajaran {{tahun_pelajaran}}.",
      "KEDUA: Pembimbing sebagaimana dimaksud pada diktum KESATU bertugas membimbing peserta didik dalam membaca dan menghafal Al-Qur'an.",
      "KETIGA: Honor/transport pembimbing dibebankan pada dana BOSP {{nama_sekolah}} Tahun Anggaran {{tahun_anggaran}}.",
      "KEEMPAT: Keputusan ini berlaku sejak tanggal ditetapkan.",
    ].join("\n"),
  },
  {
    key: "surat_pesanan_pembuka",
    label: "Surat Pesanan - Paragraf Pembuka",
    vars: `${COMMON}, nama_toko, alamat_toko`,
    text: "Berdasarkan kebutuhan {{nama_sekolah}} yang dibiayai dari dana BOSP Tahun Anggaran {{tahun_anggaran}}, dengan ini kami memesan barang kepada {{nama_toko}} dengan rincian sebagai berikut:",
  },
  {
    key: "surat_pesanan_penutup",
    label: "Surat Pesanan - Paragraf Penutup",
    vars: COMMON,
    text: "Demikian surat pesanan ini dibuat untuk dipergunakan sebagaimana mestinya.",
  },
  {
    key: "ba_serah_terima_pembuka",
    label: "BA Serah Terima Barang - Pembuka",
    vars: `${COMMON}, hari_ba, tanggal_ba, nama_toko`,
    text: "Pada hari ini {{hari_ba}} tanggal {{tanggal_ba}}, kami yang bertanda tangan di bawah ini:",
  },
  {
    key: "ba_serah_terima_penutup",
    label: "BA Serah Terima Barang - Penutup",
    vars: `${COMMON}, kondisi, nama_toko`,
    text: "PIHAK PERTAMA telah menyerahkan barang tersebut kepada PIHAK KEDUA, dan PIHAK KEDUA telah menerimanya dengan hasil pemeriksaan: {{kondisi}}. Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
  },
  {
    key: "ba_pemeriksaan_pembuka",
    label: "BA Pemeriksaan Teknis - Pembuka",
    vars: `${COMMON}, hari_ba, tanggal_ba, nama_toko`,
    text: "Pada hari ini {{hari_ba}} tanggal {{tanggal_ba}}, kami yang bertanda tangan di bawah ini telah melakukan pemeriksaan teknis terhadap hasil pengadaan barang/jasa pada {{nama_sekolah}} Tahun Anggaran {{tahun_anggaran}} yang diadakan oleh {{nama_toko}}, dengan hasil sebagai berikut:",
  },
  {
    key: "ba_pemeriksaan_penutup",
    label: "BA Pemeriksaan Teknis - Penutup",
    vars: `${COMMON}, kondisi`,
    text: "Berdasarkan hasil pemeriksaan tersebut, barang yang diadakan dinyatakan: {{kondisi}}. Demikian Berita Acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
  },
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map((t) => [t.key, t])) as Record<string, TemplateDef>;
