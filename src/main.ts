import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import { ElMessage } from "element-plus";
import "element-plus/dist/index.css";
import "./styles/variables.scss";
import "./styles/element.scss";
import "./styles/global.scss";
import App from "./App.vue";
import router from "./router";
import { initializeDatabase } from "./services/databaseService";

async function bootstrap() {
  let bootError = "";
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Database initialization failed", error);
    bootError = error instanceof Error ? error.message : "数据库初始化失败";
  }
  createApp(App)
    .use(createPinia())
    .use(router)
    .use(ElementPlus, { locale: zhCn })
    .mount("#app");
  if (bootError) ElMessage.error(`本地数据库启动失败：${bootError}`);
}

bootstrap();
