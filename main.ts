import { dirname, basename, resolve } from "@std/path";

const NEUTRALINO_VERSION = "6.7.0";
const XVFB_SCREEN = "1920x1080x24";

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

export function getNeutralinoLaunchArgs(resourcesDir: string): string[] {
  return [
    "--res-mode=directory",
    `--path=${resourcesDir}`,
  ];
}

export function shouldUseXvfb(os: string, display: string | undefined): boolean {
  return os === "linux" && !display;
}

export function getXvfbLaunchArgs(): string[] {
  return [
    "-displayfd",
    "1",
    "-screen",
    "0",
    XVFB_SCREEN,
    "-nolisten",
    "tcp",
  ];
}

export function parseDisplayNumber(output: string): string | null {
  const match = output.match(/^\s*(\d+)\s*$/m);
  return match ? `:${match[1]}` : null;
}

export function getMissingXvfbMessage(): string {
  return "Headless Linux requires Xvfb, but 'Xvfb' was not found in PATH. Install Xvfb or run inside a desktop session.";
}

async function readXvfbDisplay(stdout: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stdout) {
    throw new Error("Failed to read Xvfb display number");
  }

  const reader = stdout.getReader();
  const decoder = new TextDecoder();
  let output = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      output += decoder.decode(value, { stream: true });
      const display = parseDisplayNumber(output);
      if (display) {
        await reader.cancel();
        return display;
      }
    }
    output += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  throw new Error(`Failed to parse Xvfb display number: ${output.trim()}`);
}

async function startXvfbForHeadless(
  env: Record<string, string>,
  isScript: boolean,
): Promise<{ display: string; child: Deno.ChildProcess }> {
  let xvfbChild: Deno.ChildProcess;

  try {
    xvfbChild = new Deno.Command("Xvfb", {
      args: getXvfbLaunchArgs(),
      env,
      stdout: "piped",
      stderr: isScript ? "inherit" : "null",
    }).spawn();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(getMissingXvfbMessage());
    }
    throw error;
  }

  try {
    const display = await readXvfbDisplay(xvfbChild.stdout);
    return { display, child: xvfbChild };
  } catch (error) {
    xvfbChild.kill("SIGTERM");
    await xvfbChild.status.catch(() => {});
    throw error;
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
  const isScript = execName.startsWith("deno");
  const binaryDir = isScript ? import.meta.dirname! : dirname(Deno.execPath());

  // Neutralinojs에 전달하는 경로는 forward slash로 정규화 (Windows 역슬래시 대응)
  const toFwdSlash = (p: string) => p.replace(/\\/g, "/");

  const resourcesDir = toFwdSlash(`${binaryDir}/resources`);
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

  const TIMEOUT_MS = 60_000;
  const env = Deno.env.toObject();
  let xvfb: { display: string; child: Deno.ChildProcess } | null = null;

  if (shouldUseXvfb(Deno.build.os, env.DISPLAY)) {
    xvfb = await startXvfbForHeadless(env, isScript);
    env.DISPLAY = xvfb.display;
  }

  const child = new Deno.Command(neutralinoBin, {
    args: getNeutralinoLaunchArgs(resourcesDir),
    env: {
      ...env,
      HTML_PATH: toFwdSlash(absHtmlPath),
      OUTPUT_PATH: toFwdSlash(actualOutputPath),
    },
    cwd: binaryDir,
    stdout: isScript ? "inherit" : "null",
    stderr: isScript ? "inherit" : "null",
  }).spawn();

  let code: number;
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    timer = setTimeout(() => {
      console.error(`markup-img: timeout after ${TIMEOUT_MS / 1000}s, killing process`);
      child.kill();
    }, TIMEOUT_MS);

    ({ code } = await child.status);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    if (xvfb) {
      xvfb.child.kill("SIGTERM");
      await xvfb.child.status.catch(() => {});
    }
  }

  if (toStdout) {
    if (code === 0) {
      const data = await Deno.readFile(actualOutputPath);
      await Deno.stdout.write(data);
    }
    await Deno.remove(actualOutputPath).catch(() => {});
  }

  Deno.exit(code);
}
