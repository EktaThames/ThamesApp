const fs = require("fs");
const csv = require("csv-parser");

// Fix scientific notation in barcodes safely
const fixBarcode = (v) => {
  if (!v) return null;

  let s = v.toString().trim();
  if (s === "") return null;

  // If scientific notation → convert manually
  if (/e/i.test(s)) {
    // Example: "5.06E+12"
    const num = Number(s); // floating number
    const int = BigInt(Math.trunc(num)); // safe BigInt
    return int.toString();
  }

  return s;
};

// Normalize header names reliably
const normalizeHeader = (h) =>
  h
    .toLowerCase()
    .replace(/\s+/g, " ")       // collapse multiple spaces
    .replace(/\u00A0/g, " ")     // convert non-breaking spaces
    .trim();

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => normalizeHeader(header),

          mapValues: ({ header, value }) => {
            const h = normalizeHeader(header);

            if (
              h === "ean1" ||
              h === "ean2" ||
              h === "ean3" ||
              h === "internal ean 1" ||
              h === "internal ean 2" ||
              h === "internal ean 3" ||
              h === "internal ean 4"
            ) {
              return fixBarcode(value);
            }

            return value;
          },
        })
      )
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

module.exports = parseCSV;
