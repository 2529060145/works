import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ProofMaterial, SelectedProofFile } from "../types/proofMaterial";
import { execute, select } from "./databaseService";

interface StoredProfileFile {
  originalName: string;
  storedPath: string;
  fileExtension: string;
  fileSize: number;
}
interface ManagedFileContent {
  contentBase64: string;
  mimeType: string;
}

export interface ProofMaterialQuery {
  keyword?: string;
  fileType?: "" | "PDF" | "WORD";
  category?: string;
  sort?: "recent" | "oldest" | "name" | "size";
}

export async function listProofMaterials(query: ProofMaterialQuery = {}) {
  const clauses = ["1=1"],
    values: unknown[] = [];
  if (query.keyword?.trim()) {
    clauses.push("(display_name LIKE ? OR original_name LIKE ?)");
    const value = `%${query.keyword.trim()}%`;
    values.push(value, value);
  }
  if (query.fileType === "PDF") clauses.push("file_extension='pdf'");
  if (query.fileType === "WORD")
    clauses.push("file_extension IN ('doc','docx')");
  if (query.category) {
    clauses.push("category=?");
    values.push(query.category);
  }
  const order = {
    recent: "created_at DESC",
    oldest: "created_at ASC",
    name: "display_name COLLATE NOCASE ASC",
    size: "file_size DESC",
  }[query.sort ?? "recent"];
  return select<ProofMaterial>(
    `SELECT id,display_name AS "displayName",original_name AS "originalName",file_path AS "filePath",file_extension AS "fileExtension",file_size AS "fileSize",category,created_at AS "createdAt",updated_at AS "updatedAt" FROM proof_materials WHERE ${clauses.join(" AND ")} ORDER BY ${order}`,
    values,
  );
}

export async function chooseProofFile(): Promise<SelectedProofFile | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "证明材料", extensions: ["pdf", "doc", "docx"] }],
  });
  if (!selected || Array.isArray(selected)) return null;
  const originalName = selected.split(/[\\/]/).pop() ?? "",
    extension = originalName.split(".").pop()?.toLowerCase();
  if (!["pdf", "doc", "docx"].includes(extension ?? ""))
    throw new Error("只支持 PDF、DOC 和 DOCX 文件");
  const metadata = await invoke<StoredProfileFile>("inspect_profile_file", {
    source: selected,
    category: "proof_materials",
  });
  return {
    sourcePath: selected,
    originalName,
    extension: extension as SelectedProofFile["extension"],
    fileSize: metadata.fileSize,
  };
}

export async function uploadProofMaterial(
  file: SelectedProofFile,
  displayName: string,
  category: string,
) {
  if (!displayName.trim()) throw new Error("请填写文件备注名称");
  const stored = await invoke<StoredProfileFile>("copy_profile_file", {
    source: file.sourcePath,
    category: "proof_materials",
  });
  try {
    return await execute(
      "INSERT INTO proof_materials(display_name,original_name,file_path,file_extension,file_size,category) VALUES (?,?,?,?,?,?)",
      [
        displayName.trim(),
        stored.originalName,
        stored.storedPath,
        stored.fileExtension,
        stored.fileSize,
        category || "未分类",
      ],
    );
  } catch (error) {
    await invoke("delete_managed_file", { path: stored.storedPath }).catch(
      () => undefined,
    );
    throw error;
  }
}

export async function updateProofMaterial(
  id: number,
  displayName: string,
  category: string,
) {
  if (!displayName.trim()) throw new Error("请填写文件备注名称");
  await execute(
    "UPDATE proof_materials SET display_name=?,category=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    [displayName.trim(), category || "未分类", id],
  );
}
export async function openProofMaterial(item: ProofMaterial) {
  await invoke("open_portable_path", { path: item.filePath });
}
export async function readProofMaterial(item: ProofMaterial) {
  const file = await invoke<ManagedFileContent>("read_managed_file", {
    path: item.filePath,
  });
  const binary = atob(file.contentBase64),
    bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return { bytes, mimeType: file.mimeType };
}
export async function replaceProofMaterialFile(item: ProofMaterial) {
  const selected = await chooseProofFile();
  if (!selected) return null;
  const stored = await invoke<StoredProfileFile>("copy_profile_file", {
    source: selected.sourcePath,
    category: "proof_materials",
  });
  try {
    await execute(
      "UPDATE proof_materials SET original_name=?,file_path=?,file_extension=?,file_size=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [
        stored.originalName,
        stored.storedPath,
        stored.fileExtension,
        stored.fileSize,
        item.id,
      ],
    );
  } catch (error) {
    await invoke("delete_managed_file", { path: stored.storedPath }).catch(
      () => undefined,
    );
    throw error;
  }
  await invoke("delete_managed_file", { path: item.filePath }).catch(
    () => undefined,
  );
  return {
    ...item,
    originalName: stored.originalName,
    filePath: stored.storedPath,
    fileExtension: stored.fileExtension as ProofMaterial["fileExtension"],
    fileSize: stored.fileSize,
  };
}
export async function revealProofMaterial(item: ProofMaterial) {
  await invoke("reveal_portable_file", { path: item.filePath });
}
export async function deleteProofMaterial(item: ProofMaterial) {
  await invoke("delete_managed_file", { path: item.filePath });
  await execute("DELETE FROM proof_materials WHERE id=?", [item.id]);
}
