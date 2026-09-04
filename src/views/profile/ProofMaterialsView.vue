<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Clock,
  Delete,
  Document,
  Edit,
  FolderOpened,
  MoreFilled,
  Plus,
  Refresh,
  Search,
  View,
} from "@element-plus/icons-vue";
import AppCard from "../../components/common/AppCard.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import PageHeader from "../../components/common/PageHeader.vue";
import ProofUploadDialog from "../../components/profile/ProofUploadDialog.vue";
import FilePreviewDialog from "../../components/profile/FilePreviewDialog.vue";
import type { ProofMaterial } from "../../types/proofMaterial";
import { proofCategories } from "../../types/proofMaterial";
import {
  deleteProofMaterial,
  listProofMaterials,
  openProofMaterial,
  revealProofMaterial,
  updateProofMaterial,
} from "../../services/proofMaterialService";
import { isTauriRuntime } from "../../services/databaseService";
import { formatLocalDateTime } from "../../utils/dateTimeUtils";

const uploadDialog = ref<InstanceType<typeof ProofUploadDialog>>(),
  previewDialog = ref<InstanceType<typeof FilePreviewDialog>>(),
  loading = ref(false),
  rows = ref<ProofMaterial[]>([]),
  allRows = ref<ProofMaterial[]>([]);
const filters = reactive({
  keyword: "",
  fileType: "" as "" | "PDF" | "WORD",
  category: "",
  sort: "recent" as "recent" | "oldest" | "name" | "size",
});
const editVisible = ref(false),
  editing = ref<ProofMaterial>(),
  editName = ref(""),
  editCategory = ref("未分类");
