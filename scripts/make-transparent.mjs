import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, "..", "public", "title-logo.png");
const outputPath = join(__dirname, "..", "public", "title-logo-transparent.png");

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = new Uint8Array(data);
const { width, height, channels } = info;

console.log(`Image: ${width}x${height}, ${channels} channels`);

// 自动检测背景色：取四个角落区域的平均色
function sampleRegion(x, y, w, h) {
  let sr = 0, sg = 0, sb = 0, count = 0;
  for (let py = y; py < y + h && py < height; py++) {
    for (let px = x; px < x + w && px < width; px++) {
      const i = (py * width + px) * 4;
      sr += pixels[i];
      sg += pixels[i + 1];
      sb += pixels[i + 2];
      count++;
    }
  }
  return [Math.round(sr / count), Math.round(sg / count), Math.round(sb / count)];
}

// 取图片四个角和中心边缘作为背景采样区域
const margin = 40;
const sampleSize = 20;
const topLeft = sampleRegion(margin, margin, sampleSize, sampleSize);
const topRight = sampleRegion(width - margin - sampleSize, margin, sampleSize, sampleSize);
const bottomLeft = sampleRegion(margin, height - margin - sampleSize, sampleSize, sampleSize);
const bottomRight = sampleRegion(width - margin - sampleSize, height - margin - sampleSize, sampleSize, sampleSize);

console.log(`Corner samples:`);
console.log(`  Top-left:     rgb(${topLeft.join(",")})`);
console.log(`  Top-right:    rgb(${topRight.join(",")})`);
console.log(`  Bottom-left:  rgb(${bottomLeft.join(",")})`);
console.log(`  Bottom-right: rgb(${bottomRight.join(",")})`);

// 用四个角的平均作为背景色
const BG_R = Math.round((topLeft[0] + topRight[0] + bottomLeft[0] + bottomRight[0]) / 4);
const BG_G = Math.round((topLeft[1] + topRight[1] + bottomLeft[1] + bottomRight[1]) / 4);
const BG_B = Math.round((topLeft[2] + topRight[2] + bottomLeft[2] + bottomRight[2]) / 4);

console.log(`\nDetected background: rgb(${BG_R},${BG_G},${BG_B})`);

// 颜色距离阈值
const MIN_DIST = 10;   // 低于此距离 -> 完全透明
const MAX_DIST = 50;   // 高于此距离 -> 完全不透明

function colorDist(r, g, b) {
  const dr = r - BG_R;
  const dg = g - BG_G;
  const db = b - BG_B;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// 处理像素
let transparentCount = 0;
let semiCount = 0;
let opaqueCount = 0;

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const dist = colorDist(r, g, b);

  let alpha;
  if (dist <= MIN_DIST) {
    alpha = 0;
    transparentCount++;
  } else if (dist >= MAX_DIST) {
    alpha = 255;
    opaqueCount++;
  } else {
    alpha = Math.round(((dist - MIN_DIST) / (MAX_DIST - MIN_DIST)) * 255);
    semiCount++;
  }

  pixels[i + 3] = alpha;
}

const total = width * height;
console.log(`\nResult:`);
console.log(`  Transparent: ${transparentCount} (${((transparentCount / total) * 100).toFixed(1)}%)`);
console.log(`  Semi:        ${semiCount} (${((semiCount / total) * 100).toFixed(1)}%)`);
console.log(`  Opaque:      ${opaqueCount} (${((opaqueCount / total) * 100).toFixed(1)}%)`);

await sharp(pixels, {
  raw: { width, height, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(`\nSaved: ${outputPath}`);

// 同时验证输出
const { info: outInfo } = await sharp(outputPath).metadata();
console.log(`Output: ${outInfo.width}x${outInfo.height}, ${outInfo.format}, ${(outInfo.size / 1024).toFixed(1)} KB`);
