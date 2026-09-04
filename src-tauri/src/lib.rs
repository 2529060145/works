use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rusqlite::{
    backup::Backup,
    params_from_iter,
    types::{Value as SqlValue, ValueRef},
    Connection, OpenFlags,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Number, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};

struct PortableDatabase {
    connection: Mutex<Option<Connection>>,
    data_directory: PathBuf,
    database_path: PathBuf,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExecuteResult {
    rows_affected: usize,
    last_insert_id: i64,
}

#[derive(Deserialize)]
struct TransactionStatement {
    query: String,
    #[serde(default)]
    values: Vec<Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PortablePaths {
    data_directory: String,
    database_path: String,
    attachment_directory: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredAttachment {
    file_name: String,
    stored_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredProfileFile {
    original_name: String,
    stored_path: String,
    file_extension: String,
    file_size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ManagedFileContent {
    content_base64: String,
    mime_type: String,
}

fn profile_file_metadata(source: &Path, category: &str) -> Result<(String, String, u64), String> {
    if !source.is_file() {
        return Err("选择的文件不存在".to_string());
    }
    let original_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "文件名无效".to_string())?
        .to_string();
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let allowed = match category {
        "proof_materials" => ["pdf", "doc", "docx"].contains(&extension.as_str()),
        "profile_photo" => ["jpg", "jpeg", "png", "webp"].contains(&extension.as_str()),
        _ => false,
    };
    if !allowed {
        return Err("不支持的文件类型".to_string());
    }
    let size = source.metadata().map_err(|error| error.to_string())?.len();
    Ok((original_name, extension, size))
}

#[tauri::command]
fn inspect_profile_file(source: String, category: String) -> Result<StoredProfileFile, String> {
    let source_path = PathBuf::from(&source);
    let (original_name, file_extension, file_size) =
        profile_file_metadata(&source_path, &category)?;
    Ok(StoredProfileFile {
        original_name,
        stored_path: source,
        file_extension,
        file_size,
    })
}

#[tauri::command]
fn read_managed_file(
    state: State<'_, PortableDatabase>,
    path: String,
) -> Result<ManagedFileContent, String> {
    let path = ensure_inside_data_directory(&state, Path::new(&path))?;
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let mime_type = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "pdf" => "application/pdf",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc" => "application/msword",
        _ => "application/octet-stream",
    };
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    Ok(ManagedFileContent {
        content_base64: BASE64.encode(bytes),
        mime_type: mime_type.to_string(),
    })
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn open_connection(path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(|error| error.to_string())?;
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = DELETE;")
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

fn data_directory_for_executable(executable: &Path) -> Result<PathBuf, String> {
    executable
        .parent()
        .map(|directory| directory.join("data"))
        .ok_or_else(|| "无法确定客户端程序目录".to_string())
}

fn create_portable_database(app: &tauri::App) -> Result<PortableDatabase, String> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    let data_directory = data_directory_for_executable(&executable)?;
    fs::create_dir_all(&data_directory).map_err(|error| {
        format!(
            "无法在程序目录创建 data 文件夹，请将客户端安装或移动到可写目录：{}",
            error
        )
    })?;
    fs::create_dir_all(data_directory.join("attachments")).map_err(|error| error.to_string())?;

    let database_path = data_directory.join("job_manager.db");
    if !database_path.exists() {
        if let Ok(legacy_directory) = app.path().app_config_dir() {
            let legacy_database = legacy_directory.join("job_manager.db");
            if legacy_database.is_file() {
                fs::copy(legacy_database, &database_path).map_err(|error| error.to_string())?;
            }
        }
    }

    let connection = open_connection(&database_path)?;
    Ok(PortableDatabase {
        connection: Mutex::new(Some(connection)),
        data_directory,
        database_path,
    })
}

fn json_to_sql(value: Value) -> SqlValue {
    match value {
        Value::Null => SqlValue::Null,
        Value::Bool(value) => SqlValue::Integer(i64::from(value)),
        Value::Number(value) => value
            .as_i64()
            .map(SqlValue::Integer)
            .or_else(|| value.as_f64().map(SqlValue::Real))
            .unwrap_or(SqlValue::Null),
        Value::String(value) => SqlValue::Text(value),
        value => SqlValue::Text(value.to_string()),
    }
}

fn sql_to_json(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(value) => Value::Number(value.into()),
        ValueRef::Real(value) => Number::from_f64(value)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        ValueRef::Text(value) => Value::String(String::from_utf8_lossy(value).into_owned()),
        ValueRef::Blob(value) => Value::Array(
            value
                .iter()
                .map(|byte| Value::Number((*byte).into()))
                .collect(),
        ),
    }
}

#[tauri::command]
fn database_execute(
    state: State<'_, PortableDatabase>,
    query: String,
    values: Vec<Value>,
) -> Result<ExecuteResult, String> {
    let parameters: Vec<SqlValue> = values.into_iter().map(json_to_sql).collect();
    let guard = state.connection.lock().map_err(|error| error.to_string())?;
    let connection = guard
        .as_ref()
        .ok_or_else(|| "数据库当前不可用".to_string())?;
    let rows_affected = connection
        .execute(&query, params_from_iter(parameters.iter()))
        .map_err(|error| error.to_string())?;
    Ok(ExecuteResult {
        rows_affected,
        last_insert_id: connection.last_insert_rowid(),
    })
}

#[tauri::command]
fn database_transaction(
    state: State<'_, PortableDatabase>,
    statements: Vec<TransactionStatement>,
) -> Result<ExecuteResult, String> {
    let mut guard = state.connection.lock().map_err(|error| error.to_string())?;
    let connection = guard
        .as_mut()
        .ok_or_else(|| "数据库当前不可用".to_string())?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let mut rows_affected = 0;
    for statement in statements {
        let parameters: Vec<SqlValue> = statement.values.into_iter().map(json_to_sql).collect();
        rows_affected += transaction
            .execute(&statement.query, params_from_iter(parameters.iter()))
            .map_err(|error| error.to_string())?;
    }
    let last_insert_id = transaction.last_insert_rowid();
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(ExecuteResult {
        rows_affected,
        last_insert_id,
    })
}

#[tauri::command]
fn database_select(
    state: State<'_, PortableDatabase>,
    query: String,
    values: Vec<Value>,
) -> Result<Vec<Value>, String> {
    let parameters: Vec<SqlValue> = values.into_iter().map(json_to_sql).collect();
    let guard = state.connection.lock().map_err(|error| error.to_string())?;
    let connection = guard
        .as_ref()
        .ok_or_else(|| "数据库当前不可用".to_string())?;
    let mut statement = connection
        .prepare(&query)
        .map_err(|error| error.to_string())?;
    let columns: Vec<String> = statement
        .column_names()
        .iter()
        .map(|name| (*name).to_string())
        .collect();
    let mut rows = statement
        .query(params_from_iter(parameters.iter()))
        .map_err(|error| error.to_string())?;
    let mut output = Vec::new();
    while let Some(row) = rows.next().map_err(|error| error.to_string())? {
        let mut object = Map::new();
        for (index, name) in columns.iter().enumerate() {
            object.insert(
                name.clone(),
                sql_to_json(row.get_ref(index).map_err(|error| error.to_string())?),
            );
        }
        output.push(Value::Object(object));
    }
    Ok(output)
}

#[tauri::command]
fn portable_data_paths(state: State<'_, PortableDatabase>) -> PortablePaths {
    PortablePaths {
        data_directory: display_path(&state.data_directory),
        database_path: display_path(&state.database_path),
        attachment_directory: display_path(&state.data_directory.join("attachments")),
    }
}

#[tauri::command]
fn backup_database(state: State<'_, PortableDatabase>, destination: String) -> Result<(), String> {
    let guard = state.connection.lock().map_err(|error| error.to_string())?;
    let connection = guard
        .as_ref()
        .ok_or_else(|| "数据库当前不可用".to_string())?;
    let mut target = Connection::open(destination).map_err(|error| error.to_string())?;
    let backup = Backup::new(connection, &mut target).map_err(|error| error.to_string())?;
    backup
        .run_to_completion(5, Duration::from_millis(100), None)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn restore_database(state: State<'_, PortableDatabase>, source: String) -> Result<(), String> {
    let source_path = PathBuf::from(source);
    let check = Connection::open_with_flags(&source_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("备份文件无效：{}", error))?;
    let integrity: String = check
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if integrity != "ok" {
        return Err(format!("备份文件完整性检查失败：{}", integrity));
    }
    drop(check);

    let mut guard = state.connection.lock().map_err(|error| error.to_string())?;
    guard.take();
    if let Err(error) = fs::copy(&source_path, &state.database_path) {
        *guard = Some(open_connection(&state.database_path)?);
        return Err(error.to_string());
    }
    *guard = Some(open_connection(&state.database_path)?);
    Ok(())
}

fn ensure_inside_data_directory(state: &PortableDatabase, path: &Path) -> Result<PathBuf, String> {
    let canonical_data = state
        .data_directory
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let canonical_path = path.canonicalize().map_err(|error| error.to_string())?;
    if !canonical_path.starts_with(canonical_data) {
        return Err("拒绝访问程序数据目录之外的文件".to_string());
    }
    Ok(canonical_path)
}

#[tauri::command]
fn copy_attachment(
    state: State<'_, PortableDatabase>,
    source: String,
    job_id: i64,
) -> Result<StoredAttachment, String> {
    let source_path = PathBuf::from(source);
    if !source_path.is_file() {
        return Err("选择的附件不存在".to_string());
    }
    let file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "附件文件名无效".to_string())?
        .to_string();
    let safe_name: String = file_name
        .chars()
        .map(|character| {
            if character.is_alphanumeric() || ".-_".contains(character) {
                character
            } else {
                '_'
            }
        })
        .collect();
    let directory = state
        .data_directory
        .join("attachments")
        .join(job_id.to_string());
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let destination = directory.join(format!("{}_{}", stamp, safe_name));
    fs::copy(source_path, &destination).map_err(|error| error.to_string())?;
    Ok(StoredAttachment {
        file_name,
        stored_path: display_path(&destination),
    })
}

#[tauri::command]
fn copy_profile_file(
    state: State<'_, PortableDatabase>,
    source: String,
    category: String,
) -> Result<StoredProfileFile, String> {
    let source_path = PathBuf::from(source);
    let (original_name, file_extension, _) = profile_file_metadata(&source_path, &category)?;
    let safe_name: String = original_name
        .chars()
        .map(|character| {
            if character.is_alphanumeric() || ".-_".contains(character) {
                character
            } else {
                '_'
            }
        })
        .collect();
    let directory = state.data_directory.join(&category);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let destination = directory.join(format!("{}_{}", stamp, safe_name));
    let file_size = fs::copy(&source_path, &destination).map_err(|error| error.to_string())?;
    Ok(StoredProfileFile {
        original_name,
        stored_path: display_path(&destination),
        file_extension,
        file_size,
    })
}

#[tauri::command]
fn delete_portable_file(state: State<'_, PortableDatabase>, path: String) -> Result<(), String> {
    let path = ensure_inside_data_directory(&state, Path::new(&path))?;
    fs::remove_file(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_managed_file(state: State<'_, PortableDatabase>, path: String) -> Result<(), String> {
    let requested = PathBuf::from(&path);
    if requested.exists() {
        let managed = ensure_inside_data_directory(&state, &requested)?;
        return fs::remove_file(managed).map_err(|error| error.to_string());
    }
    let parent = requested
        .parent()
        .ok_or_else(|| "文件路径无效".to_string())?;
    let canonical_parent = parent.canonicalize().map_err(|error| error.to_string())?;
    let canonical_data = state
        .data_directory
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !canonical_parent.starts_with(canonical_data) {
        return Err("拒绝访问程序数据目录之外的文件".to_string());
    }
    Ok(())
}

#[tauri::command]
fn open_portable_path(state: State<'_, PortableDatabase>, path: String) -> Result<(), String> {
    let path = ensure_inside_data_directory(&state, Path::new(&path))?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn reveal_portable_file(state: State<'_, PortableDatabase>, path: String) -> Result<(), String> {
    let path = ensure_inside_data_directory(&state, Path::new(&path))?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(format!("/select,{}", display_path(&path)))
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let database = create_portable_database(app)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(database);
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
            database_execute,
            database_transaction,
            database_select,
            portable_data_paths,
            backup_database,
            restore_database,
            copy_attachment,
            copy_profile_file,
            inspect_profile_file,
            read_managed_file,
            delete_portable_file,
            delete_managed_file,
            open_portable_path,
            reveal_portable_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_file(extension: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("job-manager-profile-{unique}.{extension}"));
        fs::write(&path, b"test").unwrap();
        path
    }

    #[test]
    fn portable_data_directory_follows_executable() {
        let executable = Path::new(r"F:\求职投递管理\job-manager-portable.exe");
        assert_eq!(
            data_directory_for_executable(executable).unwrap(),
            PathBuf::from(r"F:\求职投递管理\data")
        );
    }

    #[test]
    fn sqlite_connection_can_read_and_write() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute("CREATE TABLE sample(id INTEGER PRIMARY KEY, name TEXT)", [])
            .unwrap();
        connection
            .execute("INSERT INTO sample(name) VALUES (?)", ["岗位"])
            .unwrap();
        let name: String = connection
            .query_row("SELECT name FROM sample WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "岗位");
    }

    #[test]
    fn profile_photo_accepts_supported_image_formats() {
        for extension in ["jpg", "jpeg", "png", "webp"] {
            let path = temporary_file(extension);
            let metadata = profile_file_metadata(&path, "profile_photo").unwrap();
            assert_eq!(metadata.1, extension);
            fs::remove_file(path).unwrap();
        }
    }

    #[test]
    fn profile_photo_rejects_unsupported_files() {
        let path = temporary_file("gif");
        let result = profile_file_metadata(&path, "profile_photo");
        fs::remove_file(path).unwrap();
        assert_eq!(result.unwrap_err(), "不支持的文件类型");
    }
}
