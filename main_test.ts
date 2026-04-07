import { assertEquals, assertThrows } from "jsr:@std/assert";
import { getNeutralinoBinaryName } from "./main.ts";

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
