use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

// Progress tracking state
pub struct AppState {
    progress: Arc<Mutex<HashMap<String, ProgressInfo>>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ProgressInfo {
    progress: f32,
    status: String,
}

#[derive(Deserialize)]
pub struct AnimationConfig {
    #[serde(rename = "startLine")]
    start_line: i32,
    #[serde(rename = "endLine")]
    end_line: i32,
    #[serde(rename = "includeComments")]
    include_comments: bool,
    orientation: String,
    #[serde(rename = "lineGroups")]
    line_groups: Vec<String>,
    #[serde(rename = "syntaxColors")]
    syntax_colors: HashMap<String, String>,
    #[serde(rename = "animationTiming")]
    animation_timing: HashMap<String, f64>,
}

#[derive(Serialize)]
pub struct AnimationResult {
    success: bool,
    message: String,
    #[serde(rename = "videoPath")]
    video_path: Option<String>,
    #[serde(rename = "taskId")]
    task_id: String,
}

#[derive(Serialize)]
pub struct ProgressResult {
    progress: f32,
    status: String,
}

// Get the path to the CodeAnimator.py script (bundled with the app)
fn get_animator_script_path(app_handle: &tauri::AppHandle) -> PathBuf {
    // In production, it will be bundled in the resources
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        // Tauri bundles with _up_ for parent directories
        let bundled_path = resource_dir.join("_up_/_up_/CodeAnimator.py");
        if bundled_path.exists() {
            return bundled_path;
        }
        // Also check direct path
        let resource_path = resource_dir.join("CodeAnimator.py");
        if resource_path.exists() {
            return resource_path;
        }
    }

    // Development: use absolute path to the project root
    let dev_paths = [
        PathBuf::from("/Users/glenn/Developer/SoftwareDev/CodeAnimator/CodeAnimator.py"),
        dirs::home_dir()
            .map(|h| h.join("Developer/SoftwareDev/CodeAnimator/CodeAnimator.py"))
            .unwrap_or_default(),
    ];

    for path in &dev_paths {
        if path.exists() {
            return path.clone();
        }
    }

    // Last fallback
    PathBuf::from("/Users/glenn/Developer/SoftwareDev/CodeAnimator/CodeAnimator.py")
}

// Get the path to the bundled manim-runner executable
fn get_manim_runner_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    // In production, it will be bundled in the resources
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        // Tauri bundles with _up_ for parent directories
        let runner_path = resource_dir.join("_up_/_up_/bundled/dist/manim-runner/manim-runner");
        if runner_path.exists() {
            return Some(runner_path);
        }
        // Also check direct path
        let direct_path = resource_dir.join("manim-runner/manim-runner");
        if direct_path.exists() {
            return Some(direct_path);
        }
    }

    // Development: use absolute path to the bundled directory
    let dev_path = PathBuf::from("/Users/glenn/Developer/SoftwareDev/CodeAnimator/bundled/dist/manim-runner/manim-runner");
    if dev_path.exists() {
        return Some(dev_path);
    }

    None
}

// Get the path to the directory containing bundled FFmpeg
fn get_ffmpeg_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    // In production, it will be bundled in the resources
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        // Tauri bundles with _up_ for parent directories
        let ffmpeg_dir = resource_dir.join("_up_/_up_/bundled/dist/manim-runner/_internal");
        let ffmpeg_path = ffmpeg_dir.join("ffmpeg");
        if ffmpeg_path.exists() {
            return Some(ffmpeg_dir);
        }
        // Also check direct path
        let direct_dir = resource_dir.join("manim-runner/_internal");
        if direct_dir.join("ffmpeg").exists() {
            return Some(direct_dir);
        }
    }

    // Development: use absolute path to the bundled directory
    let dev_dir = PathBuf::from("/Users/glenn/Developer/SoftwareDev/CodeAnimator/bundled/dist/manim-runner/_internal");
    let dev_path = dev_dir.join("ffmpeg");
    if dev_path.exists() {
        return Some(dev_dir);
    }

    None
}

