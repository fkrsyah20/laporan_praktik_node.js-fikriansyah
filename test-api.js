"use strict";

/**
 * Pengujian otomatis REST API (tanpa library tambahan, butuh Node.js 18+).
 * Jalankan: node test-api.js   (atau: npm test)
 */

const server = require("./server");

const hasil = { lulus: 0, gagal: 0 };

async function uji(nama, fungsi) {
  try {
    await fungsi();
    hasil.lulus++;
    console.log(`[OK]    ${nama}`);
  } catch (err) {
    hasil.gagal++;
    console.log(`[GAGAL] ${nama}\n        -> ${err.message}`);
  }
}

function harus(kondisi, pesan) {
  if (!kondisi) throw new Error(pesan);
}

server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const json = { "Content-Type": "application/json" };

  console.log("Menguji server pada " + base + "\n");

  await uji("GET    /api/profil            -> 200, data Muhamad Fikriansyah", async () => {
    const res = await fetch(base + "/api/profil");
    const data = await res.json();
    harus(res.status === 200, "status " + res.status);
    harus(data.nama === "Muhamad Fikriansyah" && data.nim === "24260028", "data profil tidak sesuai");
  });

  await uji("GET    /api/teknologi         -> 200, 5 teknologi", async () => {
    const res = await fetch(base + "/api/teknologi");
    const data = await res.json();
    harus(res.status === 200 && data.length === 5, "status " + res.status + ", jumlah " + data.length);
  });

  await uji("GET    /api/target            -> 200, 3 target awal", async () => {
    const res = await fetch(base + "/api/target");
    const data = await res.json();
    harus(res.status === 200 && data.length === 3, "status " + res.status + ", jumlah " + data.length);
  });

  await uji("POST   /api/target            -> 201, target baru dibuat", async () => {
    const res = await fetch(base + "/api/target", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ judul: "Mempelajari Express.js" }),
    });
    const data = await res.json();
    harus(res.status === 201, "status " + res.status);
    harus(data.id === 4 && data.judul === "Mempelajari Express.js", "isi respons tidak sesuai");
  });

  await uji("POST   /api/target (kosong)   -> 400, ditolak", async () => {
    const res = await fetch(base + "/api/target", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ judul: "   " }),
    });
    harus(res.status === 400, "status " + res.status);
  });

  await uji("POST   /api/target (rusak)   -> 400, ditolak", async () => {
    const res = await fetch(base + "/api/target", { method: "POST", headers: json, body: "bukan json" });
    harus(res.status === 400, "status " + res.status);
  });

  await uji("GET    /api/target            -> 200, sekarang 4 target", async () => {
    const res = await fetch(base + "/api/target");
    const data = await res.json();
    harus(data.length === 4, "jumlah " + data.length);
  });

  await uji("DELETE /api/target/4          -> 200, target dihapus", async () => {
    const res = await fetch(base + "/api/target/4", { method: "DELETE" });
    harus(res.status === 200, "status " + res.status);
  });

  await uji("DELETE /api/target/999        -> 404, tidak ditemukan", async () => {
    const res = await fetch(base + "/api/target/999", { method: "DELETE" });
    harus(res.status === 404, "status " + res.status);
  });

  await uji("GET    /api/tidak-ada         -> 404", async () => {
    const res = await fetch(base + "/api/tidak-ada");
    harus(res.status === 404, "status " + res.status);
  });

  await uji("PUT    /api/profil            -> 405, metode ditolak", async () => {
    const res = await fetch(base + "/api/profil", { method: "PUT" });
    harus(res.status === 405, "status " + res.status);
  });

  await uji("GET    /                      -> 200, halaman HTML", async () => {
    const res = await fetch(base + "/");
    const teks = await res.text();
    harus(res.status === 200, "status " + res.status);
    harus((res.headers.get("content-type") || "").includes("text/html"), "bukan text/html");
    harus(teks.includes("Profil Junior Web Developer"), "judul halaman tidak ditemukan");
  });

  await uji("GET    /style.css             -> 200, berkas CSS", async () => {
    const res = await fetch(base + "/style.css");
    harus(res.status === 200 && (res.headers.get("content-type") || "").includes("text/css"), "status " + res.status);
  });

  await uji("GET    /..%2fserver.js        -> 403, akses di luar public ditolak", async () => {
    const res = await fetch(base + "/..%2fserver.js");
    harus(res.status === 403, "status " + res.status);
  });

  console.log(`\nRingkasan: ${hasil.lulus} lulus, ${hasil.gagal} gagal dari ${hasil.lulus + hasil.gagal} pengujian.`);
  process.exitCode = hasil.gagal === 0 ? 0 : 1;
  server.close();
});
