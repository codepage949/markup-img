use markup_img::{
    find_runtime_root, get_help_text, get_missing_xvfb_message, get_neutralino_binary_name,
    get_neutralino_launch_args, get_stdout_format, get_xvfb_launch_args, html_temp_suffix,
    is_help_flag, is_stdin_path, is_stdout_path, parse_display_number, resolve_output_path,
    should_use_xvfb, temp_html_prefix, to_forward_slashes,
};
use std::env;
use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitCode, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use tempfile::Builder;

const TIMEOUT_MS: u64 = 60_000;

struct HtmlInput {
    path: PathBuf,
    temporary: bool,
}

struct OutputTarget {
    path: PathBuf,
    to_stdout: bool,
}

struct RuntimePaths {
    runtime_root: PathBuf,
    resources_dir: PathBuf,
    neutralino_bin: PathBuf,
}

struct XvfbSession {
    display: String,
    child: Child,
}

struct LaunchContext {
    envs: Vec<(String, String)>,
    inherit_child_stdio: bool,
    _xvfb: Option<XvfbSession>,
}

fn create_html_input_file(html_path: &str) -> Result<HtmlInput, Box<dyn std::error::Error>> {
    if !is_stdin_path(html_path) {
        return Ok(HtmlInput {
            path: fs::canonicalize(html_path)?,
            temporary: false,
        });
    }

    let mut html = String::new();
    io::stdin().read_to_string(&mut html)?;

    let temp_path = create_stdin_temp_path()?;
    fs::write(&temp_path, html)?;

    Ok(HtmlInput {
        path: temp_path,
        temporary: true,
    })
}

