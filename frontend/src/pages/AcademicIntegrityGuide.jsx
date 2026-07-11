import { ShieldCheck, BookOpen, Quote, PencilLine } from 'lucide-react';

const sections = [
  {
    icon: Quote,
    color: '#0ea5e9',
    title: 'Cara Sitasi yang Benar',
    body: 'Setiap kali Anda menggunakan ide, data, atau kalimat dari sumber lain — baik dikutip langsung maupun diparafrasekan — cantumkan sumbernya. Gunakan format sitasi yang konsisten (APA, MLA, atau yang diwajibkan institusi Anda) baik di dalam teks maupun di daftar pustaka. Sitasi yang benar bukan formalitas, melainkan cara Anda menunjukkan riset yang jujur dan dapat ditelusuri.'
  },
  {
    icon: PencilLine,
    color: '#8b5cf6',
    title: 'Parafrase yang Etis',
    body: 'Memparafrasekan berarti menyampaikan ulang gagasan orang lain dengan kata-kata dan struktur kalimat Anda sendiri — bukan sekadar mengganti beberapa kata. Parafrase yang baik tetap mencantumkan sumber aslinya. Mengubah susunan kalimat tanpa mencantumkan sumber tetaplah plagiarisme, meskipun kata-katanya berbeda.'
  },
  {
    icon: ShieldCheck,
    color: '#10b981',
    title: 'Bagaimana Skor Similarity Bekerja',
    body: 'Alat pendeteksi kemiripan (seperti Turnitin) membandingkan teks Anda dengan basis data jurnal, buku, dan tugas mahasiswa lain, lalu menghasilkan persentase kemiripan. Skor tinggi tidak selalu berarti plagiarisme — kutipan yang disitasi dengan benar, istilah teknis umum, dan daftar pustaka bisa turut terhitung. Sebaliknya, skor rendah tidak menjamin tulisan bebas dari plagiarisme ide. Gunakan skor ini sebagai alat bantu refleksi, bukan target yang harus "diakali".'
  },
  {
    icon: BookOpen,
    color: '#f59e0b',
    title: 'Kesalahan Umum yang Berujung Plagiarisme Tidak Sengaja',
    body: 'Beberapa penyebab paling umum: lupa mencantumkan sumber saat mencatat riset, menyalin definisi dari internet tanpa sitasi, menggunakan tugas lama tanpa izin (self-plagiarism), atau mengandalkan satu sumber secara berlebihan sehingga strukturnya mengikuti sumber tersebut. Cara terbaik menghindarinya: catat sumber sejak awal riset, dan tulis pemahaman Anda sendiri terlebih dahulu sebelum membandingkannya dengan sumber.'
  }
];

export default function AcademicIntegrityGuide() {
  return (
    <div className="container" style={{ paddingTop: '6rem', paddingBottom: '6rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Panduan Integritas Akademik</h1>
        <p className="text-muted" style={{ fontSize: '1.15rem', maxWidth: '650px', margin: '0 auto' }}>
          Memahami sitasi, parafrase, dan cara kerja pemeriksaan orisinalitas membantu Anda menghindari plagiarisme
          yang tidak disengaja — bukan sekadar lolos dari deteksi.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        {sections.map(({ icon: Icon, color, title, body }) => (
          <div key={title} className="glass-panel" style={{ padding: '2rem', borderLeft: `4px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Icon size={22} color={color} />
              <h3 style={{ margin: 0, fontSize: '1.3rem', color }}>{title}</h3>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '1.05rem' }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
