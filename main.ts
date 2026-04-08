import { dirname, basename, resolve } from "@std/path";

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

export function isStdinPath(p: string): boolean {
  return p === "-";
}

export function isHelpFlag(p: string | undefined): boolean {
  return p === "-h" || p === "--help";
}

export function getHelpText(): string {
  return [
    "Usage: markup-img <html-path> [output-path]",
    "",
    "Arguments:",
    "  <html-path>    HTML file path or '-' to read HTML from stdin",
    "  [output-path]  Output file path, or '-' / '-.png' / '-.jpg' for stdout",
    "",
    "Examples:",
    "  markup-img page.html",
    "  markup-img page.html output.png",
    "  markup-img page.html output.jpg",
    "  cat page.html | markup-img - output.png",
    "  markup-img page.html - > output.png",
    "  cat page.html | markup-img - -",
    "",
    "Notes:",
    "  - If '#markup-img' exists, only that element is captured.",
    "  - On Linux without DISPLAY, Xvfb is started automatically when available.",
  ].join("\n");
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

async function createHtmlInputFile(htmlPath: string): Promise<{ path: string; temporary: boolean }> {
  if (!isStdinPath(htmlPath)) {
    return { path: resolve(htmlPath), temporary: false };
  }

  const html = await new Response(Deno.stdin.readable).text();
  let tempPath: string;

  try {
    // stdin HTML의 상대 경로가 현재 작업 디렉터리 기준으로 해석되도록 한다.
    tempPath = await Deno.makeTempFile({
      dir: Deno.cwd(),
      prefix: ".markup-img-stdin-",
      suffix: ".html",
    });
  } catch {
    tempPath = await Deno.makeTempFile({
      prefix: "markup-img-stdin-",
      suffix: ".html",
    });
  }

  await Deno.writeTextFile(tempPath, html);
  return { path: tempPath, temporary: true };
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

  if (isHelpFlag(htmlPath)) {
    console.log(getHelpText());
    Deno.exit(0);
  }

  if (!htmlPath) {
    console.error(getHelpText());
    Deno.exit(1);
  }

  const htmlInput = await createHtmlInputFile(htmlPath);
  const absHtmlPath = htmlInput.path;
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
    if (htmlInput.temporary) {
      await Deno.remove(htmlInput.path).catch(() => {});
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
