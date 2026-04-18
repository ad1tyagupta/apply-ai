import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"]);

function toSlug(fileName) {
  return basename(fileName, extname(fileName))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
}

function frontmatterFor(sourceFile, converter) {
  return [
    "---",
    `source_file: ${sourceFile}`,
    `converter: ${converter}`,
    "---",
    "",
  ].join("\n");
}

function normalizePlainText(text) {
  return text.replace(/\r\n/g, "\n").trim() + "\n";
}

export async function ingestDocuments({
  rawDir,
  normalizedDir,
  converters = {},
}) {
  mkdirSync(rawDir, { recursive: true });
  mkdirSync(normalizedDir, { recursive: true });

  const files = readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name.toLowerCase() !== "readme.md")
    .map((entry) => entry.name)
    .sort();

  const results = [];

  for (const fileName of files) {
    const filePath = join(rawDir, fileName);
    const ext = extname(fileName).toLowerCase();
    const outputBase = `${toSlug(fileName)}.md`;
    const outputPath = join(normalizedDir, outputBase);
    const manifestPath = join(normalizedDir, `${toSlug(fileName)}.manifest.json`);

    let markdown = "";
    let converter = "";

    if (ext === ".md") {
      markdown = readFileSync(filePath, "utf8");
      converter = "markdown-copy";
    } else if (ext === ".txt") {
      markdown = readFileSync(filePath, "utf8");
      converter = "text-copy";
    } else if (ext === ".pdf") {
      markdown = await converters.pdf(filePath);
      converter = "pdf-parse";
    } else if (ext === ".docx") {
      markdown = await converters.docx(filePath);
      converter = "docx-mammoth";
    } else if (IMAGE_EXTENSIONS.has(ext)) {
      markdown = await converters.image(filePath);
      converter = "image-ocr";
    } else {
      throw new Error(`Unsupported file format: ${fileName}`);
    }

    const body = normalizePlainText(markdown);
    writeFileSync(outputPath, frontmatterFor(fileName, converter) + body, "utf8");

    const stats = statSync(filePath);
    const manifest = {
      sourceFile: fileName,
      outputFile: outputBase,
      converter,
      fileSizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

    results.push(manifest);
  }

  return results;
}

export async function defaultConverters() {
  return {
    pdf: async (filePath) => {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const buffer = readFileSync(filePath);
      const result = await pdfParse(buffer);
      return result.text || "";
    },
    docx: async (filePath) => {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || "";
    },
    image: async (filePath) => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const result = await worker.recognize(filePath);
        return result.data.text || "";
      } finally {
        await worker.terminate();
      }
    },
  };
}
