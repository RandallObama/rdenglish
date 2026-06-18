const sharp = require('sharp');
const path = require('path');

const INPUT = 'C:\Users\DELL\Desktop\新标题.jpg';
const OUTPUT = 'C:\Users\DELL\Desktop\workspace\rdenglish\public\title-logo.png';
const FILL = { r: 0xEF, g: 0xEC, b: 0xE6 };

async function process() {
  const image = sharp(INPUT);
  const metadata = await image.metadata();
  console.log('尺寸:', metadata.width, 'x', metadata.height);

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data.buffer);
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // 判断是否接近白色（阈值可调）
    if (r > 230 && g > 230 && b > 230) {
      pixels[i] = FILL.r;
      pixels[i + 1] = FILL.g;
      pixels[i + 2] = FILL.b;
    }
  }

  await sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .png()
  .toFile(OUTPUT);

  console.log('✓ 已处理:', OUTPUT);
}

process().catch(e => { console.error(e); process.exit(1); });