const quickCategories = [
  "未分类",
  "资格证书",
  "获奖证明",
  "论文材料",
  "实习证明",
];
const stats = computed(() => ({
  total: allRows.value.length,
  pdf: allRows.value.filter((item) => item.fileExtension === "pdf").length,
  word: allRows.value.filter((item) => item.fileExtension !== "pdf").length,
  size: allRows.value.reduce(
    (sum, item) => sum + Number(item.fileSize || 0),
    0,
  ),
  latest: allRows.value[0],
}));
function sizeText(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1048576).toFixed(1)} MB`;
}
async function load() {
  if (!isTauriRuntime()) return;
  loading.value = true;
  try {
    [allRows.value, rows.value] = await Promise.all([
      listProofMaterials(),
      listProofMaterials(filters),
    ]);
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : "读取证明材料失败",
    );
  } finally {
    loading.value = false;
  }
}
let timer: number | undefined;
watch(
  filters,
  () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(load, 180);
  },
  { deep: true },
);
async function openFile(item: ProofMaterial) {
  try {
    await openProofMaterial(item);
  } catch (error) {
    ElMessage.error(
      error instanceof Error
        ? error.message
        : "文件无法打开，可能已被移动或删除",
    );
  }
}
function openEdit(item: ProofMaterial) {
  editing.value = item;
  editName.value = item.displayName;
  editCategory.value = item.category;
  editVisible.value = true;
}
async function saveEdit() {
  if (!editing.value) return;
  if (!editName.value.trim()) {
    ElMessage.warning("请填写文件备注名称");
    return;
  }
  await updateProofMaterial(
    editing.value.id,
    editName.value,
    editCategory.value,
  );
  ElMessage.success("保存成功");
  editVisible.value = false;
  await load();
}
async function remove(item: ProofMaterial) {
  try {
    await ElMessageBox.confirm(
      "删除后将同时删除应用本地保存的文件副本，此操作不可恢复。",
      "确定删除该证明材料吗？",
      {
        type: "warning",
        confirmButtonText: "确认删除",
        cancelButtonText: "取消",
      },
    );
  } catch {
    return;
  }
  try {
    await deleteProofMaterial(item);
    ElMessage.success("删除成功");
    await load();
  } catch (error) {
    ElMessage.error(
      error instanceof Error
        ? error.message
        : "删除失败，请关闭占用该文件的程序后重试",
    );
  }
}
async function command(value: string, item: ProofMaterial) {
  if (value === "edit") openEdit(item);
  if (value === "reveal")
    try {
      await revealProofMaterial(item);
    } catch (error) {
      ElMessage.error(
        error instanceof Error ? error.message : "无法打开文件所在位置",
      );
    }
  if (value === "delete") await remove(item);
}
function selectCategory(category: string) {
  filters.category = filters.category === category ? "" : category;
}
onMounted(load);
</script>
<template>
  <div class="materials-page">
    <PageHeader
      title="证明材料"
      subtitle="集中管理证书、录用通知、实习证明、成绩单等求职材料"
      ><el-button :icon="Plus" type="primary" @click="uploadDialog?.open()"
        >上传材料</el-button
      ></PageHeader
    ><el-alert
      v-if="!isTauriRuntime()"
      title="当前是界面预览；证明材料仅保存在 Windows 客户端本机。"
      type="info"
      show-icon
      :closable="false"
    />
    <div class="filters">
      <el-input
        v-model="filters.keyword"
        :prefix-icon="Search"
        clearable
        placeholder="搜索文件备注名称或原文件名"
      /><el-select v-model="filters.fileType" placeholder="全部类型"
        ><el-option label="全部类型" value="" /><el-option
          label="PDF"
          value="PDF" /><el-option label="Word" value="WORD" /></el-select
      ><button
        class="filter-chip"
        :class="{ active: filters.fileType === 'PDF' }"
        type="button"
        @click="filters.fileType = filters.fileType === 'PDF' ? '' : 'PDF'"
      >
        PDF</button
      ><button
        class="filter-chip"
        :class="{ active: filters.fileType === 'WORD' }"
        type="button"
        @click="filters.fileType = filters.fileType === 'WORD' ? '' : 'WORD'"
      >
        Word</button
      ><el-select v-model="filters.category" placeholder="全部分类"
        ><el-option label="全部分类" value="" /><el-option
          v-for="item in proofCategories"
          :key="item"
          :label="item"
          :value="item" /></el-select
      ><button
        v-for="category in quickCategories"
        :key="category"
        class="filter-chip"
        :class="{ active: filters.category === category }"
        type="button"
        @click="selectCategory(category)"
      >
        {{ category }}</button
      ><el-select
        v-model="filters.sort"
        class="sort-select"
        placeholder="最近上传"
        ><el-option label="最近上传" value="recent" /><el-option
          label="最早上传"
          value="oldest" /><el-option label="名称 A-Z" value="name" /><el-option
          label="文件大小"
          value="size" /></el-select
      ><el-button :icon="Refresh" title="刷新材料" @click="load" />
    </div>
    <div class="stat-strip">
      <div class="stat-item">
        <span class="stat-icon total"
          ><el-icon><Document /></el-icon></span
        ><span
          ><small>材料总数</small><strong>{{ stats.total }}</strong
          ><em>总存储 {{ sizeText(stats.size) }}</em></span
        >
      </div>
      <div class="stat-item">
        <span class="stat-icon pdf"
          ><el-icon><Document /></el-icon></span
        ><span
          ><small>PDF</small><strong>{{ stats.pdf }}</strong
          ><em>{{
            sizeText(
              allRows
                .filter((item) => item.fileExtension === "pdf")
                .reduce((sum, item) => sum + item.fileSize, 0),
            )
          }}</em></span
        >
      </div>
      <div class="stat-item">
        <span class="stat-icon word"
          ><el-icon><Document /></el-icon></span
        ><span
          ><small>Word</small><strong>{{ stats.word }}</strong
          ><em>{{
            sizeText(
              allRows
                .filter((item) => item.fileExtension !== "pdf")
                .reduce((sum, item) => sum + item.fileSize, 0),
            )
          }}</em></span
        >
      </div>
      <div class="stat-item latest">
        <span class="stat-icon recent"
          ><el-icon><Clock /></el-icon></span
        ><span
          ><small>最近上传</small
          ><strong>{{
            stats.latest ? formatLocalDateTime(stats.latest.createdAt) : "暂无"
          }}</strong
          ><em>{{ stats.latest?.displayName || "尚未上传材料" }}</em></span
        >
      </div>
    </div>
    <AppCard v-loading="loading" class="list-card"
      ><el-table v-if="rows.length" :data="rows"
        ><el-table-column label="文件信息" min-width="300"
          ><template #default="scope"
            ><div class="file-info" :class="scope.row.fileExtension">
              <span
                ><el-icon><Document /></el-icon
                >{{ scope.row.fileExtension === "pdf" ? "PDF" : "WORD" }}</span
              >
              <div>
                <strong>{{ scope.row.displayName }}</strong
                ><small>原文件：{{ scope.row.originalName }}</small>
              </div>
            </div></template
          ></el-table-column
        ><el-table-column label="文件类型" width="105"
          ><template #default="scope">{{
            scope.row.fileExtension.toUpperCase()
          }}</template></el-table-column
        ><el-table-column
          prop="category"
          label="材料分类"
          min-width="125"
        /><el-table-column label="文件大小" width="110" class-name="size-column"
          ><template #default="scope">{{
            sizeText(scope.row.fileSize)
          }}</template></el-table-column
        ><el-table-column label="上传时间" width="180"
          ><template #default="scope">{{
            formatLocalDateTime(scope.row.createdAt)
          }}</template></el-table-column
        ><el-table-column label="操作" width="226" fixed="right"
          ><template #default="scope"
            ><div class="material-actions">
              <el-button
                :icon="View"
                size="small"
                @click="previewDialog?.open(scope.row)"
                >预览</el-button
              ><el-button
                :icon="FolderOpened"
                size="small"
                @click="openFile(scope.row)"
                >打开</el-button
              ><el-dropdown
                trigger="click"
                @command="command($event, scope.row)"
                ><el-button
                  :icon="MoreFilled"
                  size="small"
                  title="更多"
                /><template #dropdown
                  ><el-dropdown-menu
                    ><el-dropdown-item command="edit" :icon="Edit"
                      >修改名称和分类</el-dropdown-item
                    ><el-dropdown-item command="reveal" :icon="FolderOpened"
                      >打开文件所在位置</el-dropdown-item
                    ><el-dropdown-item command="delete" :icon="Delete" divided
                      >删除</el-dropdown-item
                    ></el-dropdown-menu
                  ></template
                ></el-dropdown
              >
            </div></template
          ></el-table-column
        ></el-table
      ><EmptyState
        v-else
        title="暂无证明材料"
        description="可以上传证书、成绩单、录用通知、实习证明等 Word / PDF 文件。"
        ><el-button :icon="Plus" type="primary" @click="uploadDialog?.open()"
          >上传第一个材料</el-button
        ></EmptyState
      ></AppCard
    >
    <ProofUploadDialog ref="uploadDialog" @saved="load" />
    <FilePreviewDialog ref="previewDialog" @replaced="load" />
    <el-dialog v-model="editVisible" title="修改证明材料" width="480px"
      ><el-form label-position="top"
        ><el-form-item label="文件备注名称" required
          ><el-input v-model="editName" /></el-form-item
        ><el-form-item label="材料分类"
          ><el-select v-model="editCategory"
            ><el-option
              v-for="item in proofCategories"
              :key="item"
              :label="item"
              :value="item" /></el-select></el-form-item></el-form
      ><template #footer
        ><el-button @click="editVisible = false">取消</el-button
        ><el-button type="primary" @click="saveEdit">保存</el-button></template
      ></el-dialog
    >
  </div>
</template>

<style scoped lang="scss">
.materials-page {
  min-width: 0;
}
.filters {
  flex-wrap: wrap;
}
.filters > .el-input {
  min-width: 280px;
  flex: 1 1 320px;
}
.material-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  white-space: nowrap;
}
.material-actions .el-button + .el-button {
  margin-left: 0;
}
.material-actions .el-dropdown {
  display: inline-flex;
  flex: 0 0 auto;
  margin-left: 0;
}
</style>
<style scoped lang="scss">
.materials-page {
  display: grid;
  gap: 16px;
}
.stat-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}
.stat-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 13px;
  padding: 17px 20px;
}
.stat-item + .stat-item {
  border-left: 1px solid var(--border-color);
}
.stat-item > span:last-child {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.stat-item small,
.stat-item em {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stat-item strong {
  font-size: 24px;
}
.stat-item.latest strong {
  font-size: 14px;
}
.stat-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 8px;
  font-size: 20px;
}
.stat-icon.total,
.stat-icon.recent {
  color: #6c5ce7;
  background: #f0edff;
}
.stat-icon.pdf {
  color: #dc4545;
  background: #fff0f0;
}
.stat-icon.word {
  color: #3567dc;
  background: #eef3ff;
}
.filters {
  display: flex;
  min-width: 0;
  gap: 9px;
}
.filters > .el-input {
  min-width: 240px;
  flex: 1;
}
.filters > .el-select {
  width: 130px;
  flex: 0 0 130px;
}
.filters > .sort-select {
  width: 120px;
  flex-basis: 120px;
}
.filter-chip {
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0 12px;
  color: var(--text-secondary);
  background: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
.filter-chip:hover,
.filter-chip.active {
  border-color: #cfc7ff;
  color: #6254d9;
  background: #f0edff;
}
.list-card {
  min-height: 0;
  padding: 12px;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.file-info > span {
  display: grid;
  width: 50px;
  height: 48px;
  place-items: center;
  border-radius: 7px;
  color: #b84e4b;
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  font-size: 10px;
  font-weight: 800;
}
.file-info.doc > span,
.file-info.docx > span {
  color: #4166c5;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.file-info > span .el-icon {
  font-size: 19px;
}
.file-info div {
  display: grid;
  min-width: 0;
  gap: 5px;
}
.file-info strong,
.file-info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-info small {
  color: var(--text-tertiary);
  font-size: 12px;
}
.el-dropdown {
  margin-left: 8px;
}
.el-select {
  width: 100%;
}
.empty-state {
  min-height: 220px;
}
.hobby-select {
  width: 100%;
  margin-bottom: 18px;
}
@media (max-width: 1250px) {
  .filters {
    flex-wrap: wrap;
  }
  .filters > .el-input {
    flex-basis: 100%;
  }
  .stat-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-item:nth-child(3) {
    border-top: 1px solid var(--border-color);
  }
}
@media (max-width: 1000px) {
  .size-column {
    display: none;
  }
}
@media (max-width: 700px) {
  .stat-strip {
    grid-template-columns: 1fr;
  }
  .stat-item + .stat-item {
    border-left: 0;
    border-top: 1px solid var(--border-color);
  }
}
</style>
