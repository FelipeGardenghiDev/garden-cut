use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Capabilities {
    pub ffmpeg_installed: bool,
    pub os: String,
}

#[tauri::command]
fn get_system_capabilities() -> Capabilities {
    let ffmpeg_installed = std::process::Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    Capabilities {
        ffmpeg_installed,
        os: "Windows x86_64".to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_system_capabilities])
        .run(tauri::generate_context!())
        .expect("error while running gardencut tauri application");
}
