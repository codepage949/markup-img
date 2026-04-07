import { dirname, basename, resolve } from "jsr:@std/path";

const NEUTRALINO_VERSION = "6.7.0";

export function getNeutralinoBinaryName(os: string, arch: string): string {
  if (os === "linux") {
    if (arch === "aarch64") return "neutralino-linux_arm64";
    return "neutralino-linux_x64";
  } else if (os === "darwin") {
    if (arch === "aarch64") return "neutralino-mac_arm64";
    return "neutralino-mac_x64";
  } else if (os === "windows") {
    return "neutralino-win_x64.exe";
  }
  throw new Error(`Unsupported platform: ${os} / ${arch}`);
}

export function isStdoutPath(p: string): boolean {
  return p === "-" || p === "-.png" || p === "-.jpg" || p === "-.jpeg";
}

export function getStdoutFormat(p: string): "png" | "jpg" {
  return p.endsWith(".jpg") || p.endsWith(".jpeg") ? "jpg" : "png";
}

async function ensureNeutralinoBinary(binPath: string): Promise<void> {
  try {
    await Deno.stat(binPath);
    return;
  } catch {
    // 바이너리 없음, 다운로드 진행
  }

  const binName = basename(binPath);
  const zipUrl = `https://github.com/neutralinojs/neutralinojs/releases/download/v${NEUTRALINO_VERSION}/neutralinojs-v${NEUTRALINO_VERSION}.zip`;

  console.error(`Neutralinojs binary not found. Downloading v${NEUTRALINO_VERSION}...`);

  const response = await fetch(zipUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Neutralinojs: HTTP ${response.status}`);
  }

  const tempZip = await Deno.makeTempFile({ suffix: ".zip" });
  try {
    await Deno.writeFile(tempZip, new Uint8Array(await response.arrayBuffer()));

    const destDir = dirname(binPath);

    if (Deno.build.os === "windows") {
      const { code } = await new Deno.Command("powershell", {
        args: [
          "-Command",
          `Add-Type -Assembly System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory('${tempZip}', '${destDir}')`,
        ],
      }).output();
      if (code !== 0) throw new Error("Failed to extract zip on Windows");
    } else {
      const { code } = await new Deno.Command("unzip", {
        args: ["-o", tempZip, binName, "-d", destDir],
      }).output();
      if (code !== 0) throw new Error("Failed to extract zip");
      await Deno.chmod(binPath, 0o755);
    }

    console.error("Download complete.");
  } finally {
    await Deno.remove(tempZip).catch(() => {});
  }
}

if (import.meta.main) {
  const htmlPath = Deno.args[0];
  const outputPath = Deno.args[1] ?? "result.png";

  if (!htmlPath) {
    console.error("Usage: markup-img <html-path> [output-path]");
    Deno.exit(1);
  }

  const absHtmlPath = resolve(htmlPath);
  const toStdout = isStdoutPath(outputPath);
  const actualOutputPath = toStdout
    ? await Deno.makeTempFile({ suffix: `.${getStdoutFormat(outputPath)}` })
    : resolve(outputPath);

  // 개발 환경(deno run)과 컴파일 바이너리 환경 모두 지원
  const execName = basename(Deno.execPath());
  const binaryDir = execName.startsWith("deno")
    ? import.meta.dirname!
    : dirname(Deno.execPath());

  const resourcesDir = `${binaryDir}/resources`;
  const binName = getNeutralinoBinaryName(Deno.build.os, Deno.build.arch);
  const neutralinoBin = `${binaryDir}/${binName}`;

  // --path=<resourcesDir> 사용 시 neutralinojs의 appPath가 resourcesDir로 설정되어
  // HTTP 서버가 resourcesDir에서 파일을 서빙함.
  // 이에 따라 config도 resourcesDir에 위치해야 함.
  const config = {
    applicationId: "js.neutralino.markup-img",
    version: "1.0.0",
    defaultMode: "window",
    port: 0,
    url: "/index.html",
    enableServer: true,
    enableNativeAPI: true,
    tokenSecurity: "one-time",
    logging: { enabled: false },
    nativeAllowList: ["app.*", "os.*", "filesystem.*", "server.*"],
    modes: {
      window: {
        title: "markup-img",
        width: 1920,
        height: 1080,
        hidden: true,
      },
    },
    cli: {
      binaryName: "neutralino",
      resourcesPath: "/resources/",
      clientLibrary: "/resources/neutralino.js",
      binaryVersion: NEUTRALINO_VERSION,
      clientVersion: NEUTRALINO_VERSION,
    },
  };

  await Deno.writeTextFile(
    `${resourcesDir}/neutralino.config.json`,
    JSON.stringify(config, null, 2),
  );

  await ensureNeutralinoBinary(neutralinoBin);

  const proc = new Deno.Command(neutralinoBin, {
    args: [`--path=${resourcesDir}`],
    env: {
      ...Deno.env.toObject(),
      HTML_PATH: absHtmlPath,
      OUTPUT_PATH: actualOutputPath,
    },
    cwd: binaryDir,
    stdout: "null",
    stderr: "null",
  });

  const { code } = await proc.output();

  if (toStdout) {
    if (code === 0) {
      const data = await Deno.readFile(actualOutputPath);
      await Deno.stdout.write(data);
    }
    await Deno.remove(actualOutputPath).catch(() => {});
  }

  Deno.exit(code);
}
