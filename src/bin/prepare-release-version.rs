use markup_img::parse_cargo_version_from_tag;
use std::fs;
use toml_edit::{DocumentMut, value};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let tag = std::env::args()
        .nth(1)
        .ok_or("Usage: prepare-release-version <tag>")?;
    let cargo_version = parse_cargo_version_from_tag(&tag)?;

    let cargo_toml_path = markup_img::find_runtime_root()?.join("Cargo.toml");
    let content = fs::read_to_string(&cargo_toml_path)?;
    let mut document = content.parse::<DocumentMut>()?;
    document["package"]["version"] = value(cargo_version);
    fs::write(&cargo_toml_path, document.to_string())?;

    println!("Updated Cargo.toml version to {cargo_version}");
    Ok(())
}
