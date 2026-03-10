/**
 * GemCraft — Asset Generation Script
 *
 * Generates game sprites via Replicate API (black-forest-labs/flux-1.1-pro)
 * and removes backgrounds via lucataco/remove-bg.
 *
 * Usage: node scripts/generate-assets.js
 *
 * Reads REPLICATE_API_TOKEN from /Users/sergejpapysev/OpenCode/.env
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const ENV_PATH = join(PROJECT_ROOT, '..', '..', '.env');
const ASSETS_DIR = join(PROJECT_ROOT, 'public', 'assets');

// ── Load .env (simple parser, no dependencies) ──────────────

function loadEnv(filepath) {
  if (!existsSync(filepath)) {
    throw new Error(`ENV file not found: ${filepath}`);
  }
  const content = readFileSync(filepath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const env = loadEnv(ENV_PATH);
const REPLICATE_API_TOKEN = env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
  console.error('[ERROR] REPLICATE_API_TOKEN not found in .env');
  process.exit(1);
}

console.log('[OK] REPLICATE_API_TOKEN loaded');

// ── Constants ────────────────────────────────────────────────

const REPLICATE_BASE = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 300_000; // 5 minutes per image
const DELAY_BETWEEN_REQUESTS_MS = 2000;
const MAX_RETRIES = 3;

// Model identifiers — will be resolved to version IDs at startup
const IMAGE_MODEL = 'black-forest-labs/flux-1.1-pro';
const REMOVE_BG_MODEL = 'lucataco/remove-bg';

// ── Asset Definitions ────────────────────────────────────────

const ASSETS = [
  // ── Background (no bg removal) ──
  {
    name: 'cave_bg',
    filename: 'cave_bg.png',
    subdir: '',
    prompt: 'Dark stone cave interior, frontal view. Walls covered with moss and glowing minerals. Stalactites hanging from ceiling. Burning torches on wall brackets on both sides. Open platform area in center. Dark arch at bottom. Warm torch lighting with orange glow. Cartoon style, bright vivid colors, detailed illustration. Vertical orientation, mobile game background, no text, no UI elements.',
    width: 576,
    height: 1024,
    removeBg: false,
    aspectRatio: '9:16',
  },

  // ── 6 Gem Balls (remove bg) ──
  {
    name: 'gem_ruby',
    filename: 'gem_ruby.png',
    subdir: 'gems',
    prompt: 'Single glossy cartoon stone ball, red color, round sphere shape, bright saturated color, soft shadow underneath, highlight on top-left, cartoon game style, centered on plain white background, game asset, no text, no other objects.',
    width: 256,
    height: 256,
    removeBg: true,
  },
  {
    name: 'gem_sapphire',
    filename: 'gem_sapphire.png',
    subdir: 'gems',
    prompt: 'Single glossy cartoon stone ball, blue color, round sphere shape, bright saturated color, soft shadow underneath, highlight on top-left, cartoon game style, centered on plain white background, game asset, no text, no other objects.',
    width: 256,
    height: 256,
    removeBg: true,
  },
  {
    name: 'gem_emerald',
    filename: 'gem_emerald.png',
    subdir: 'gems',
    prompt: 'Single glossy cartoon stone ball, green color, round sphere shape, bright saturated color, soft shadow underneath, highlight on top-left, cartoon game style, centered on plain white background, game asset, no text, no other objects.',
    width: 256,
    height: 256,
    removeBg: true,
  },
  {
    name: 'gem_amber',
    filename: 'gem_amber.png',
    subdir: 'gems',
    prompt: 'Single glossy cartoon stone ball, orange amber color, round sphere shape, bright saturated color, soft shadow underneath, highlight on top-left, cartoon game style, centered on plain white background, game asset, no text, no other objects.',
    width: 256,
    height: 256,
    removeBg: true,
  },
  {
    name: 'gem_amethyst',
    filename: 'gem_amethyst.png',
    subdir: 'gems',
    prompt: 'Single glossy cartoon stone ball, purple violet color, round sphere shape, bright saturated color, soft shadow underneath, highlight on top-left, cartoon game style, centered on plain white background, game asset, no text, no other objects.',
    width: 256,
    height: 256,
    removeBg: true,
  },
  {
    name: 'gem_topaz',
    filename: 'gem_topaz.png',
    subdir: 'gems',
    prompt: 'Single glossy cartoon stone ball, light blue cyan color, round sphere shape, bright saturated color, soft shadow underneath, highlight on top-left, cartoon game style, centered on plain white background, game asset, no text, no other objects.',
    width: 256,
    height: 256,
    removeBg: true,
  },

  // ── Stone Frame (remove bg) ──
  {
    name: 'stone_frame',
    filename: 'stone_frame.png',
    subdir: 'ui',
    prompt: 'Thick rough stone frame border, rectangle shape with empty center (transparent hole), dark gray-brown stone texture, uneven rocky edges, cartoon game style, isolated on plain white background, game UI element, no text.',
    width: 512,
    height: 640,
    removeBg: true,
  },

  // ── Goal Panel (remove bg) ──
  {
    name: 'goal_panel',
    filename: 'goal_panel.png',
    subdir: 'ui',
    prompt: 'Wooden sign board panel, wide horizontal rectangle, warm brown wood texture with wood grain, metal bolts on corners, hanging on chains from top, cartoon game style, isolated on plain white background, game UI element, no text.',
    width: 512,
    height: 128,
    removeBg: true,
    aspectRatio: '16:9',
  },

  // ── 3 Booster Buttons (remove bg) ──
  {
    name: 'btn_hammer',
    filename: 'btn_hammer.png',
    subdir: 'ui',
    prompt: 'Wooden square button with metal hammer icon in center, brown wood texture with grain, metal bolts on four corners, cartoon game style, isolated on plain white background, game UI element, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'btn_shuffle',
    filename: 'btn_shuffle.png',
    subdir: 'ui',
    prompt: 'Wooden square button with circular arrows refresh shuffle icon in center, brown wood texture with grain, metal bolts on four corners, cartoon game style, isolated on plain white background, game UI element, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'btn_rainbow',
    filename: 'btn_rainbow.png',
    subdir: 'ui',
    prompt: 'Wooden square button with sparkling rainbow diamond gem icon in center, brown wood texture with grain, metal bolts on four corners, cartoon game style, isolated on plain white background, game UI element, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },

  // ── 5 Goal Icons (remove bg) ──
  {
    name: 'icon_ruby',
    filename: 'icon_ruby.png',
    subdir: 'ui',
    prompt: 'Small faceted ruby gemstone icon, red, shiny, cartoon style, isolated on plain white background, game UI icon, no text, single gem.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'icon_sapphire',
    filename: 'icon_sapphire.png',
    subdir: 'ui',
    prompt: 'Small faceted sapphire gemstone icon, blue, shiny, cartoon style, isolated on plain white background, game UI icon, no text, single gem.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'icon_emerald',
    filename: 'icon_emerald.png',
    subdir: 'ui',
    prompt: 'Small faceted emerald gemstone icon, green, shiny, cartoon style, isolated on plain white background, game UI icon, no text, single gem.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'icon_amber',
    filename: 'icon_amber.png',
    subdir: 'ui',
    prompt: 'Small faceted amber gemstone icon, orange, shiny, cartoon style, isolated on plain white background, game UI icon, no text, single gem.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'icon_amethyst',
    filename: 'icon_amethyst.png',
    subdir: 'ui',
    prompt: 'Small faceted amethyst gemstone icon, purple, shiny, cartoon style, isolated on plain white background, game UI icon, no text, single gem.',
    width: 128,
    height: 128,
    removeBg: true,
  },

  // ── Cell Background (remove bg) ──
  {
    name: 'cell_bg',
    filename: 'cell_bg.png',
    subdir: 'ui',
    prompt: 'Single square stone tile, dark gray-brown color, slight inner shadow, rounded corners, cartoon game style, isolated on plain white background, game asset, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },

  // ── Torch (remove bg) ──
  {
    name: 'torch',
    filename: 'torch.png',
    subdir: 'ui',
    prompt: 'Medieval wall torch with bright orange flame, wooden handle with metal bracket, fire burning on top, cartoon game style, isolated on plain white background, game asset, no text.',
    width: 128,
    height: 256,
    removeBg: true,
    aspectRatio: '9:16',
  },

  // ── Special FX (remove bg) ──
  {
    name: 'fx_stripe_h',
    filename: 'fx_stripe_h.png',
    subdir: 'fx',
    prompt: 'Bright glowing horizontal light stripe effect, white-yellow energy beam glow, magical sparkles, transparent edges fading out, wide horizontal beam, game VFX effect, on plain black background, no text.',
    width: 256,
    height: 64,
    removeBg: true,
    aspectRatio: '16:9',
  },
  {
    name: 'fx_stripe_v',
    filename: 'fx_stripe_v.png',
    subdir: 'fx',
    prompt: 'Bright glowing vertical light stripe effect, white-yellow energy beam glow, magical sparkles, transparent edges fading out, tall vertical beam, game VFX effect, on plain black background, no text.',
    width: 64,
    height: 256,
    removeBg: true,
    aspectRatio: '9:16',
  },
  {
    name: 'fx_bomb',
    filename: 'fx_bomb.png',
    subdir: 'fx',
    prompt: 'Glowing pulsing star burst explosion effect, white-yellow rays radiating from center, cartoon style, magical sparkles, game VFX effect, on plain black background, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'fx_rainbow',
    filename: 'fx_rainbow.png',
    subdir: 'fx',
    prompt: 'Sparkling rainbow color circle effect, all rainbow colors shimmering, magical glow, rotating light particles, game VFX effect, on plain black background, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },

  // ── Blockers (remove bg) ──
  {
    name: 'blocker_ice',
    filename: 'blocker_ice.png',
    subdir: 'blockers',
    prompt: 'Transparent ice crystal overlay square shape, blue tint, frost texture, cracked edges, cold sparkles, cartoon game style, isolated on plain white background, game asset, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'blocker_rock',
    filename: 'blocker_rock.png',
    subdir: 'blockers',
    prompt: 'Dark rough stone boulder, irregular shape, gray-brown color, rocky texture, cartoon game style, isolated on plain white background, game asset, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },
  {
    name: 'blocker_key',
    filename: 'blocker_key.png',
    subdir: 'blockers',
    prompt: 'Golden ornate key, shiny metallic, decorative handle, cartoon game style, game collectible item, isolated on plain white background, no text.',
    width: 128,
    height: 128,
    removeBg: true,
  },
];

// ── Replicate API helpers ────────────────────────────────────

const headers = {
  'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
  'Content-Type': 'application/json',
  'Prefer': 'wait',
};

/**
 * Resolve the latest version ID for a Replicate model.
 */
