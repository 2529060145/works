<script setup lang="ts">
import { nextTick, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpened,
  RefreshRight,
  ZoomIn,
  ZoomOut,
} from "@element-plus/icons-vue";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { renderAsync } from "docx-preview";
import type { ProofMaterial } from "../../types/proofMaterial";
import {
  openProofMaterial,
  readProofMaterial,
  replaceProofMaterialFile,
  revealProofMaterial,
} from "../../services/proofMaterialService";
import { formatLocalDateTime } from "../../utils/dateTimeUtils";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const emit = defineEmits<{ replaced: [] }>();
const visible = ref(false);
const loading = ref(false);
const error = ref("");
const item = ref<ProofMaterial>();
const canvas = ref<HTMLCanvasElement>();
const docxContainer = ref<HTMLElement>();
const previewPane = ref<HTMLElement>();
const pageNumber = ref(1);
const pageCount = ref(0);
const scale = ref(1);
const rotation = ref(0);
let pdfDocument: PDFDocumentProxy | undefined;

function sizeText(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1048576).toFixed(1)} MB`;
}

async function renderPdf() {
  if (!pdfDocument || !canvas.value) return;
  const page = await pdfDocument.getPage(pageNumber.value);
  const viewport = page.getViewport({
    scale: scale.value,
    rotation: rotation.value,
  });
  const context = canvas.value.getContext("2d");
  if (!context) throw new Error("无法创建 PDF 画布");
  canvas.value.width = viewport.width;
  canvas.value.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;
}

async function loadPreview() {
  if (!item.value) return;
  loading.value = true;
  error.value = "";
  pdfDocument = undefined;
  try {
    if (item.value.fileExtension === "doc") {
      error.value = "暂不支持旧版 DOC 客户端内预览，请使用系统默认程序打开。";
      return;
    }
    const { bytes } = await readProofMaterial(item.value);
    await nextTick();
    if (item.value.fileExtension === "pdf") {
      pdfDocument = await getDocument({ data: bytes }).promise;
      pageCount.value = pdfDocument.numPages;
      pageNumber.value = 1;
      scale.value = 1;
      rotation.value = 0;
      await renderPdf();
      return;
    }
    if (!docxContainer.value) throw new Error("无法创建 Word 预览区域");
    docxContainer.value.innerHTML = "";
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    await renderAsync(buffer, docxContainer.value, undefined, {
      className: "docx-page",
      inWrapper: true,
      breakPages: true,
      ignoreWidth: false,
      ignoreHeight: false,
    });
  } catch (reason) {
    error.value =
      reason instanceof Error && reason.message.includes("不存在")
        ? "文件不存在或已被移动，请重新选择文件。"
        : reason instanceof Error
          ? reason.message
          : "文件预览失败";
  } finally {
    loading.value = false;
  }
}

async function open(material: ProofMaterial) {
  item.value = material;
  visible.value = true;
  await nextTick();
  await loadPreview();
}

async function changePage(offset: number) {
  const next = pageNumber.value + offset;
  if (next < 1 || next > pageCount.value) return;
  pageNumber.value = next;
  await renderPdf();
}
async function changeScale(delta: number) {
  scale.value = Math.min(
    3,
    Math.max(0.4, Number((scale.value + delta).toFixed(2))),
  );
  await renderPdf();
}
async function fitWidth() {
  if (!pdfDocument || !previewPane.value) return;
  const page = await pdfDocument.getPage(pageNumber.value);
  const natural = page.getViewport({ scale: 1, rotation: rotation.value });
  scale.value = Math.max(
    0.4,
    (previewPane.value.clientWidth - 48) / natural.width,
  );
  await renderPdf();
}
async function fitPage() {
  if (!pdfDocument || !previewPane.value) return;
  const page = await pdfDocument.getPage(pageNumber.value);
  const natural = page.getViewport({ scale: 1, rotation: rotation.value });
  scale.value = Math.max(
    0.4,
    Math.min(
      (previewPane.value.clientWidth - 48) / natural.width,
      (previewPane.value.clientHeight - 48) / natural.height,
    ),
  );
  await renderPdf();
}
async function rotate() {
  rotation.value = (rotation.value + 90) % 360;
  await renderPdf();
}
async function replaceMissing() {
  if (!item.value) return;
  try {
    const replacement = await replaceProofMaterialFile(item.value);
    if (!replacement) return;
    item.value = replacement;
    emit("replaced");
    ElMessage.success("文件已重新关联");
    await loadPreview();
  } catch (reason) {
    ElMessage.error(
      reason instanceof Error ? reason.message : "重新选择文件失败",
    );
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    class="file-preview-dialog"
    width="min(1180px, 94vw)"
    top="4vh"
    destroy-on-close
  >
    <template #header>
      <div class="preview-header">
        <div>
          <strong>{{ item?.displayName }}</strong
          ><small>{{ item?.originalName }}</small>
        </div>
        <div>
          <el-button
            :icon="FolderOpened"
            @click="item && revealProofMaterial(item)"
            >文件位置</el-button
          >
          <el-button @click="item && openProofMaterial(item)"
            >系统打开</el-button
          >
        </div>
      </div>
    </template>
    <div class="preview-layout">
      <aside v-if="item" class="file-details">
        <h3>文件详情</h3>
        <dl>
          <div>
            <dt>文件类型</dt>
            <dd>{{ item.fileExtension.toUpperCase() }}</dd>
          </div>
          <div>
            <dt>文件大小</dt>
            <dd>{{ sizeText(item.fileSize) }}</dd>
          </div>
          <div>
            <dt>材料分类</dt>
            <dd>{{ item.category }}</dd>
          </div>
          <div>
            <dt>上传时间</dt>
            <dd>{{ formatLocalDateTime(item.createdAt) }}</dd>
          </div>
        </dl>
      </aside>
      <main class="preview-main">
        <div v-if="item?.fileExtension === 'pdf' && !error" class="pdf-toolbar">
          <el-button
            :icon="ArrowLeft"
            title="上一页"
            :disabled="pageNumber <= 1"
            @click="changePage(-1)"
          />
          <span>{{ pageNumber }} / {{ pageCount || 1 }}</span>
          <el-button
            :icon="ArrowRight"
            title="下一页"
            :disabled="pageNumber >= pageCount"
            @click="changePage(1)"
          />
          <el-button :icon="ZoomOut" title="缩小" @click="changeScale(-0.15)" />
          <span>{{ Math.round(scale * 100) }}%</span>
          <el-button :icon="ZoomIn" title="放大" @click="changeScale(0.15)" />
          <el-button
            @click="
              scale = 1;
              renderPdf();
            "
            >100%</el-button
          >
          <el-button @click="fitWidth">适应宽度</el-button>
          <el-button @click="fitPage">全页显示</el-button>
          <el-button :icon="RefreshRight" title="旋转" @click="rotate" />
        </div>
        <div ref="previewPane" v-loading="loading" class="preview-pane">
          <div v-if="error" class="preview-error">
            <strong>无法预览文件</strong>
            <p>{{ error }}</p>
            <el-button
              v-if="item?.fileExtension !== 'doc'"
              type="primary"
              @click="replaceMissing"
              >重新选择文件</el-button
            >
            <el-button v-if="item" @click="openProofMaterial(item)"
              >使用系统默认程序打开</el-button
            >
          </div>
          <canvas
            v-show="item?.fileExtension === 'pdf' && !error"
            ref="canvas"
          />
          <div
            v-show="item?.fileExtension === 'docx' && !error"
            ref="docxContainer"
            class="docx-preview"
          />
        </div>
      </main>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 34px;
}
.preview-header > div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.preview-header strong,
.preview-header small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-header small {
  color: var(--text-secondary);
}
.preview-layout {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  height: 76vh;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.file-details {
  padding: 18px;
  border-right: 1px solid var(--border-color);
  background: #fafbfe;
}
.file-details h3 {
  margin: 0 0 18px;
}
.file-details dl {
  display: grid;
  gap: 16px;
  margin: 0;
}
.file-details dt {
  color: var(--text-tertiary);
  font-size: 12px;
}
.file-details dd {
  margin: 5px 0 0;
  overflow-wrap: anywhere;
}
.preview-main {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr);
}
.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 50px;
  border-bottom: 1px solid var(--border-color);
  background: #fff;
}
.pdf-toolbar .el-button + .el-button {
  margin-left: 0;
}
.preview-pane {
  min-height: 0;
  overflow: auto;
  padding: 24px;
  background: #eef0f4;
  text-align: center;
}
.preview-pane canvas {
  display: block;
  max-width: none;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 3px 16px rgba(30, 42, 70, 0.16);
}
.docx-preview {
  text-align: left;
}
.preview-error {
  display: grid;
  max-width: 520px;
  gap: 12px;
  margin: 100px auto 0;
  padding: 28px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: #fff;
}
.preview-error p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}
@media (max-width: 800px) {
  .preview-layout {
    grid-template-columns: 1fr;
  }
  .file-details {
    display: none;
  }
  .pdf-toolbar {
    flex-wrap: wrap;
    padding: 6px;
  }
}
</style>

<style lang="scss">
.file-preview-dialog .el-dialog__body {
  padding: 8px 18px 18px;
}
.docx-preview .docx-wrapper {
  padding: 20px;
  background: transparent;
}
.docx-preview .docx-wrapper > section.docx {
  margin: 0 auto 18px;
  box-shadow: 0 3px 16px rgba(30, 42, 70, 0.16);
}
</style>
