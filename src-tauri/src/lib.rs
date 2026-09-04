use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// Embed the compiled backend binary and default configuration file directly into minibot.exe
static BACKEND_BIN_BYTES: &[u8] = include_bytes!("../bin/minibot-backend.exe");
static DEFAULT_CONFIG_STR: &str = include_str!("../../minibot.config.json");

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
        let config_path = exe_dir.join("minibot.config.json");
        if !config_path.exists() {
          let _ = fs::write(&config_path, DEFAULT_CONFIG_STR);
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

        let is_port_listening = |port: u16| -> bool {
          std::net::TcpStream::connect_timeout(
            &std::net::SocketAddr::from(([127, 0, 0, 1], port)),
            std::time::Duration::from_millis(150),
          )
          .is_ok()
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
        let is_7009_busy = is_port_listening(7009);

        let target_port = if !is_7009_busy {
          // Port 7009 is free, spawn backend on 7009
          let mut c = make_spawn_cmd(7009);
          if let Ok(child) = c.spawn() {
            let mut lock = child_holder.lock().unwrap();
            *lock = Some(child);
          }
          7009
        } else {
          // Port 7009 is already occupied, use port 8009 for backend
          let mut c = make_spawn_cmd(8009);
          if let Ok(child) = c.spawn() {
            let mut lock = child_holder.lock().unwrap();
            *lock = Some(child);
          }
          8009
        };

        // 5. Wait for target port to be listening (native fast TCP poll)
        for _ in 0..50 {
          if is_port_listening(target_port) {
            break;
          }
          std::thread::sleep(std::time::Duration::from_millis(200));
        }

        // Small grace period for express route setup
        std::thread::sleep(std::time::Duration::from_millis(300));

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
