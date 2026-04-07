import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "assets", "menu");
const outputDir = path.join(rootDir, "assets", "menu-optimized");
const generatedMapFile = path.join(rootDir, "utils", "generated-menu-optimized-assets.ts");
const maxWidth = 1080;
const aggressiveTopCount = 15;
const convertLargestPngCount = 20;

const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function buildOutputPipeline(image, extension, qualityProfile = "standard", forceWebp = false) {
  if (forceWebp) {
    const isAggressive = qualityProfile === "aggressive";
    return image.webp({ quality: isAggressive ? 46 : 52, effort: 6 });
  }

  const isAggressive = qualityProfile === "aggressive";

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return image.jpeg({ quality: isAggressive ? 52 : 62, mozjpeg: true, progressive: true });
    case ".png":
      return image.png({ compressionLevel: 9, palette: true, quality: isAggressive ? 55 : 65 });
    case ".webp":
      return image.webp({ quality: isAggressive ? 52 : 60, effort: isAggressive ? 6 : 5 });
    case ".avif":
      return image.avif({ quality: isAggressive ? 40 : 46, effort: isAggressive ? 5 : 4 });
    default:
      return image;
  }
}

async function optimizeOneFile(sourceFile, destinationFile, qualityProfile = "standard", forceWebp = false) {
  const extension = path.extname(sourceFile).toLowerCase();

  const sourceStats = await fs.stat(sourceFile);
  const image = sharp(sourceFile, { failOn: "none" }).rotate();
  const metadata = await image.metadata();

  const resized = metadata.width && metadata.width > maxWidth
    ? image.resize({ width: maxWidth, withoutEnlargement: true })
    : image;

  const optimized = buildOutputPipeline(resized, extension, qualityProfile, forceWebp);
  await optimized.toFile(destinationFile);

  const destinationStats = await fs.stat(destinationFile);
  return {
    sourceBytes: sourceStats.size,
    outputBytes: destinationStats.size,
  };
}

async function generateRequireMap(fileEntries) {
  const lines = [];
  lines.push('import { type ImageSourcePropType } from "react-native";');
  lines.push("");
  lines.push("export const optimizedMenuImageAssets: Record<string, ImageSourcePropType> = {");

  for (const entry of fileEntries.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey))) {
    const sourceKey = entry.sourceKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const outputPath = entry.outputPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`  \"${sourceKey}\": require(\"../assets/menu-optimized/${outputPath}\"),`);
  }

  lines.push("};");
  lines.push("");
  await fs.writeFile(generatedMapFile, lines.join("\n"), "utf8");
}

async function main() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const allFiles = await walkFiles(sourceDir);
  const imageFiles = allFiles.filter((file) => supportedExtensions.has(path.extname(file).toLowerCase()));
  const sourceStats = await Promise.all(
    imageFiles.map(async (filePath) => ({
      filePath,
      sourceBytes: (await fs.stat(filePath)).size,
      extension: path.extname(filePath).toLowerCase(),
    })),
  );

  const aggressiveSet = new Set(
    sourceStats
      .sort((a, b) => b.sourceBytes - a.sourceBytes)
      .slice(0, aggressiveTopCount)
      .map((entry) => entry.filePath),
  );

  const largestPngSet = new Set(
    sourceStats
      .filter((entry) => entry.extension === ".png")
      .sort((a, b) => b.sourceBytes - a.sourceBytes)
      .slice(0, convertLargestPngCount)
      .map((entry) => entry.filePath),
  );

  let totalSourceBytes = 0;
  let totalOutputBytes = 0;
  const generatedEntries = [];

  for (const sourceFile of imageFiles) {
    const relativeFile = path.relative(sourceDir, sourceFile);
    const relativePosix = toPosixPath(relativeFile);
    const shouldConvertPngToWebp = largestPngSet.has(sourceFile);
    const outputRelativeFile = shouldConvertPngToWebp
      ? `${relativeFile.slice(0, -path.extname(relativeFile).length)}.webp`
      : relativeFile;
    const outputRelativePosix = toPosixPath(outputRelativeFile);
    const destinationFile = path.join(outputDir, outputRelativeFile);

    await fs.mkdir(path.dirname(destinationFile), { recursive: true });
    const qualityProfile = aggressiveSet.has(sourceFile) ? "aggressive" : "standard";
    const result = await optimizeOneFile(sourceFile, destinationFile, qualityProfile, shouldConvertPngToWebp);

    totalSourceBytes += result.sourceBytes;
    totalOutputBytes += result.outputBytes;
    generatedEntries.push({ sourceKey: relativePosix, outputPath: outputRelativePosix });
  }

  await generateRequireMap(generatedEntries);

  const sourceMb = (totalSourceBytes / (1024 * 1024)).toFixed(2);
  const outputMb = (totalOutputBytes / (1024 * 1024)).toFixed(2);
  const reduction = totalSourceBytes > 0
    ? (((totalSourceBytes - totalOutputBytes) / totalSourceBytes) * 100).toFixed(1)
    : "0.0";

  console.log(`Optimized ${generatedEntries.length} images.`);
  console.log(`Aggressive compression on top ${aggressiveTopCount} largest images.`);
  console.log(`Converted top ${convertLargestPngCount} largest PNG files to WebP.`);
  console.log(`Source size: ${sourceMb} MB`);
  console.log(`Output size: ${outputMb} MB`);
  console.log(`Reduction: ${reduction}%`);
  console.log(`Generated map: ${path.relative(rootDir, generatedMapFile)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
