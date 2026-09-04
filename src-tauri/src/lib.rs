use std::process::Command;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_handle = app.handle().clone();

      std::thread::spawn(move || {
        let server_dir = "c:\\ai\\loop-engg";

        // 1. Check if port 7009 is free or already running our server
        let is_7009_busy = Command::new("powershell")
          .args(&[
            "-NoProfile",
            "-Command",
            "$c = Get-NetTCPConnection -LocalPort 7009 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 1 } else { exit 0 }",
          ])
          .status()
          .map(|s| !s.success())
          .unwrap_or(false);

        let target_port = if !is_7009_busy {
          // Port 7009 is free, spawn backend on 7009
          let _ = Command::new("powershell")
            .args(&[
              "-NoProfile",
              "-Command",
              &format!("cd '{}'; $env:PORT=7009; npx tsx src/server.ts", server_dir),
            ])
            .spawn();
          7009
        } else {
          // Check if 7009 is our own server responding to /api/auth/me
          let is_our_server = Command::new("powershell")
            .args(&[
              "-NoProfile",
              "-Command",
              "$r = Invoke-RestMethod -Uri 'http://localhost:7009/api/auth/me' -TimeoutSec 2 -ErrorAction SilentlyContinue; if ($r) { exit 0 } else { exit 1 }",
            ])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

          if is_our_server {
            7009
          } else {
            // Port 7009 is occupied by another third-party program -> Fallback to Port 8009!
            let _ = Command::new("powershell")
              .args(&[
                "-NoProfile",
                "-Command",
                &format!("cd '{}'; $env:PORT=8009; npx tsx src/server.ts", server_dir),
              ])
              .spawn();
            8009
          }
        };

        // Wait for chosen port to be ready
        for _ in 0..15 {
          let ready = Command::new("powershell")
            .args(&[
              "-NoProfile",
              "-Command",
              &format!("$c = Get-NetTCPConnection -LocalPort {} -State Listen -ErrorAction SilentlyContinue; if ($c) {{{{ exit 0 }}}} else {{{{ exit 1 }}}}", target_port),
            ])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

          if ready {
            break;
          }
          std::thread::sleep(std::time::Duration::from_millis(500));
        }

        // Navigate the main window directly to the active port
        if let Some(window) = app_handle.get_webview_window("main") {
          let target_url = format!("http://localhost:{}/", target_port);
          if let Ok(parsed_url) = target_url.parse() {
            let _ = window.navigate(parsed_url);
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