impl Drop for HtmlInput {
    fn drop(&mut self) {
        if self.temporary {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn create_stdin_temp_path() -> io::Result<PathBuf> {
    match Builder::new()
        .prefix(temp_html_prefix())
        .suffix(html_temp_suffix())
        .tempfile_in(env::current_dir()?)
    {
        Ok(file) => Ok(file.keep()?.1),
        Err(_) => Ok(Builder::new()
            .prefix("markup-img-stdin-")
            .suffix(html_temp_suffix())
            .tempfile()?
            .keep()?
            .1),
    }
}

fn create_output_target(output_path: &str) -> io::Result<OutputTarget> {
    if is_stdout_path(output_path) {
        let suffix = format!(".{}", get_stdout_format(output_path));
        let path = Builder::new().suffix(&suffix).tempfile()?.keep()?.1;
        Ok(OutputTarget {
            path,
            to_stdout: true,
        })
    } else {
        Ok(OutputTarget {
            path: resolve_output_path(&env::current_dir()?, output_path),
            to_stdout: false,
        })
    }
}

fn start_xvfb_for_headless(
    envs: &[(String, String)],
    inherit_child_stdio: bool,
) -> Result<XvfbSession, Box<dyn std::error::Error>> {
    let mut command = Command::new("Xvfb");
    command.args(get_xvfb_launch_args());
    command.stdout(Stdio::piped());
    if inherit_child_stdio {
        command.stderr(Stdio::inherit());
    } else {
        command.stderr(Stdio::null());
    }

    for (key, value) in envs {
        command.env(key, value);
    }

    let mut child = command.spawn().map_err(|error| match error.kind() {
        io::ErrorKind::NotFound => {
            io::Error::new(io::ErrorKind::NotFound, get_missing_xvfb_message())
        }
        _ => error,
    })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| io::Error::other("Failed to read Xvfb display number"))?;
    let mut reader = BufReader::new(stdout);
    let mut buffer = String::new();
    let display = loop {
        buffer.clear();
        let bytes = reader.read_line(&mut buffer)?;
        if bytes == 0 {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!("Failed to parse Xvfb display number: {}", buffer.trim()).into());
        }
        if let Some(display) = parse_display_number(&buffer) {
            break display;
        }
    };

    Ok(XvfbSession { display, child })
}

impl Drop for XvfbSession {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn wait_with_timeout(child: &mut Child, timeout: Duration) -> io::Result<i32> {
    let start = Instant::now();
    loop {
        if let Some(status) = child.try_wait()? {
            return Ok(status.code().unwrap_or(1));
        }
        if start.elapsed() >= timeout {
            eprintln!(
                "markup-img: timeout after {}s, killing process",
                timeout.as_secs()
            );
            let _ = child.kill();
            let status = child.wait()?;
            return Ok(status.code().unwrap_or(1));
        }
        thread::sleep(Duration::from_millis(50));
    }
}

fn should_inherit_child_stdio() -> bool {
    cfg!(debug_assertions)
}

fn write_stdout_image(path: &Path) -> io::Result<()> {
    let mut file = File::open(path)?;
    let mut stdout = io::stdout().lock();
    io::copy(&mut file, &mut stdout)?;
    stdout.flush()
}

fn build_env_pairs() -> Vec<(String, String)> {
    env::vars().collect()
}

fn resolve_runtime_paths() -> Result<RuntimePaths, Box<dyn std::error::Error>> {
    let runtime_root = find_runtime_root()?;
    let resources_dir = runtime_root.join("resources");
    let bin_name = get_neutralino_binary_name(env::consts::OS, env::consts::ARCH)?;
    let neutralino_bin = runtime_root.join(bin_name);

    Ok(RuntimePaths {
        runtime_root,
        resources_dir,
        neutralino_bin,
    })
}

fn prepare_launch_context() -> Result<LaunchContext, Box<dyn std::error::Error>> {
    let inherit_child_stdio = should_inherit_child_stdio();
    let mut envs = build_env_pairs();
    let mut xvfb = None;

    if should_use_xvfb(env::consts::OS, env::var("DISPLAY").ok().as_deref()) {
        let session = start_xvfb_for_headless(&envs, inherit_child_stdio)?;
        envs.push(("DISPLAY".to_string(), session.display.clone()));
        xvfb = Some(session);
    }

    Ok(LaunchContext {
        envs,
        inherit_child_stdio,
        _xvfb: xvfb,
    })
}

fn build_neutralino_command(
    paths: &RuntimePaths,
    launch_context: &LaunchContext,
    html_input: &HtmlInput,
    output_target: &OutputTarget,
) -> Command {
    let mut child_command = Command::new(&paths.neutralino_bin);
    child_command.args(get_neutralino_launch_args(&to_forward_slashes(
        &paths.resources_dir,
    )));
    child_command.current_dir(&paths.runtime_root);
    child_command.env_clear();
    for (key, value) in &launch_context.envs {
        child_command.env(key, value);
    }
    child_command.env("HTML_PATH", to_forward_slashes(&html_input.path));
    child_command.env("OUTPUT_PATH", to_forward_slashes(&output_target.path));
    if launch_context.inherit_child_stdio {
        child_command.stdout(Stdio::inherit());
        child_command.stderr(Stdio::inherit());
    } else {
        child_command.stdout(Stdio::null());
        child_command.stderr(Stdio::null());
    }

    child_command
}

fn run() -> Result<i32, Box<dyn std::error::Error>> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    let html_path = args.first().map(String::as_str);

    if is_help_flag(html_path) {
        println!("{}", get_help_text());
        return Ok(0);
    }

    let html_path = match html_path {
        Some(path) => path,
        None => {
            eprintln!("{}", get_help_text());
            return Ok(1);
        }
    };

    let output_path = args.get(1).map(String::as_str).unwrap_or("result.png");
    let html_input = create_html_input_file(html_path)?;
    let output_target = create_output_target(output_path)?;
    let runtime_paths = resolve_runtime_paths()?;
    let launch_context = prepare_launch_context()?;

    let mut child_command =
        build_neutralino_command(&runtime_paths, &launch_context, &html_input, &output_target);
    let mut child = child_command.spawn()?;
    let code = wait_with_timeout(&mut child, Duration::from_millis(TIMEOUT_MS))?;

    if output_target.to_stdout {
        if code == 0 {
            write_stdout_image(&output_target.path)?;
        }
        let _ = fs::remove_file(&output_target.path);
    }

    Ok(code)
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => ExitCode::from(code as u8),
        Err(error) => {
            eprintln!("{error}");
            ExitCode::from(1)
        }
    }
}
