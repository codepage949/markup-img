use markup_img::{NEUTRALINO_VERSION, get_neutralino_binary_name, is_windows_executable};
use std::fs::{self, File};
use std::io;
use std::path::PathBuf;
use zip::ZipArchive;

fn dest_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(markup_img::find_runtime_root()?)
}

#[cfg(unix)]
fn set_executable_if_needed(path: &std::path::Path) -> io::Result<()> {
    use std::os::unix::fs::PermissionsExt;

    if is_windows_executable(path) {
        return Ok(());
    }

    let mut perms = fs::metadata(path)?.permissions();
    perms.set_mode(0o755);
    fs::set_permissions(path, perms)
}

#[cfg(not(unix))]
fn set_executable_if_needed(_path: &std::path::Path) -> io::Result<()> {
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bin_name = get_neutralino_binary_name(std::env::consts::OS, std::env::consts::ARCH)?;
    let root = dest_dir()?;
    let zip_url = format!(
        "https://github.com/neutralinojs/neutralinojs/releases/download/v{0}/neutralinojs-v{0}.zip",
        NEUTRALINO_VERSION
    );

    println!("Downloading Neutralinojs v{NEUTRALINO_VERSION}...");
    let mut response = ureq::get(&zip_url).call()?;
    let bytes = response.body_mut().read_to_vec()?;
    let reader = std::io::Cursor::new(bytes);
    let mut archive = ZipArchive::new(reader)?;
    let mut names = Vec::new();

    for index in 0..archive.len() {
        let mut file = archive.by_index(index)?;
        let out_path = root.join(file.name());

        if file.name().ends_with('/') {
            fs::create_dir_all(&out_path)?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut output = File::create(&out_path)?;
        io::copy(&mut file, &mut output)?;
        set_executable_if_needed(&out_path)?;
        names.push(file.name().to_string());
    }

    println!("Downloaded: {}", names.join(", "));
    let _ = root.join(bin_name);
    Ok(())
}
