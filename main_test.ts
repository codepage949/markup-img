import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  getNeutralinoBinaryName,
  getNeutralinoLaunchArgs,
  isStdoutPath,
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
