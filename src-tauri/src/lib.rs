use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

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
        // Resolve application directory dynamically from the current executable
        let exe_dir = std::env::current_exe()
          .ok()
          .and_then(|p| p.parent().map(|d| d.to_path_buf()))
          .unwrap_or_else(|| std::path::PathBuf::from("."));

        let exe_dir_str = exe_dir.to_string_lossy().to_string();

        // Check if dist/server.js exists in current running directory, otherwise fallback to src/server.ts
        let is_dist = exe_dir.join("dist").join("server.js").exists();

        // Helper to run silent powershell command
        let silent_cmd = |cmd: &str| {
          let mut c = Command::new("powershell");
          c.args(&["-NoProfile", "-Command", cmd]);
          #[cfg(target_os = "windows")]
          c.creation_flags(CREATE_NO_WINDOW);
          c
        };

        let make_spawn_cmd = |dir: &str, port: u16| {
          let mut c = Command::new("powershell");
          let run_code = if is_dist {
            format!("cd '{}'; $env:PORT='{}'; node dist/server.js", dir, port)
          } else {
            format!("cd '{}'; $env:PORT='{}'; npx tsx src/server.ts", dir, port)
          };
          c.args(&["-NoProfile", "-Command", &run_code]);
          #[cfg(target_os = "windows")]
          c.creation_flags(CREATE_NO_WINDOW);
          c
        };

        // 1. Check if port 7009 is already busy
        let is_7009_busy = silent_cmd(
          "$c = Get-NetTCPConnection -LocalPort 7009 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 1 } else { exit 0 }",
        )
        .status()
        .map(|s| !s.success())
        .unwrap_or(false);

        let target_port = if !is_7009_busy {
          // Port 7009 is free, spawn backend silently on 7009
          let mut c = make_spawn_cmd(&exe_dir_str, 7009);
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
            let mut c = make_spawn_cmd(&exe_dir_str, 8009);
            if let Ok(child) = c.spawn() {
              let mut lock = child_holder.lock().unwrap();
              *lock = Some(child);
            }
            8009
          }
        };

        // Wait for target port to be listening
        for _ in 0..20 {
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

        // Navigate the native window directly to the active port
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
