import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  getHelpText,
  getNeutralinoBinaryName,
  getNeutralinoLaunchArgs,
  getMissingXvfbMessage,
  getXvfbLaunchArgs,
  isHelpFlag,
  isStdinPath,
  isStdoutPath,
  parseDisplayNumber,
  shouldUseXvfb,
  getStdoutFormat,
} from "./main.ts";

Deno.test("플랫폼별 바이너리 이름 반환", async (t) => {
  await t.step("linux x86_64 → neutralino-linux_x64", () => {
    assertEquals(getNeutralinoBinaryName("linux", "x86_64"), "neutralino-linux_x64");
  });

  await t.step("linux aarch64 → neutralino-linux_arm64", () => {
    assertEquals(getNeutralinoBinaryName("linux", "aarch64"), "neutralino-linux_arm64");
  });

  await t.step("darwin x86_64 → neutralino-mac_x64", () => {
    assertEquals(getNeutralinoBinaryName("darwin", "x86_64"), "neutralino-mac_x64");
  });

  await t.step("darwin aarch64 → neutralino-mac_arm64", () => {
    assertEquals(getNeutralinoBinaryName("darwin", "aarch64"), "neutralino-mac_arm64");
  });

  await t.step("windows x86_64 → neutralino-win_x64.exe", () => {
    assertEquals(getNeutralinoBinaryName("windows", "x86_64"), "neutralino-win_x64.exe");
  });

  await t.step("미지원 플랫폼은 오류 발생", () => {
    assertThrows(() => getNeutralinoBinaryName("freebsd", "x86_64"));
  });
});

Deno.test("stdout 경로 판별", async (t) => {
  await t.step("'-'는 stdout 경로", () => {
    assertEquals(isStdoutPath("-"), true);
  });

  await t.step("'-.png'는 stdout 경로", () => {
    assertEquals(isStdoutPath("-.png"), true);
  });

  await t.step("'-.jpg'는 stdout 경로", () => {
    assertEquals(isStdoutPath("-.jpg"), true);
  });

  await t.step("'-.jpeg'는 stdout 경로", () => {
    assertEquals(isStdoutPath("-.jpeg"), true);
  });

  await t.step("일반 파일 경로는 stdout 경로 아님", () => {
    assertEquals(isStdoutPath("output.png"), false);
    assertEquals(isStdoutPath("result.jpg"), false);
    assertEquals(isStdoutPath(""), false);
  });
});

Deno.test("stdout 포맷 감지", async (t) => {
  await t.step("'-'는 png 기본값", () => {
    assertEquals(getStdoutFormat("-"), "png");
  });

  await t.step("'-.png'는 png", () => {
    assertEquals(getStdoutFormat("-.png"), "png");
  });

  await t.step("'-.jpg'는 jpg", () => {
    assertEquals(getStdoutFormat("-.jpg"), "jpg");
  });

  await t.step("'-.jpeg'는 jpg", () => {
    assertEquals(getStdoutFormat("-.jpeg"), "jpg");
  });
});

Deno.test("stdin HTML 경로 판별", async (t) => {
  await t.step("'-'는 stdin HTML 경로", () => {
    assertEquals(isStdinPath("-"), true);
  });

  await t.step("일반 파일 경로는 stdin HTML 경로 아님", () => {
    assertEquals(isStdinPath("test.html"), false);
    assertEquals(isStdinPath(""), false);
  });
});

Deno.test("help 플래그 판별", async (t) => {
  await t.step("'--help'는 help 플래그", () => {
    assertEquals(isHelpFlag("--help"), true);
  });

  await t.step("'-h'는 help 플래그", () => {
    assertEquals(isHelpFlag("-h"), true);
  });

  await t.step("그 외 값은 help 플래그 아님", () => {
    assertEquals(isHelpFlag("-"), false);
    assertEquals(isHelpFlag("test.html"), false);
    assertEquals(isHelpFlag(undefined), false);
  });
});

Deno.test("help 텍스트 생성", () => {
  assertEquals(
    getHelpText().includes("Usage: markup-img <html-path> [output-path]"),
    true,
  );
  assertEquals(
    getHelpText().includes("cat page.html | markup-img - output.png"),
    true,
  );
});

Deno.test("Neutralino 실행 인자 생성", async (t) => {
  await t.step("디렉터리 리소스 모드를 명시한다", () => {
    assertEquals(
      getNeutralinoLaunchArgs("/tmp/resources"),
      ["--res-mode=directory", "--path=/tmp/resources"],
    );
  });

  await t.step("윈도우 스타일 경로도 그대로 path 인자로 포함한다", () => {
    assertEquals(
      getNeutralinoLaunchArgs("C:/work/resources"),
      ["--res-mode=directory", "--path=C:/work/resources"],
    );
  });
});

Deno.test("Xvfb 사용 여부 판별", async (t) => {
  await t.step("linux에서 DISPLAY가 없으면 Xvfb를 사용한다", () => {
    assertEquals(shouldUseXvfb("linux", undefined), true);
    assertEquals(shouldUseXvfb("linux", ""), true);
  });

  await t.step("linux에서 DISPLAY가 있으면 Xvfb를 사용하지 않는다", () => {
    assertEquals(shouldUseXvfb("linux", ":0"), false);
  });

  await t.step("linux가 아니면 Xvfb를 사용하지 않는다", () => {
    assertEquals(shouldUseXvfb("darwin", undefined), false);
    assertEquals(shouldUseXvfb("windows", undefined), false);
  });
});

Deno.test("Xvfb 실행 인자 생성", () => {
  assertEquals(
    getXvfbLaunchArgs(),
    ["-displayfd", "1", "-screen", "0", "1920x1080x24", "-nolisten", "tcp"],
  );
});

Deno.test("Xvfb display 번호 파싱", async (t) => {
  await t.step("숫자 출력에서 DISPLAY 문자열을 만든다", () => {
    assertEquals(parseDisplayNumber("99\n"), ":99");
    assertEquals(parseDisplayNumber("  7  \n"), ":7");
  });

  await t.step("숫자가 아니면 null을 반환한다", () => {
    assertEquals(parseDisplayNumber(""), null);
    assertEquals(parseDisplayNumber("error"), null);
    assertEquals(parseDisplayNumber(":99"), null);
  });
});

Deno.test("Xvfb 미설치 안내 메시지", () => {
  assertEquals(
    getMissingXvfbMessage(),
    "Headless Linux requires Xvfb, but 'Xvfb' was not found in PATH. Install Xvfb or run inside a desktop session.",
  );
});
