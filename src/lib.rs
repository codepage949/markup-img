use std::ffi::OsStr;
use std::io;
use std::path::{Path, PathBuf};

pub const XVFB_SCREEN: &str = "1920x1080x24";
pub const NEUTRALINO_VERSION: &str = "6.7.0";

pub fn get_neutralino_binary_name(os: &str, arch: &str) -> Result<&'static str, String> {
    match (os, arch) {
        ("linux", "x86_64") => Ok("neutralino-linux_x64"),
        ("linux", "aarch64") => Ok("neutralino-linux_arm64"),
        ("macos", "x86_64") | ("darwin", "x86_64") => Ok("neutralino-mac_x64"),
        ("macos", "aarch64") | ("darwin", "aarch64") => Ok("neutralino-mac_arm64"),
        ("windows", "x86_64") => Ok("neutralino-win_x64.exe"),
        _ => Err(format!("Unsupported platform: {os} / {arch}")),
    }
}

pub fn is_stdout_path(path: &str) -> bool {
    matches!(path, "-" | "-.png" | "-.jpg" | "-.jpeg")
}

pub fn get_stdout_format(path: &str) -> &'static str {
    if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        "jpg"
    } else {
        "png"
    }
}

pub fn is_stdin_path(path: &str) -> bool {
    path == "-"
}

pub fn is_help_flag(path: Option<&str>) -> bool {
    matches!(path, Some("-h" | "--help"))
}

pub fn get_help_text() -> String {
    [
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
    ]
    .join("\n")
}

pub fn get_neutralino_launch_args(resources_dir: &str) -> Vec<String> {
    vec![
        "--res-mode=directory".to_string(),
        format!("--path={resources_dir}"),
    ]
}

pub fn should_use_xvfb(os: &str, display: Option<&str>) -> bool {
    os == "linux" && display.unwrap_or_default().is_empty()
}

pub fn get_xvfb_launch_args() -> Vec<&'static str> {
    vec![
        "-displayfd",
        "1",
        "-screen",
        "0",
        XVFB_SCREEN,
        "-nolisten",
        "tcp",
    ]
}

pub fn parse_display_number(output: &str) -> Option<String> {
    output
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && line.chars().all(|ch| ch.is_ascii_digit()))
        .map(|line| format!(":{line}"))
}

pub fn get_missing_xvfb_message() -> &'static str {
    "Headless Linux requires Xvfb, but 'Xvfb' was not found in PATH. Install Xvfb or run inside a desktop session."
}

pub fn to_forward_slashes(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

pub fn resolve_output_path(base_dir: &Path, output_path: &str) -> PathBuf {
    let path = PathBuf::from(output_path);
    if path.is_absolute() {
        path
    } else {
        base_dir.join(path)
    }
}

pub fn find_runtime_root() -> io::Result<PathBuf> {
    let exe = std::env::current_exe()?;
    let cwd = std::env::current_dir()?;
    let mut candidates = Vec::new();

    if let Some(dir) = exe.parent() {
        candidates.push(dir.to_path_buf());
        candidates.extend(dir.ancestors().skip(1).map(Path::to_path_buf));
    }
    candidates.push(cwd.clone());
    candidates.extend(cwd.ancestors().skip(1).map(Path::to_path_buf));

    for dir in candidates {
        if dir
            .join("resources")
            .join("neutralino.config.json")
            .is_file()
        {
            return Ok(dir);
        }
    }

    Err(io::Error::new(
        io::ErrorKind::NotFound,
        "Failed to locate runtime root containing resources/neutralino.config.json",
    ))
}

pub fn temp_html_prefix() -> &'static str {
    ".markup-img-stdin-"
}

pub fn html_temp_suffix() -> &'static str {
    ".html"
}

pub fn is_windows_executable(path: &Path) -> bool {
    path.extension() == Some(OsStr::new("exe"))
}

