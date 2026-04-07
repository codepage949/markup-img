import { unzipSync } from "fflate";
import { dirname } from "@std/path";
import { getNeutralinoBinaryName } from "../main.ts";

const NEUTRALINO_VERSION = "6.7.0";

const binName = getNeutralinoBinaryName(Deno.build.os, Deno.build.arch);
const destDir = `${import.meta.dirname!}/..`;
const binPath = `${destDir}/${binName}`;


const zipUrl = `https://github.com/neutralinojs/neutralinojs/releases/download/v${NEUTRALINO_VERSION}/neutralinojs-v${NEUTRALINO_VERSION}.zip`;

console.log(`Downloading Neutralinojs v${NEUTRALINO_VERSION}...`);

const response = await fetch(zipUrl);
if (!response.ok) {
  console.error(`Failed to download: HTTP ${response.status}`);
  Deno.exit(1);
}

const zipData = new Uint8Array(await response.arrayBuffer());
const files = unzipSync(zipData);

for (const [name, data] of Object.entries(files)) {
  const outPath = `${destDir}/${name}`;
  await Deno.mkdir(dirname(outPath), { recursive: true });
  await Deno.writeFile(outPath, data);
}

if (Deno.build.os !== "windows") {
  await Deno.chmod(binPath, 0o755);
}

console.log(`Downloaded: ${Object.keys(files).join(", ")}`);