async function getModelLatestVersion(modelOwner, modelName) {
  const url = `${REPLICATE_BASE}/models/${modelOwner}/${modelName}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get model ${modelOwner}/${modelName}: ${res.status} ${text}`);
  }
  const data = await res.json();
  const version = data.latest_version?.id;
  if (!version) {
    throw new Error(`No latest_version found for ${modelOwner}/${modelName}`);
  }
  return version;
}

/**
 * Create a prediction and poll until complete.
 */
async function createPrediction(version, input) {
  const res = await fetch(`${REPLICATE_BASE}/predictions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ version, input }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create prediction: ${res.status} ${text}`);
  }

  let prediction = await res.json();

  // Poll until terminal state
  const start = Date.now();
  while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new Error(`Prediction ${prediction.id} timed out after ${POLL_TIMEOUT_MS / 1000}s`);
    }

    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(prediction.urls.get, { headers });
    if (!pollRes.ok) {
      const text = await pollRes.text();
      throw new Error(`Failed to poll prediction ${prediction.id}: ${pollRes.status} ${text}`);
    }
    prediction = await pollRes.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Prediction failed: ${prediction.error || 'unknown error'}`);
  }

  if (prediction.status === 'canceled') {
    throw new Error(`Prediction was canceled`);
  }

  return prediction;
}

/**
 * Download an image from URL and save to disk.
 */
async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(filepath, buffer);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine the best aspect_ratio param for flux model
 * based on desired width/height.
 */
function getFluxAspectRatio(asset) {
  if (asset.aspectRatio) return asset.aspectRatio;
  const ratio = asset.width / asset.height;
  // Only valid values: 1:1, 16:9, 3:2, 2:3, 4:5, 5:4, 9:16, 3:4, 4:3
  if (ratio > 1.6) return '16:9';
  if (ratio > 1.3) return '3:2';
  if (ratio > 1.1) return '5:4';
  if (ratio > 0.9) return '1:1';
  if (ratio > 0.7) return '4:5';
  if (ratio > 0.6) return '3:4';
  if (ratio > 0.5) return '2:3';
  return '9:16';
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('===========================================');
  console.log('  GemCraft — Asset Generation Script');
  console.log('===========================================');
  console.log('');

  // Create output directories
  const subdirs = ['', 'gems', 'ui', 'fx', 'blockers'];
  for (const sub of subdirs) {
    const dir = join(ASSETS_DIR, sub);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`[DIR] Created: ${dir}`);
    }
  }

  // Resolve model versions
  console.log('');
  console.log('[INIT] Resolving model versions...');

  let imageVersion;
  try {
    imageVersion = await getModelLatestVersion('black-forest-labs', 'flux-1.1-pro');
    console.log(`[OK] flux-1.1-pro version: ${imageVersion}`);
  } catch (e) {
    console.error(`[ERROR] Could not resolve flux-1.1-pro: ${e.message}`);
    console.log('[FALLBACK] Trying stability-ai/sdxl...');
    try {
      imageVersion = await getModelLatestVersion('stability-ai', 'sdxl');
      console.log(`[OK] sdxl version: ${imageVersion}`);
    } catch (e2) {
      console.error(`[FATAL] Could not resolve any image model: ${e2.message}`);
      process.exit(1);
    }
  }

  let removeBgVersion;
  try {
    removeBgVersion = await getModelLatestVersion('lucataco', 'remove-bg');
    console.log(`[OK] remove-bg version: ${removeBgVersion}`);
  } catch (e) {
    console.error(`[WARN] Could not resolve remove-bg: ${e.message}`);
    console.log('[WARN] Background removal will be skipped');
  }

  console.log('');

  // Filter already generated assets
  const pending = [];
  const skipped = [];

  for (const asset of ASSETS) {
    const outputPath = join(ASSETS_DIR, asset.subdir, asset.filename);
    if (existsSync(outputPath)) {
      skipped.push(asset.name);
    } else {
      pending.push(asset);
    }
  }

  if (skipped.length > 0) {
    console.log(`[SKIP] Already exist (${skipped.length}): ${skipped.join(', ')}`);
    console.log('');
  }

  if (pending.length === 0) {
    console.log('[DONE] All assets already generated. Nothing to do.');
    console.log('       Delete files from public/assets/ to regenerate.');
    return;
  }

  console.log(`[PLAN] Will generate ${pending.length} assets:`);
  for (const asset of pending) {
    const bgTag = asset.removeBg ? ' + remove bg' : '';
    console.log(`       - ${asset.filename} (${asset.width}x${asset.height}${bgTag})`);
  }
  console.log('');

  // Generate assets
  const total = pending.length;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const asset = pending[i];
    const idx = `[${i + 1}/${total}]`;
    const rawPath = join(ASSETS_DIR, asset.subdir, `_raw_${asset.filename}`);
    const finalPath = join(ASSETS_DIR, asset.subdir, asset.filename);

    console.log(`${idx} Generating ${asset.name}...`);

    let retries = 0;
    let generated = false;

    while (retries < MAX_RETRIES && !generated) {
      try {
        // Step 1: Generate image
        const aspectRatio = getFluxAspectRatio(asset);
        const input = {
          prompt: asset.prompt,
          aspect_ratio: aspectRatio,
          output_format: 'png',
          output_quality: 100,
          safety_tolerance: 5,
          prompt_upsampling: true,
        };

        const prediction = await createPrediction(imageVersion, input);

        // Get output URL — flux returns a single URL string, sdxl returns array
        let outputUrl;
        if (typeof prediction.output === 'string') {
          outputUrl = prediction.output;
        } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
          outputUrl = prediction.output[0];
        } else {
          throw new Error(`Unexpected output format: ${JSON.stringify(prediction.output)}`);
        }

        // Step 2: Download raw image
        const savePath = asset.removeBg ? rawPath : finalPath;
        await downloadImage(outputUrl, savePath);
        console.log(`${idx} Downloaded raw image`);

        // Step 3: Remove background if needed
        if (asset.removeBg && removeBgVersion) {
          console.log(`${idx} Removing background...`);

          // Upload via URL — need to provide the raw image URL from replicate (still valid for a while)
          // For remove-bg we need to pass the image. We'll use the Replicate output URL directly.
          const bgInput = {
            image: outputUrl,
          };

          const bgPrediction = await createPrediction(removeBgVersion, bgInput);

          let bgOutputUrl;
          if (typeof bgPrediction.output === 'string') {
            bgOutputUrl = bgPrediction.output;
          } else if (Array.isArray(bgPrediction.output) && bgPrediction.output.length > 0) {
            bgOutputUrl = bgPrediction.output[0];
          } else {
            throw new Error(`Unexpected bg removal output: ${JSON.stringify(bgPrediction.output)}`);
          }

          await downloadImage(bgOutputUrl, finalPath);

          // Clean up raw file
          try {
            const { unlinkSync } = await import('node:fs');
            if (existsSync(rawPath)) unlinkSync(rawPath);
          } catch { /* ignore cleanup errors */ }

          console.log(`${idx} Background removed -> ${asset.filename}`);
        } else if (asset.removeBg && !removeBgVersion) {
          // Fallback: just use raw image if remove-bg is unavailable
          if (existsSync(rawPath)) {
            const { renameSync } = await import('node:fs');
            renameSync(rawPath, finalPath);
          }
          console.log(`${idx} [WARN] Saved without bg removal (model unavailable)`);
        }

        generated = true;
        success++;
        console.log(`${idx} OK: ${asset.filename}`);

      } catch (error) {
        retries++;
        const isRateLimit = error.message.includes('429') || error.message.includes('rate');

        if (retries < MAX_RETRIES) {
          const waitMs = isRateLimit ? 30000 : 5000;
          console.log(`${idx} [RETRY ${retries}/${MAX_RETRIES}] ${error.message}`);
          console.log(`${idx} Waiting ${waitMs / 1000}s before retry...`);
          await sleep(waitMs);
        } else {
          console.error(`${idx} [FAILED] ${asset.name}: ${error.message}`);
          failed++;
        }
      }
    }

    // Delay between requests
    if (i < pending.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  // Summary
  console.log('');
  console.log('===========================================');
  console.log('  Generation Complete');
  console.log('===========================================');
  console.log(`  Total:   ${total}`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log('');

  if (failed > 0) {
    console.log('  [TIP] Re-run the script to retry failed assets');
    console.log('        (existing files will be skipped)');
  }

  console.log(`  Output:  ${ASSETS_DIR}/`);
  console.log('');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
