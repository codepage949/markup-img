import { dirname, basename, resolve } from "jsr:@std/path";

const htmlPath = Deno.args[0];
const outputPath = Deno.args[1] ?? "result.png";

if (!htmlPath) {
  console.error("Usage: markup-img <html-path> [output-path]");
  Deno.exit(1);
}

const absHtmlPath = resolve(htmlPath);
const absOutputPath = resolve(outputPath);

// 개발 환경(deno run)과 컴파일 바이너리 환경 모두 지원
const execName = basename(Deno.execPath());
const binaryDir = execName.startsWith("deno")
  ? import.meta.dirname!
  : dirname(Deno.execPath());

const resourcesDir = `${binaryDir}/resources`;
const neutralinoBin = `${binaryDir}/neutralino-linux_x64`;

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
    binaryVersion: "6.7.0",
    clientVersion: "6.7.0",
  },
};

await Deno.writeTextFile(
  `${resourcesDir}/neutralino.config.json`,
  JSON.stringify(config, null, 2),
);

const proc = new Deno.Command(neutralinoBin, {
  args: [`--path=${resourcesDir}`],
  env: {
    ...Deno.env.toObject(),
    HTML_PATH: absHtmlPath,
    OUTPUT_PATH: absOutputPath,
  },
  cwd: binaryDir,
  stdout: "null",
  stderr: "null",
});

const { code } = await proc.output();
Deno.exit(code);