// Get outputs directory
fn get_outputs_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("CodeAnimator"));

    let outputs = app_data.join("outputs");
    let _ = fs::create_dir_all(&outputs);
    outputs
}

// Get temp directory for uploads
fn get_temp_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("CodeAnimator"));

    let temp = app_data.join("temp");
    let _ = fs::create_dir_all(&temp);
    temp
}

#[tauri::command]
async fn generate_animation(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    file_path: String,
    file_content: String,
    config: AnimationConfig,
) -> Result<AnimationResult, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // Initialize progress
    {
        let mut progress = state.progress.lock().unwrap();
        progress.insert(
            task_id.clone(),
            ProgressInfo {
                progress: 0.0,
                status: "starting".to_string(),
            },
        );
    }

    // Save the file content to a temp file
    let temp_dir = get_temp_dir(&app_handle);
    let file_name = PathBuf::from(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "code.txt".to_string());
    let temp_file_path = temp_dir.join(&file_name);

    fs::write(&temp_file_path, &file_content).map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Update progress
    {
        let mut progress = state.progress.lock().unwrap();
        progress.insert(
            task_id.clone(),
            ProgressInfo {
                progress: 5.0,
                status: "preparing".to_string(),
            },
        );
    }

    // Create config file for CodeAnimator
    let config_content = format!(
        "{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}",
        temp_file_path.to_string_lossy(),
        config.start_line,
        config.end_line,
        config.include_comments,
        serde_json::to_string(&config.syntax_colors).unwrap_or_default(),
        config.orientation,
        serde_json::to_string(&config.animation_timing).unwrap_or_default(),
        config.line_groups.join("\n")
    );

    let config_path = temp_dir.join("anim_config.txt");
    fs::write(&config_path, &config_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    // Also write to /tmp for compatibility with the Python script
    fs::write("/tmp/anim_config.txt", &config_content).ok();

    // Update progress
    {
        let mut progress = state.progress.lock().unwrap();
        progress.insert(
            task_id.clone(),
            ProgressInfo {
                progress: 10.0,
                status: "rendering".to_string(),
            },
        );
    }

    // Get paths
    let animator_script = get_animator_script_path(&app_handle);
    let outputs_dir = get_outputs_dir(&app_handle);
    let media_dir = temp_dir.join("media");

    // Build output filename
    let base_name = PathBuf::from(&file_path)
        .file_stem()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "output".to_string());
    let output_name = format!("{}_{}-{}", base_name, config.start_line, config.end_line);

    // Build Manim command
    let (quality_args, quality_dir): (Vec<&str>, &str) = if config.orientation == "portrait" {
        (vec!["-r", "1080,1920", "--frame_rate", "60"], "1920p60")
    } else {
        (vec!["-qh"], "1080p60")
    };

    // Start a simple progress simulation (in a real implementation, you'd monitor the media directory)
    let progress_state = Arc::clone(&state.progress);
    let progress_task_id = task_id.clone();
    std::thread::spawn(move || {
        let mut current: f32 = 10.0;
        while current < 90.0 {
            std::thread::sleep(std::time::Duration::from_millis(500));
            current += 2.0;
            if let Ok(mut progress) = progress_state.lock() {
                if let Some(info) = progress.get_mut(&progress_task_id) {
                    if info.status != "complete" && info.status != "error" {
                        info.progress = current.min(90.0);
                        info.status = "rendering".to_string();
                    } else {
                        break;
                    }
                }
            }
        }
    });

    // Try to use bundled manim-runner first, fall back to system manim
    let manim_runner = get_manim_runner_path(&app_handle);
    let ffmpeg_path = get_ffmpeg_path(&app_handle);

    let current_path = std::env::var("PATH").unwrap_or_default();

    // Build PATH with bundled FFmpeg if available
    let enhanced_path = if let Some(ref ffmpeg) = ffmpeg_path {
        format!("{}:{}", ffmpeg.to_string_lossy(), current_path)
    } else {
        // Fallback to system paths
        let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/Users".to_string());
        format!(
            "{}/.pyenv/shims:{}/.pyenv/versions/3.12.8/bin:{}/.local/bin:/usr/local/bin:/opt/homebrew/bin:{}",
            home_dir, home_dir, home_dir, current_path
        )
    };

    let mut cmd = if let Some(ref runner) = manim_runner {
        // Use bundled manim-runner
        let mut c = Command::new(runner);
        c.args(&quality_args)
            .args([
                "--disable_caching",
                "--flush_cache",
                "-o",
                &output_name,
                &animator_script.to_string_lossy(),
                "CodeAnimation",
            ]);
        c
    } else {
        // Fallback to system manim
        let mut c = Command::new("manim");
        c.args(&quality_args)
            .args([
                "--disable_caching",
                "--flush_cache",
                "-o",
                &output_name,
                &animator_script.to_string_lossy(),
                "CodeAnimation",
            ]);
        c
    };

    cmd.current_dir(&temp_dir)
        .env("PATH", &enhanced_path)
        .env("MEDIA_DIR", &media_dir);

    let output = cmd.output().map_err(|e| format!("Failed to run manim: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let mut progress = state.progress.lock().unwrap();
        progress.insert(
            task_id.clone(),
            ProgressInfo {
                progress: 0.0,
                status: "error".to_string(),
            },
        );
        return Err(format!("Manim failed: {}", stderr));
    }

    // Update progress
    {
        let mut progress = state.progress.lock().unwrap();
        progress.insert(
            task_id.clone(),
            ProgressInfo {
                progress: 95.0,
                status: "finalizing".to_string(),
            },
        );
    }

    // Find the generated video
    let video_filename = format!("{}.mp4", output_name);
    let video_path = media_dir
        .join("videos")
        .join("CodeAnimator")
        .join(quality_dir)
        .join(&video_filename);

    if !video_path.exists() {
        // Try alternative paths
        let alt_paths = [
            temp_dir.join("media/videos/CodeAnimator").join(quality_dir).join(&video_filename),
            PathBuf::from(format!("media/videos/CodeAnimator/{}/{}", quality_dir, video_filename)),
        ];

        let mut found_path = None;
        for alt in &alt_paths {
            if alt.exists() {
                found_path = Some(alt.clone());
                break;
            }
        }

        if found_path.is_none() {
            let mut progress = state.progress.lock().unwrap();
            progress.insert(
                task_id.clone(),
                ProgressInfo {
                    progress: 0.0,
                    status: "error".to_string(),
                },
            );
            return Err(format!("Generated video not found at: {:?}", video_path));
        }
    }

    // Copy video to outputs directory
    let final_video_path = outputs_dir.join(&video_filename);
    fs::copy(&video_path, &final_video_path)
        .map_err(|e| format!("Failed to copy video: {}", e))?;

    // Cleanup temp files
    fs::remove_file(&temp_file_path).ok();
    fs::remove_dir_all(&media_dir).ok();

    // Mark complete
    {
        let mut progress = state.progress.lock().unwrap();
        progress.insert(
            task_id.clone(),
            ProgressInfo {
                progress: 100.0,
                status: "complete".to_string(),
            },
        );
    }

    Ok(AnimationResult {
        success: true,
        message: "Animation generated successfully".to_string(),
        video_path: Some(final_video_path.to_string_lossy().to_string()),
        task_id,
    })
}

#[tauri::command]
async fn get_progress(state: State<'_, AppState>, task_id: String) -> Result<ProgressResult, String> {
    let progress = state.progress.lock().unwrap();
    if let Some(info) = progress.get(&task_id) {
        Ok(ProgressResult {
            progress: info.progress,
            status: info.status.clone(),
        })
    } else {
        Err("Task not found".to_string())
    }
}

#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn open_file_location(path: String) -> Result<(), String> {
    let path = PathBuf::from(&path);
    if let Some(parent) = path.parent() {
        #[cfg(target_os = "macos")]
        {
            Command::new("open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "windows")]
        {
            Command::new("explorer")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "linux")]
        {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            progress: Arc::new(Mutex::new(HashMap::new())),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate_animation,
            get_progress,
            read_file_content,
            open_file_location,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
