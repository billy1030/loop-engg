use std::process::Command;

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

      // Automatically spawn the backend server in background if not already listening on port 7009
      std::thread::spawn(|| {
        let server_dir = "c:\\ai\\loop-engg";
        // Check if port 7009 is already listening
        let check = Command::new("powershell")
          .args(&[
            "-NoProfile",
            "-Command",
            "$c = Get-NetTCPConnection -LocalPort 7009 -State Listen -ErrorAction SilentlyContinue; if (!$c) { exit 1 } else { exit 0 }",
          ])
          .status();

        if let Ok(status) = check {
          if !status.success() {
            let _ = Command::new("powershell")
              .args(&[
                "-NoProfile",
                "-Command",
                &format!("cd '{}'; npx tsx src/server.ts", server_dir),
              ])
              .spawn();
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
