use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// Embed the compiled backend binary and default configuration files directly into minibot.exe
static BACKEND_BIN_BYTES: &[u8] = include_bytes!("../bin/minibot-backend.exe");
static DEFAULT_CONFIG_STR: &str = include_str!("../../loop.config.json");
static DEFAULT_ENV_STR: &str = include_str!("../../.env.example");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let child_proc: Arc<Mutex<Option<std::process::Child>>> = Arc::new(Mutex::new(None));
  let child_clone = child_proc.clone();

  tauri::Builder::default()
    .setup(move |app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_handle = app.handle().clone();
      let child_holder = child_clone.clone();

      std::thread::spawn(move || {
        // 1. Resolve application directory dynamically from the current running executable
        let exe_dir = std::env::current_exe()
          .ok()
          .and_then(|p| p.parent().map(|d| d.to_path_buf()))
          .unwrap_or_else(|| PathBuf::from("."));

        // 2. Auto-initialize directory structure and default configuration if absent
        let config_path = exe_dir.join("loop.config.json");
        if !config_path.exists() {
          let _ = fs::write(&config_path, DEFAULT_CONFIG_STR);
        }

        let env_example_path = exe_dir.join(".env.example");
        if !env_example_path.exists() {
          let _ = fs::write(&env_example_path, DEFAULT_ENV_STR);
        }

        let _ = fs::create_dir_all(exe_dir.join("logs"));
        let _ = fs::create_dir_all(exe_dir.join("config"));
        let _ = fs::create_dir_all(exe_dir.join("storage").join("documents"));

        // 3. Extract embedded backend binary to local app data cache
        let local_app_data = std::env::var("LOCALAPPDATA")
          .map(PathBuf::from)
          .unwrap_or_else(|_| exe_dir.clone());
        let cache_bin_dir = local_app_data.join("MiniBot").join("bin");
        let _ = fs::create_dir_all(&cache_bin_dir);

        let target_backend_exe = cache_bin_dir.join("minibot-backend.exe");
        let should_extract = if target_backend_exe.exists() {
          fs::metadata(&target_backend_exe)
            .map(|m| m.len() != BACKEND_BIN_BYTES.len() as u64)
            .unwrap_or(true)
        } else {
          true
        };

        if should_extract {
          if let Ok(mut f) = fs::File::create(&target_backend_exe) {
            let _ = f.write_all(BACKEND_BIN_BYTES);
          }
        }

        // Helper to run silent powershell command
        let silent_cmd = |cmd: &str| {
          let mut c = Command::new("powershell");
          c.args(&["-NoProfile", "-Command", cmd]);
          #[cfg(target_os = "windows")]
          c.creation_flags(CREATE_NO_WINDOW);
          c
        };

        let make_spawn_cmd = |port: u16| {
          let mut c = Command::new(&target_backend_exe);
          c.current_dir(&exe_dir);
          c.env("PORT", port.to_string());
          #[cfg(target_os = "windows")]
          c.creation_flags(CREATE_NO_WINDOW);
          c
        };

        // 4. Check if port 7009 is already busy
        let is_7009_busy = silent_cmd(
          "$c = Get-NetTCPConnection -LocalPort 7009 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 1 } else { exit 0 }",
        )
        .status()
        .map(|s| !s.success())
        .unwrap_or(false);

        let target_port = if !is_7009_busy {
          // Port 7009 is free, spawn backend silently on 7009
          let mut c = make_spawn_cmd(7009);
          if let Ok(child) = c.spawn() {
            let mut lock = child_holder.lock().unwrap();
            *lock = Some(child);
          }
          7009
        } else {
          // Check if 7009 is our own server
          let is_our_server = silent_cmd(
            "$r = Invoke-RestMethod -Uri 'http://localhost:7009/api/auth/me' -TimeoutSec 2 -ErrorAction SilentlyContinue; if ($r) { exit 0 } else { exit 1 }",
          )
          .status()
          .map(|s| s.success())
          .unwrap_or(false);

          if is_our_server {
            7009
          } else {
            // Port 7009 is occupied by another application -> Use Port 8009 silently!
            let mut c = make_spawn_cmd(8009);
            if let Ok(child) = c.spawn() {
              let mut lock = child_holder.lock().unwrap();
              *lock = Some(child);
            }
            8009
          }
        };

        // 5. Wait for target port to be listening
        for _ in 0..25 {
          let ready = silent_cmd(
            &format!("$c = Get-NetTCPConnection -LocalPort {} -State Listen -ErrorAction SilentlyContinue; if ($c) {{{{ exit 0 }}}} else {{{{ exit 1 }}}}", target_port),
          )
          .status()
          .map(|s| s.success())
          .unwrap_or(false);

          if ready {
            break;
          }
          std::thread::sleep(std::time::Duration::from_millis(400));
        }

        // 6. Navigate the native window directly to the active port
        if let Some(window) = app_handle.get_webview_window("main") {
          let target_url = format!("http://localhost:{}/", target_port);
          if let Ok(parsed_url) = target_url.parse() {
            let _ = window.navigate(parsed_url);
          }
        }
      });

      Ok(())
    })
    .on_window_event(move |_window, event| {
      // Clean up child process when window closes
      if let tauri::WindowEvent::Destroyed = event {
        let mut lock = child_proc.lock().unwrap();
        if let Some(mut child) = lock.take() {
          let _ = child.kill();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
