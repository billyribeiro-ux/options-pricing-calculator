#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    // Set macOS window background transparency
                    let _ = window.set_shadow(true);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running OptionsQuant application");
}
