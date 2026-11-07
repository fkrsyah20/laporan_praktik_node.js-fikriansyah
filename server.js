"use strict";

/**
 * Server Web & REST API Sederhana dengan Node.js (tanpa library tambahan)
 * Penyusun : Muhamad Fikriansyah (24260028)
 * Jalankan : node server.js   (atau tekan F5 di VS Code)
 * Buka     : http://localhost:3000
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const TAMPILKAN_LOG = require.main === module; // log hanya saat dijalankan langsung

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------- Data (disimpan di memori, hilang saat server dimatikan) ----------
const profil = {
  nama: "Muhamad Fikriansyah",
  nim: "24260028",
  prodi: "Teknik Informatika",
  fakultas: "Fakultas Teknik dan Ilmu Komputer",
  universitas: "Universitas Nahdlatul Ulama Indonesia",
};

const teknologi = ["HTML", "CSS", "JavaScript", "Node.js", "React"];

let daftarTarget = [
  { id: 1, judul: "Membuat halaman web" },
  { id: 2, judul: "Membangun REST API" },
  { id: 3, judul: "Mengintegrasikan frontend dan backend" },
];
let idBerikutnya = 4;

// ---------- Fungsi bantu ----------
function kirimJson(res, status, data) {
  const isi = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(isi),
  });
  res.end(isi);
}

function kirimTeks(res, status, teks) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(teks);
}

function bacaBody(req, batas = 10 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let terlaluBesar = false;
    req.setEncoding("utf8");
    req.on("data", (potongan) => {
      if (terlaluBesar) return;
      data += potongan;
      if (data.length > batas) {
        terlaluBesar = true;
        data = "";
      }
    });
    req.on("end", () => {
      if (terlaluBesar) {
        reject(Object.assign(new Error("Body terlalu besar"), { status: 413 }));
      } else {
        resolve(data);
      }
    });
    req.on("error", reject);
  });
}

// ---------- Penanganan REST API ----------
async function tanganiApi(req, res, pathname) {
  const metode = req.method;

  if (pathname === "/api/profil") {
    return metode === "GET"
      ? kirimJson(res, 200, profil)
      : kirimJson(res, 405, { pesan: "Metode tidak diizinkan" });
  }

  if (pathname === "/api/teknologi") {
    return metode === "GET"
      ? kirimJson(res, 200, teknologi)
      : kirimJson(res, 405, { pesan: "Metode tidak diizinkan" });
  }

  if (pathname === "/api/target") {
    if (metode === "GET") return kirimJson(res, 200, daftarTarget);

    if (metode === "POST") {
      let body;
      try {
        body = JSON.parse(await bacaBody(req));
      } catch (err) {
        if (err.status) return kirimJson(res, err.status, { pesan: err.message });
        return kirimJson(res, 400, { pesan: "Body harus berupa JSON yang valid" });
      }
      const judul = body && typeof body.judul === "string" ? body.judul.trim() : "";
      if (!judul) {
        return kirimJson(res, 400, { pesan: "Field 'judul' wajib diisi" });
      }
      const baru = { id: idBerikutnya++, judul };
      daftarTarget.push(baru);
      return kirimJson(res, 201, baru);
    }

    return kirimJson(res, 405, { pesan: "Metode tidak diizinkan" });
  }

  const cocok = pathname.match(/^\/api\/target\/(\d+)$/);
  if (cocok) {
    if (metode !== "DELETE") {
      return kirimJson(res, 405, { pesan: "Metode tidak diizinkan" });
    }
    const id = Number(cocok[1]);
    const index = daftarTarget.findIndex((t) => t.id === id);
    if (index === -1) {
      return kirimJson(res, 404, { pesan: `Target dengan id ${id} tidak ditemukan` });
    }
    const [dihapus] = daftarTarget.splice(index, 1);
    return kirimJson(res, 200, { pesan: "Target berhasil dihapus", target: dihapus });
  }

  return kirimJson(res, 404, { pesan: "Endpoint tidak ditemukan" });
}

// ---------- Penyaji file statis ----------
function kirimFile(res, pathname) {
  let relatif;
  try {
    relatif = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  } catch {
    return kirimTeks(res, 400, "400 - Alamat tidak valid");
  }

  const lengkap = path.normalize(path.join(PUBLIC_DIR, relatif));
  if (!lengkap.startsWith(PUBLIC_DIR + path.sep)) {
    return kirimTeks(res, 403, "403 - Akses ditolak");
  }

  fs.readFile(lengkap, (err, isi) => {
    if (err) return kirimTeks(res, 404, "404 - Halaman tidak ditemukan");
    const jenis = MIME[path.extname(lengkap).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": jenis, "Content-Length": isi.length });
    res.end(isi);
  });
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  if (TAMPILKAN_LOG) {
    res.on("finish", () => {
      const jam = new Date().toLocaleTimeString("id-ID", { hour12: false });
      console.log(`[${jam}] ${req.method} ${req.url} -> ${res.statusCode}`);
    });
  }

  try {
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname.startsWith("/api/")) {
      await tanganiApi(req, res, pathname);
    } else if (req.method === "GET" || req.method === "HEAD") {
      kirimFile(res, pathname);
    } else {
      kirimTeks(res, 405, "405 - Metode tidak diizinkan");
    }
  } catch (err) {
    console.error("Kesalahan server:", err);
    if (!res.headersSent) kirimJson(res, 500, { pesan: "Terjadi kesalahan pada server" });
  }
});

if (require.main === module) {
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} sudah dipakai. Coba port lain, misalnya:`);
      console.error("  PowerShell : $env:PORT=3001; node server.js");
      console.error("  CMD        : set PORT=3001 && node server.js");
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log("Server berjalan di http://localhost:" + PORT);
    console.log("Tekan Ctrl + C untuk menghentikan server.");
  });
}

module.exports = server;