pub fn parse_cargo_version_from_tag(tag: &str) -> Result<&str, String> {
    let version = tag
        .strip_prefix('v')
        .ok_or_else(|| format!("Release tag must start with 'v': {tag}"))?;

    if version.is_empty() {
        return Err("Release tag must include a version after 'v'".to_string());
    }

    let parts = version.split('.').collect::<Vec<_>>();
    if parts.len() != 3 || parts.iter().any(|part| part.is_empty()) {
        return Err(format!(
            "Release tag must be in 'vMAJOR.MINOR.PATCH' format: {tag}"
        ));
    }

    if parts
        .iter()
        .any(|part| !part.chars().all(|ch| ch.is_ascii_digit()))
    {
        return Err(format!(
            "Release tag must contain only numeric MAJOR.MINOR.PATCH parts: {tag}"
        ));
    }

    Ok(version)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn 플랫폼별_바이너리_이름_반환() {
        assert_eq!(
            get_neutralino_binary_name("linux", "x86_64").unwrap(),
            "neutralino-linux_x64"
        );
        assert_eq!(
            get_neutralino_binary_name("linux", "aarch64").unwrap(),
            "neutralino-linux_arm64"
        );
        assert_eq!(
            get_neutralino_binary_name("macos", "x86_64").unwrap(),
            "neutralino-mac_x64"
        );
        assert_eq!(
            get_neutralino_binary_name("macos", "aarch64").unwrap(),
            "neutralino-mac_arm64"
        );
        assert_eq!(
            get_neutralino_binary_name("windows", "x86_64").unwrap(),
            "neutralino-win_x64.exe"
        );
        assert!(get_neutralino_binary_name("freebsd", "x86_64").is_err());
    }

    #[test]
    fn stdout_경로_판별() {
        assert!(is_stdout_path("-"));
        assert!(is_stdout_path("-.png"));
        assert!(is_stdout_path("-.jpg"));
        assert!(is_stdout_path("-.jpeg"));
        assert!(!is_stdout_path("output.png"));
        assert!(!is_stdout_path(""));
    }

    #[test]
    fn stdout_포맷_감지() {
        assert_eq!(get_stdout_format("-"), "png");
        assert_eq!(get_stdout_format("-.png"), "png");
        assert_eq!(get_stdout_format("-.jpg"), "jpg");
        assert_eq!(get_stdout_format("-.jpeg"), "jpg");
    }

    #[test]
    fn stdin_html_경로_판별() {
        assert!(is_stdin_path("-"));
        assert!(!is_stdin_path("test.html"));
        assert!(!is_stdin_path(""));
    }

    #[test]
    fn help_플래그_판별() {
        assert!(is_help_flag(Some("--help")));
        assert!(is_help_flag(Some("-h")));
        assert!(!is_help_flag(Some("-")));
        assert!(!is_help_flag(Some("test.html")));
        assert!(!is_help_flag(None));
    }

    #[test]
    fn help_텍스트_생성() {
        let text = get_help_text();
        assert!(text.contains("Usage: markup-img <html-path> [output-path]"));
        assert!(text.contains("cat page.html | markup-img - output.png"));
    }

    #[test]
    fn neutralino_실행_인자_생성() {
        assert_eq!(
            get_neutralino_launch_args("/tmp/resources"),
            vec!["--res-mode=directory", "--path=/tmp/resources"]
        );
        assert_eq!(
            get_neutralino_launch_args("C:/work/resources"),
            vec!["--res-mode=directory", "--path=C:/work/resources"]
        );
    }

    #[test]
    fn xvfb_사용_여부_판별() {
        assert!(should_use_xvfb("linux", None));
        assert!(should_use_xvfb("linux", Some("")));
        assert!(!should_use_xvfb("linux", Some(":0")));
        assert!(!should_use_xvfb("macos", None));
        assert!(!should_use_xvfb("windows", None));
    }

    #[test]
    fn xvfb_실행_인자_생성() {
        assert_eq!(
            get_xvfb_launch_args(),
            vec![
                "-displayfd",
                "1",
                "-screen",
                "0",
                "1920x1080x24",
                "-nolisten",
                "tcp"
            ]
        );
    }

    #[test]
    fn xvfb_display_번호_파싱() {
        assert_eq!(parse_display_number("99\n").as_deref(), Some(":99"));
        assert_eq!(parse_display_number("  7  \n").as_deref(), Some(":7"));
        assert_eq!(parse_display_number("").as_deref(), None);
        assert_eq!(parse_display_number("error").as_deref(), None);
        assert_eq!(parse_display_number(":99").as_deref(), None);
    }

    #[test]
    fn xvfb_미설치_안내_메시지() {
        assert_eq!(
            get_missing_xvfb_message(),
            "Headless Linux requires Xvfb, but 'Xvfb' was not found in PATH. Install Xvfb or run inside a desktop session."
        );
    }

    #[test]
    fn 경로를_forward_slash로_정규화() {
        assert_eq!(
            to_forward_slashes(&PathBuf::from(r"C:\work\resources")),
            "C:/work/resources"
        );
    }

    #[test]
    fn 상대_출력_경로를_현재_작업_디렉터리_기준으로_해석() {
        let base = PathBuf::from("/work/dir");
        assert_eq!(
            resolve_output_path(&base, "result.png"),
            PathBuf::from("/work/dir/result.png")
        );
        assert_eq!(
            resolve_output_path(&base, "/tmp/result.png"),
            PathBuf::from("/tmp/result.png")
        );
    }

    #[test]
    fn 릴리즈_태그에서_cargo_버전_추출() {
        assert_eq!(parse_cargo_version_from_tag("v1.2.3").unwrap(), "1.2.3");
        assert_eq!(parse_cargo_version_from_tag("v0.0.1").unwrap(), "0.0.1");
    }

    #[test]
    fn 잘못된_릴리즈_태그는_오류를_반환() {
        assert!(parse_cargo_version_from_tag("1.2.3").is_err());
        assert!(parse_cargo_version_from_tag("v1.2").is_err());
        assert!(parse_cargo_version_from_tag("v1.2.x").is_err());
        assert!(parse_cargo_version_from_tag("v").is_err());
    }
}
