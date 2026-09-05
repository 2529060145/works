<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowDown,
  ArrowUp,
  Aim,
  Briefcase,
  Calendar,
  Camera,
  ChatDotRound,
  Clock,
  Collection,
  Connection,
  DataAnalysis,
  Delete,
  Document,
  Edit,
  Finished,
  Flag,
  Grid,
  Hide,
  House,
  Location,
  MapLocation,
  Medal,
  Message,
  Notebook,
  OfficeBuilding,
  Phone,
  Plus,
  Postcard,
  Rank,
  Reading,
  School,
  Star,
  Suitcase,
  Tickets,
  TrophyBase,
  User,
  UserFilled,
  View,
  Wallet,
  Warning,
} from "@element-plus/icons-vue";
import AppCard from "../../components/common/AppCard.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import PageHeader from "../../components/common/PageHeader.vue";
import type {
  ProfileBasic,
  ProfileEntityTable,
  ProfileField,
  ProfileRecord,
} from "../../types/profile";
import {
  deleteProfileRecord,
  getBasicProfile,
  getEvaluation,
  getHobbies,
  listProfileRecords,
  moveProfileRecord,
  readManagedFileDataUrl,
  removeProfilePhoto,
  replaceProfilePhoto,
  saveBasicProfile,
  saveEvaluation,
  saveHobbies,
  saveProfileRecord,
} from "../../services/profileService";
import { isTauriRuntime } from "../../services/databaseService";

interface EntityConfig {
  key: string;
  title: string;
  empty: string;
  table: ProfileEntityTable;
  primary: string;
  fields: ProfileField[];
}
interface DetailGroup {
  title: string;
  icon: unknown;
  keys: string[];
  tone?: "plain" | "accent" | "success";
}
const yesNo = ["是", "否"];
const ability = ["精通", "熟练", "良好", "一般", "较弱"];
const ethnicities = [
  "汉族",
  "蒙古族",
  "回族",
  "藏族",
  "维吾尔族",
  "苗族",
  "彝族",
  "壮族",
  "布依族",
  "朝鲜族",
  "满族",
  "侗族",
  "瑶族",
  "白族",
  "土家族",
  "哈尼族",
  "哈萨克族",
  "傣族",
  "黎族",
  "傈僳族",
  "佤族",
  "畲族",
  "高山族",
  "拉祜族",
  "水族",
  "东乡族",
  "纳西族",
  "景颇族",
  "柯尔克孜族",
  "土族",
  "达斡尔族",
  "仫佬族",
  "羌族",
  "布朗族",
  "撒拉族",
  "毛南族",
  "仡佬族",
  "锡伯族",
  "阿昌族",
  "普米族",
  "塔吉克族",
  "怒族",
  "乌孜别克族",
  "俄罗斯族",
  "鄂温克族",
  "德昂族",
  "保安族",
  "裕固族",
  "京族",
  "塔塔尔族",
  "独龙族",
  "鄂伦春族",
  "赫哲族",
  "门巴族",
  "珞巴族",
  "基诺族",
];
const industries = [
  "软件和信息技术服务业",
  "互联网",
  "计算机服务",
  "人工智能",
  "通信",
  "电子 / 半导体",
  "制造业",
  "汽车",
  "金融",
  "银行",
  "保险",
  "教育",
  "科研",
  "医疗卫生",
  "政府 / 事业单位",
  "其他",
];
const relationships = [
  "父亲",
  "母亲",
  "配偶",
  "儿子",
  "女儿",
  "哥哥",
  "弟弟",
  "姐姐",
  "妹妹",
  "祖父",
  "祖母",
  "外祖父",
  "外祖母",
  "其他",
];
const technologyOptions = [
  "C++",
  "Python",
  "Java",
  "MATLAB",
  "ROS2",
  "Linux",
  "SQLite",
  "MySQL",
  "Redis",
  "Vue",
  "TypeScript",
  "SLAM",
  "Cartographer",
  "ORB-SLAM3",
  "WiFi定位",
  "机器学习",
];
const hobbyOptions = [
  "羽毛球",
  "篮球",
  "足球",
  "跑步",
  "游泳",
  "健身",
  "编程",
  "阅读",
  "技术学习",
  "摄影",
  "旅行",
  "音乐",
  "电影",
];
const basicFields: ProfileField[] = [
  { key: "name", label: "姓名", required: true },
  { key: "english_name", label: "英文名 / 姓名全拼" },
  { key: "gender", label: "性别", type: "select", options: ["男", "女"] },
  { key: "birth_date", label: "出生日期", type: "date" },
  {
    key: "ethnicity",
    label: "民族",
    type: "select",
    options: ethnicities,
    allowCreate: true,
  },
  {
    key: "political_status",
    label: "政治面貌",
    type: "select",
    options: [
      "中共党员",
      "中共预备党员",
      "共青团员",
      "群众",
      "民主党派",
      "无党派人士",
      "其他",
    ],
    defaultValue: "群众",
  },
  {
    key: "marital_status",
    label: "婚姻状况",
    type: "select",
    options: ["未婚", "已婚", "离异", "丧偶", "其他"],
    defaultValue: "未婚",
  },
  {
    key: "health_status",
    label: "健康状况",
    type: "select",
    options: ["健康", "良好", "一般", "其他"],
    defaultValue: "健康",
  },
  { key: "height", label: "身高" },
  { key: "weight", label: "体重" },
  { key: "current_residence", label: "现居住地", wide: true },
  { key: "household_location", label: "户口所在地", wide: true },
  { key: "native_place", label: "籍贯" },
  { key: "student_origin", label: "生源地" },
  {
    key: "household_type",
    label: "户口类型",
    type: "select",
    options: [
      "居民户",
      "农业户口",
      "非农业户口",
      "学校集体户",
      "单位集体户",
      "其他",
    ],
  },
  { key: "mailing_address", label: "通信地址", wide: true },
  { key: "phone", label: "手机" },
  { key: "email", label: "邮箱" },
  {
    key: "work_status",
    label: "工作经历状态",
    type: "select",
    options: ["未参加工作", "已参加工作"],
    defaultValue: "未参加工作",
  },
  {
    key: "work_start_date",
    label: "参加工作时间",
    type: "date",
    visibleWhen: { key: "work_status", value: "已参加工作" },
  },
  {
    key: "current_industry",
    label: "目前行业",
    type: "select",
    options: industries,
    allowCreate: true,
  },
  {
    key: "student_leader",
    label: "是否学生干部",
    type: "select",
    options: yesNo,
    defaultValue: "否",
  },
  { key: "specialties", label: "特长爱好", wide: true },
  {
    key: "overseas_work",
    label: "海外工作经历",
    type: "select",
    options: ["有", "无"],
    defaultValue: "无",
  },
  {
    key: "disciplinary_record",
    label: "违法违纪情况",
    type: "select",
    options: ["无", "有"],
    defaultValue: "无",
  },
];
const entities: EntityConfig[] = [
  {
    key: "education",
    title: "教育经历",
    empty: "暂无教育经历",
    table: "education_experiences",
    primary: "school_name",
    fields: [
      { key: "school_name", label: "学校名称", required: true },
      { key: "start_date", label: "入学时间", type: "month" },
      { key: "end_date", label: "毕业时间", type: "month" },
      {
        key: "duration_years",
        label: "学制",
        type: "select",
        options: ["1年", "2年", "2.5年", "3年", "4年", "5年", "其他"],
        allowCreate: true,
      },
      {
        key: "education_level",
        label: "学历",
        type: "select",
        options: [
          "博士研究生",
          "硕士研究生",
          "本科",
          "专科 / 大专",
          "高中",
          "中专",
          "其他",
        ],
      },
      {
        key: "degree",
        label: "学位",
        type: "select",
        options: ["博士", "硕士", "学士", "无", "其他"],
      },
      {
        key: "degree_detail",
        label: "学位细分",
        type: "select",
        options: [
          "工学博士",
          "理学博士",
          "管理学博士",
          "工学硕士",
          "理学硕士",
          "管理学硕士",
          "工学学士",
          "理学学士",
          "管理学学士",
          "无",
          "其他",
        ],
        allowCreate: true,
      },
      {
        key: "study_type",
        label: "学习形式",
        type: "select",
        options: [
          "全日制",
          "非全日制",
          "成人教育",
          "自学考试",
          "网络教育",
          "其他",
        ],
      },
      {
        key: "admission_type",
        label: "招生方式",
        type: "select",
        options: ["统招", "推免", "单独考试", "成人高考", "自学考试", "其他"],
      },
      { key: "college", label: "学院" },
      { key: "major", label: "专业" },
      { key: "major_category", label: "专业分类" },
      { key: "research_direction", label: "研究方向" },
      {
        key: "ranking",
        label: "专业排名",
        type: "select",
        options: [
          "前5%",
          "前10%",
          "10%-20%",
          "20%-30%",
          "30%-40%",
          "40%-50%",
          "50%-60%",
          "60%-70%",
          "70%-80%",
          "80%-90%",
          "90%-100%",
          "未排名",
          "不清楚",
        ],
        allowCreate: true,
      },
      {
        key: "is_top_up_degree",
        label: "是否专升本",
        type: "select",
        options: ["是", "否", "不适用"],
        defaultValue: "不适用",
      },
      {
        key: "is_overseas",
        label: "是否海外学习",
        type: "select",
        options: yesNo,
        defaultValue: "否",
      },
      { key: "position", label: "担任职务" },
      { key: "main_courses", label: "主修课程", type: "textarea", wide: true },
      { key: "failed_course_count", label: "挂科门数", type: "number" },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "work",
    title: "工作 / 实习",
    empty: "暂无工作或实习经历",
    table: "work_experiences",
    primary: "company_name",
    fields: [
      { key: "company_name", label: "企业名称", required: true },
      {
        key: "company_type",
        label: "单位性质",
        type: "select",
        options: [
          "中央企业",
          "地方国有企业",
          "国有控股企业",
          "民营企业",
          "外资企业",
          "合资企业",
          "事业单位",
          "政府机关",
          "高等院校",
          "科研院所",
          "社会组织",
          "其他",
        ],
      },
      {
        key: "industry",
        label: "所属行业",
        type: "select",
        options: industries,
        allowCreate: true,
      },
      {
        key: "work_type",
        label: "工作性质",
        type: "select",
        options: ["全职", "实习", "兼职", "项目制", "校内实践", "其他"],
      },
      { key: "position_name", label: "职位名称" },
      { key: "start_date", label: "开始时间", type: "month", required: true },
      {
        key: "end_date",
        label: "结束时间",
        type: "month",
        disabledWhen: { key: "is_current", value: true },
      },
      { key: "is_current", label: "至今", type: "switch" },
      { key: "region", label: "工作地区" },
      { key: "monthly_salary", label: "税前月薪" },
      {
        key: "salary_unit",
        label: "薪资单位",
        type: "select",
        options: ["元/月", "千元/月", "万元/月", "元/天", "其他"],
      },
      { key: "subordinate_count", label: "下属人数", type: "number" },
      {
        key: "is_overseas",
        label: "是否海外工作",
        type: "select",
        options: yesNo,
        defaultValue: "否",
      },
      {
        key: "responsibilities",
        label: "工作职责",
        type: "textarea",
        wide: true,
      },
      { key: "reference_name", label: "证明人" },
      { key: "reference_position", label: "证明人单位及职务" },
      { key: "reference_phone", label: "证明人联系电话" },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "projects",
    title: "项目经历",
    empty: "暂无项目经历",
    table: "project_experiences",
    primary: "project_name",
    fields: [
      { key: "project_name", label: "项目名称", required: true },
      { key: "start_date", label: "开始时间", type: "month" },
      { key: "end_date", label: "结束时间", type: "month" },
      { key: "is_current", label: "至今", type: "switch" },
      {
        key: "role",
        label: "项目角色",
        type: "select",
        options: [
          "项目负责人",
          "核心成员",
          "项目成员",
          "技术负责人",
          "算法负责人",
          "开发负责人",
          "队长",
          "其他",
        ],
        allowCreate: true,
      },
      { key: "organization", label: "所在单位" },
      {
        key: "team_size",
        label: "团队规模",
        type: "select",
        options: [
          "1人",
          "2-5人",
          "6-10人",
          "11-20人",
          "21-50人",
          "50人以上",
          "不清楚",
        ],
      },
      { key: "description", label: "项目介绍", type: "textarea", wide: true },
      {
        key: "responsibilities",
        label: "项目职责",
        type: "textarea",
        wide: true,
      },
      { key: "achievements", label: "项目成果", type: "textarea", wide: true },
      {
        key: "tech_stack",
        label: "技术栈",
        type: "select",
        options: technologyOptions,
        multiple: true,
        allowCreate: true,
        wide: true,
      },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "academic",
    title: "学术成果",
    empty: "暂无学术成果",
    table: "academic_achievements",
    primary: "achievement_name",
    fields: [
      {
        key: "achievement_name",
        label: "成果名称 / 论文名称",
        required: true,
        wide: true,
      },
      {
        key: "achievement_type",
        label: "成果类型",
        type: "select",
        options: [
          "期刊论文",
          "会议论文",
          "专利",
          "软件著作权",
          "著作",
          "标准",
          "科研项目",
          "其他",
        ],
      },
      {
        key: "author_role",
        label: "作者身份",
        type: "select",
        options: [
          "第一作者",
          "共同第一作者",
          "第二作者",
          "第三作者",
          "通讯作者",
          "共同通讯作者",
          "其他",
        ],
      },
      { key: "venue", label: "期刊 / 会议名称" },
      {
        key: "status",
        label: "论文状态",
        type: "select",
        options: [
          "准备投稿",
          "已投稿",
          "审稿中",
          "返修",
          "已录用",
          "已发表",
          "已撤稿",
          "其他",
        ],
      },
      { key: "accepted_date", label: "录用时间", type: "date" },
      { key: "published_date", label: "发表时间", type: "date" },
      { key: "research_field", label: "研究方向" },
      { key: "doi", label: "DOI" },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "certificates",
    title: "资格证书",
    empty: "暂无资格证书",
    table: "certificates",
    primary: "certificate_name",
    fields: [
      { key: "certificate_name", label: "证书名称", required: true },
      { key: "obtained_date", label: "获得时间", type: "date" },
      {
        key: "level",
        label: "等级",
        type: "select",
        options: ["初级", "中级", "高级", "其他"],
        allowCreate: true,
      },
      { key: "score", label: "成绩" },
      { key: "certificate_number", label: "证书编号" },
      {
        key: "validity_type",
        label: "有效期类型",
        type: "select",
        options: ["长期有效", "有有效期"],
        defaultValue: "长期有效",
      },
      {
        key: "valid_from",
        label: "有效期开始",
        type: "date",
        visibleWhen: { key: "validity_type", value: "有有效期" },
      },
      {
        key: "valid_until",
        label: "有效期结束",
        type: "date",
        visibleWhen: { key: "validity_type", value: "有有效期" },
      },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "languages",
    title: "语言能力",
    empty: "暂无语言能力记录",
    table: "language_abilities",
    primary: "language",
    fields: [
      {
        key: "language",
        label: "语言",
        required: true,
        type: "select",
        options: [
          "英语",
          "日语",
          "韩语",
          "德语",
          "法语",
          "俄语",
          "西班牙语",
          "其他",
        ],
        allowCreate: true,
      },
      {
        key: "level",
        label: "等级",
        type: "select",
        options: [
          "CET-4",
          "CET-6",
          "TEM-4",
          "TEM-8",
          "IELTS",
          "TOEFL",
          "TOEIC",
          "无",
          "其他",
        ],
        allowCreate: true,
      },
      { key: "score", label: "成绩" },
      {
        key: "speaking_ability",
        label: "听说能力",
        type: "select",
        options: ability,
      },
      {
        key: "reading_ability",
        label: "读写能力",
        type: "select",
        options: ability,
      },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "honors",
    title: "荣誉奖励",
    empty: "暂无荣誉奖励",
    table: "honors",
    primary: "honor_name",
    fields: [
      { key: "honor_name", label: "奖励名称", required: true },
      { key: "obtained_date", label: "获得时间", type: "month" },
      {
        key: "honor_level",
        label: "奖励级别",
        type: "select",
        options: [
          "国际级",
          "国家级",
          "省部级 / 省区级",
          "市级",
          "学校级",
          "学院级",
          "企业级",
          "其他",
        ],
      },
      {
        key: "award_grade",
        label: "获奖等级",
        type: "select",
        options: [
          "特等奖",
          "一等奖",
          "二等奖",
          "三等奖",
          "金奖",
          "银奖",
          "铜奖",
          "优秀奖",
          "优秀",
          "其他",
        ],
      },
      { key: "issuer", label: "颁发机构" },
      { key: "description", label: "描述", type: "textarea", wide: true },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "family",
    title: "家庭成员",
    empty: "暂无家庭成员",
    table: "family_members",
    primary: "name",
    fields: [
      { key: "name", label: "姓名", required: true },
      {
        key: "relationship",
        label: "与本人关系",
        type: "select",
        options: relationships,
        allowCreate: true,
      },
      { key: "organization", label: "工作单位" },
      { key: "position", label: "职务" },
      { key: "phone", label: "联系电话" },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
  {
    key: "emergency",
    title: "紧急联系人",
    empty: "暂无紧急联系人",
    table: "emergency_contacts",
    primary: "name",
    fields: [
      { key: "name", label: "姓名", required: true },
      {
        key: "relationship",
        label: "与本人关系",
        type: "select",
        options: relationships,
        allowCreate: true,
      },
      { key: "phone", label: "联系电话" },
      { key: "organization", label: "工作单位" },
      { key: "remark", label: "备注", type: "textarea", wide: true },
    ],
  },
];
const entityIcons: Record<string, unknown> = {
  education: School,
  work: Suitcase,
  projects: Briefcase,
  academic: Reading,
  certificates: Medal,
  languages: ChatDotRound,
  honors: TrophyBase,
  family: UserFilled,
  emergency: Phone,
};
const fieldIcons: Record<string, unknown> = {
  name: User,
  english_name: Reading,
  gender: UserFilled,
  birth_date: Calendar,
  ethnicity: Flag,
  political_status: Aim,
  marital_status: Connection,
  health_status: Finished,
  height: Rank,
  weight: Wallet,
  current_residence: OfficeBuilding,
  household_location: House,
  native_place: MapLocation,
  student_origin: Location,
  household_type: Document,
  mailing_address: Message,
  phone: Phone,
  email: Message,
  work_status: Document,
  work_start_date: Calendar,
  current_industry: Collection,
  specialties: Star,
  student_leader: School,
  overseas_work: MapLocation,
  disciplinary_record: Warning,
  school_name: School,
  start_date: Calendar,
  end_date: Calendar,
  duration_years: Clock,
  education_level: School,
  degree: Medal,
  degree_detail: Postcard,
  study_type: Reading,
  admission_type: UserFilled,
  college: OfficeBuilding,
  major: Reading,
  major_category: Grid,
  research_direction: Aim,
  ranking: DataAnalysis,
  is_top_up_degree: Rank,
  is_overseas: MapLocation,
  position: Briefcase,
  main_courses: Notebook,
  failed_course_count: Document,
  remark: Tickets,
  company_name: OfficeBuilding,
  company_type: OfficeBuilding,
  industry: Collection,
  work_type: Suitcase,
  position_name: Briefcase,
  is_current: Clock,
  region: Location,
  monthly_salary: Wallet,
  salary_unit: Wallet,
  subordinate_count: UserFilled,
  responsibilities: Tickets,
  reference_name: User,
  reference_position: Briefcase,
  reference_phone: Phone,
  project_name: Briefcase,
  role: User,
  organization: OfficeBuilding,
  team_size: UserFilled,
  description: Document,
  achievements: DataAnalysis,
  tech_stack: Grid,
  achievement_name: Document,
  achievement_type: Collection,
  author_role: User,
  venue: Reading,
  status: Finished,
  accepted_date: Calendar,
  published_date: Calendar,
  research_field: Aim,
  doi: Connection,
  certificate_name: Medal,
  obtained_date: Calendar,
  level: Rank,
  score: Postcard,
  certificate_number: Document,
  validity_type: Clock,
  valid_from: Calendar,
  valid_until: Calendar,
  language: ChatDotRound,
  speaking_ability: ChatDotRound,
  reading_ability: Reading,
  honor_name: TrophyBase,
  honor_level: Collection,
  award_grade: Medal,
  issuer: OfficeBuilding,
  relationship: UserFilled,
};
const basicGroups = [
  {
    title: "个人信息",
    note: "基础身份信息",
    icon: User,
    keys: [
      "name",
      "english_name",
      "gender",
      "birth_date",
      "ethnicity",
      "political_status",
      "marital_status",
      "health_status",
      "height",
      "weight",
    ],
  },
  {
    title: "户籍与居住信息",
    note: "户籍及现居地址",
    icon: Location,
    keys: [
      "household_location",
      "native_place",
      "student_origin",
      "current_residence",
      "household_type",
    ],
  },
  {
    title: "联系方式",
    note: "常用联系方式",
    icon: Phone,
    keys: ["phone", "email", "mailing_address"],
  },
  {
    title: "教育与职业信息",
    note: "求职相关信息",
    icon: Briefcase,
    keys: [
      "current_industry",
      "work_status",
      "work_start_date",
      "student_leader",
      "overseas_work",
      "disciplinary_record",
    ],
  },
  {
    title: "特长爱好",
    note: "个人标签",
    icon: Star,
    keys: ["specialties"],
  },
];
const entityDetailGroups: Record<string, DetailGroup[]> = {
  education: [
    {
      title: "基本信息",
      icon: School,
      keys: [
        "school_name",
        "start_date",
        "end_date",
        "duration_years",
        "education_level",
        "degree",
        "degree_detail",
        "study_type",
        "admission_type",
        "college",
        "major",
        "major_category",
      ],
    },
    {
      title: "学业与研究",
      icon: DataAnalysis,
      keys: [
        "research_direction",
        "ranking",
        "is_top_up_degree",
        "is_overseas",
      ],
      tone: "accent",
    },
    {
      title: "课程与其他",
      icon: Notebook,
      keys: ["position", "main_courses", "failed_course_count", "remark"],
    },
  ],
  work: [
    {
      title: "工作职责",
      icon: Tickets,
      keys: ["responsibilities"],
      tone: "accent",
    },
    {
      title: "基本信息",
      icon: Suitcase,
      keys: [
        "company_name",
        "company_type",
        "industry",
        "work_type",
        "position_name",
        "region",
      ],
    },
    {
      title: "时间与薪资",
      icon: Calendar,
      keys: [
        "start_date",
        "end_date",
        "is_current",
        "monthly_salary",
        "salary_unit",
        "subordinate_count",
      ],
    },
    {
      title: "证明信息",
      icon: User,
      keys: ["reference_name", "reference_position", "reference_phone"],
    },
    {
      title: "其他信息",
      icon: Document,
      keys: ["is_overseas", "remark"],
    },
  ],
  projects: [
    {
      title: "项目信息",
      icon: Briefcase,
      keys: [
        "project_name",
        "role",
        "organization",
        "team_size",
        "start_date",
        "end_date",
        "is_current",
      ],
    },
    {
      title: "项目职责",
      icon: Tickets,
      keys: ["responsibilities"],
      tone: "accent",
    },
    {
      title: "项目介绍与成果",
      icon: DataAnalysis,
      keys: ["description", "achievements"],
      tone: "success",
    },
    {
      title: "补充信息",
      icon: Grid,
      keys: ["tech_stack", "remark"],
    },
  ],
  academic: [
    {
      title: "基础信息",
      icon: Document,
      keys: ["achievement_name", "achievement_type", "author_role", "venue"],
    },
    {
      title: "时间与状态",
      icon: Clock,
      keys: ["status", "accepted_date", "published_date", "doi"],
    },
    {
      title: "研究方向与备注",
      icon: DataAnalysis,
      keys: ["research_field", "remark"],
      tone: "accent",
    },
  ],
  certificates: [
    {
      title: "证书详情",
      icon: Medal,
      keys: [
        "certificate_name",
        "obtained_date",
        "level",
        "score",
        "certificate_number",
        "validity_type",
        "valid_from",
        "valid_until",
        "remark",
      ],
    },
  ],
  languages: [
    {
      title: "语言能力详情",
      icon: ChatDotRound,
      keys: [
        "language",
        "level",
        "score",
        "speaking_ability",
        "reading_ability",
        "remark",
      ],
    },
  ],
  honors: [
    {
      title: "基本信息",
      icon: TrophyBase,
      keys: [
        "honor_name",
        "obtained_date",
        "honor_level",
        "award_grade",
        "issuer",
      ],
    },
    {
      title: "其他信息",
      icon: Document,
      keys: ["description", "remark"],
      tone: "accent",
    },
  ],
  family: [
    {
      title: "成员信息",
      icon: UserFilled,
      keys: [
        "name",
        "relationship",
        "organization",
        "position",
        "phone",
        "remark",
      ],
    },
  ],
  emergency: [
    {
      title: "联系人信息",
      icon: Phone,
      keys: ["name", "relationship", "phone", "organization", "remark"],
    },
  ],
};
const tabs = [
  { key: "basic", label: "基本信息", icon: User },
  ...entities.map((item) => ({
    key: item.key,
    label: item.title,
    icon: entityIcons[item.key],
  })),
  { key: "evaluation", label: "自我评价", icon: Edit },
  { key: "hobbies", label: "兴趣爱好", icon: Star },
];
const activeTab = ref("basic"),
  loading = ref(false),
  basic = reactive<ProfileBasic>({}),
  rows = reactive<Record<string, ProfileRecord[]>>({}),
  expanded = ref<string[]>([]),
  visiblePhones = ref<string[]>([]);
const evaluation = ref(""),
  hobbyTags = ref<string[]>([]),
  hobbyDescription = ref("");
const drawerVisible = ref(false),
  drawerMode = ref<"basic" | "entity">("basic"),
  editingId = ref<number>(),
  editingConfig = ref<EntityConfig>(),
  form = reactive<Record<string, any>>({}),
  initialForm = ref("");
const completeness = computed(() =>
  Math.round(
    (basicFields.filter((field) =>
      String((basic as any)[field.key] ?? "").trim(),
    ).length /
      basicFields.length) *
      100,
  ),
);
const photoUrl = ref("");
const photoMissing = ref(false);

async function loadPhoto() {
  photoUrl.value = "";
  photoMissing.value = false;
  if (!basic.photo_path) return;
  try {
    photoUrl.value = await readManagedFileDataUrl(basic.photo_path);
  } catch {
    photoMissing.value = true;
  }
}

async function load() {
  if (!isTauriRuntime()) return;
  loading.value = true;
  try {
    Object.assign(basic, await getBasicProfile());
    await loadPhoto();
    if (!basic.work_status)
      basic.work_status = basic.work_start_date ? "已参加工作" : "未参加工作";
    for (const config of entities)
      rows[config.key] = await listProfileRecords(config.table);
    evaluation.value = (await getEvaluation()).content || "";
    const hobbies = await getHobbies();
    hobbyTags.value = (hobbies.tags || "").split("\n").filter(Boolean);
    hobbyDescription.value = hobbies.description || "";
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : "读取个人资料失败",
    );
  } finally {
    loading.value = false;
  }
}
function displayValue(field: ProfileField, value: any) {
  if (field.type === "switch") return value ? "是" : "否";
  if (field.multiple)
    return (
      String(value || "")
        .split("\n")
        .filter(Boolean)
        .join("、") || "未填写"
    );
  return value === null || value === undefined || value === ""
    ? "未填写"
    : String(value);
}
function basicField(key: string) {
  return basicFields.find((field) => field.key === key)!;
}
function groupFields(config: EntityConfig, group: DetailGroup) {
  return group.keys
    .map((key) => config.fields.find((field) => field.key === key))
    .filter((field): field is ProfileField => Boolean(field));
}
function summaryTags(config: EntityConfig, row: ProfileRecord) {
  const keysByType: Record<string, string[]> = {
    education: ["education_level", "study_type", "degree_detail"],
    work: ["company_type", "work_type", "industry", "region"],
    projects: ["role", "organization", "team_size"],
    academic: ["achievement_type", "author_role", "status"],
    certificates: ["level", "score", "validity_type"],
    languages: ["level", "score"],
    honors: ["honor_level", "award_grade"],
    family: ["relationship"],
    emergency: ["relationship"],
  };
  return (keysByType[config.key] || [])
    .map((key) => String(row[key] || "").trim())
    .filter(Boolean);
}
function recordDateText(config: EntityConfig, row: ProfileRecord) {
  const start = String(
    row.start_date || row.obtained_date || row.accepted_date || "",
  );
  const end =
    config.key !== "education" && row.is_current
      ? "至今"
      : String(row.end_date || "");
  return [start, end].filter(Boolean).join(" ～ ");
}
function recordSubtitle(config: EntityConfig, row: ProfileRecord) {
  const valuesByType: Record<string, unknown[]> = {
    education: [row.major, row.college],
    work: [row.position_name, row.region],
    projects: [row.role, row.organization],
    academic: [row.venue, row.author_role],
    certificates: [row.level, row.score],
    languages: [row.level, row.score],
    honors: [row.issuer, row.award_grade],
    family: [row.relationship, row.organization],
    emergency: [row.relationship, row.phone],
  };
  return (valuesByType[config.key] || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" · ");
}
function detailLines(value: unknown) {
  return String(value || "")
    .split(/\n+|(?=\d+[.、]\s*)/)
    .map((line) => line.replace(/^\d+[.、]\s*/, "").trim())
    .filter(Boolean);
}
function isNarrativeField(key: string) {
  return ["responsibilities", "description", "achievements"].includes(key);
}
function fieldVisible(field: ProfileField, values: Record<string, any>) {
  return (
    !field.visibleWhen ||
    values[field.visibleWhen.key] === field.visibleWhen.value
  );
}
function fieldDisabled(field: ProfileField, values: Record<string, any>) {
  return Boolean(
    field.disabledWhen &&
      values[field.disabledWhen.key] === field.disabledWhen.value,
  );
}
function handleSwitchChange(
  field: ProfileField,
  value: string | number | boolean,
) {
  if (
    editingConfig.value?.key === "work" &&
    field.key === "is_current" &&
    Boolean(value)
  ) {
    form.end_date = "";
  }
}
function maskPhone(value: any) {
  const text = String(value ?? "");
  return text.length >= 7
    ? `${text.slice(0, 3)}****${text.slice(-4)}`
    : text || "未填写";
}
function defaultFieldValue(field: ProfileField, value: unknown) {
  if (field.multiple)
    return typeof value === "string" ? value.split("\n").filter(Boolean) : [];
  return value ?? field.defaultValue ?? (field.type === "switch" ? false : "");
}
function openBasic() {
  drawerMode.value = "basic";
  editingId.value = basic.id;
  editingConfig.value = undefined;
  Object.keys(form).forEach((key) => delete form[key]);
  basicFields.forEach(
    (field) =>
      (form[field.key] = defaultFieldValue(field, (basic as any)[field.key])),
  );
  initialForm.value = JSON.stringify(form);
  drawerVisible.value = true;
}
function openEntity(config: EntityConfig, row?: ProfileRecord) {
  drawerMode.value = "entity";
  editingConfig.value = config;
  editingId.value = row?.id;
  Object.keys(form).forEach((key) => delete form[key]);
  config.fields.forEach(
    (field) => (form[field.key] = defaultFieldValue(field, row?.[field.key])),
  );
  if (
    config.table === "certificates" &&
    !row?.validity_type &&
    row?.valid_until
  )
    form.validity_type = "有有效期";
  initialForm.value = JSON.stringify(form);
  drawerVisible.value = true;
}
async function saveDrawer() {
  const fields =
    drawerMode.value === "basic" ? basicFields : editingConfig.value!.fields;
  const missing = fields.find(
    (field) =>
      field.required &&
      fieldVisible(field, form) &&
      !String(form[field.key] ?? "").trim(),
  );
  if (missing) {
    ElMessage.warning(`请填写${missing.label}`);
    return;
  }
  if (
    drawerMode.value === "entity" &&
    editingConfig.value?.key === "work" &&
    !form.is_current &&
    !form.end_date
  ) {
    ElMessage.warning("请选择结束时间，或勾选“至今”");
    return;
  }
  const payload = { ...form };
  fields
    .filter((field) => field.multiple)
    .forEach(
      (field) =>
        (payload[field.key] = Array.isArray(form[field.key])
          ? form[field.key].join("\n")
          : form[field.key]),
    );
  if (drawerMode.value === "basic" && payload.work_status !== "已参加工作")
    payload.work_start_date = "";
  if (drawerMode.value === "entity" && payload.is_current === true)
    payload.end_date = "";
  if (
    drawerMode.value === "entity" &&
    editingConfig.value?.table === "certificates" &&
    payload.validity_type !== "有有效期"
  ) {
    payload.valid_from = "";
    payload.valid_until = "";
  }
  if (drawerMode.value === "basic")
    await saveBasicProfile(payload as ProfileBasic);
  else
    await saveProfileRecord(
      editingConfig.value!.table,
      payload,
      editingId.value,
    );
  ElMessage.success("保存成功");
  drawerVisible.value = false;
  await load();
}
function closeDrawer(done: () => void) {
  if (JSON.stringify(form) === initialForm.value) {
    done();
    return;
  }
  ElMessageBox.confirm("当前修改尚未保存，确定要关闭吗？", "未保存修改", {
    type: "warning",
    confirmButtonText: "确定关闭",
    cancelButtonText: "继续编辑",
  })
    .then(done)
    .catch(() => undefined);
}
async function remove(config: EntityConfig, row: ProfileRecord) {
  try {
    await ElMessageBox.confirm(
      `确定删除“${row[config.primary] ?? config.title}”吗？`,
      "删除记录",
      { type: "warning" },
    );
  } catch {
    return;
  }
  await deleteProfileRecord(config.table, row.id);
  ElMessage.success("删除成功");
  await load();
}
async function move(
  config: EntityConfig,
  row: ProfileRecord,
  direction: -1 | 1,
) {
  await moveProfileRecord(config.table, row.id, direction);
  await load();
}
function recordKey(table: ProfileEntityTable, id: number) {
  return `${table}-${id}`;
}
function isExpanded(table: ProfileEntityTable, id: number) {
  return expanded.value.includes(recordKey(table, id));
}
function toggleExpanded(table: ProfileEntityTable, id: number) {
  const key = recordKey(table, id);
  expanded.value = expanded.value.includes(key)
    ? expanded.value.filter((item) => item !== key)
    : [...expanded.value, key];
}
function phoneKey(table: ProfileEntityTable, id: number) {
  return `${table}-${id}`;
}
function phoneVisible(table: ProfileEntityTable, id: number) {
  return visiblePhones.value.includes(phoneKey(table, id));
}
function togglePhone(table: ProfileEntityTable, id: number) {
  const key = phoneKey(table, id);
  visiblePhones.value = visiblePhones.value.includes(key)
    ? visiblePhones.value.filter((item) => item !== key)
    : [...visiblePhones.value, key];
}
async function changePhoto() {
  try {
    const path = await replaceProfilePhoto(basic.photo_path);
    if (path) {
      ElMessage.success("照片已更新");
      await load();
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "照片更新失败");
  }
}
async function deletePhoto() {
  try {
    await ElMessageBox.confirm("确定删除个人照片吗？", "删除照片", {
      type: "warning",
    });
  } catch {
    return;
  }
  await removeProfilePhoto(basic.photo_path);
  ElMessage.success("照片已删除");
  await load();
}
async function saveText() {
  await saveEvaluation(evaluation.value);
  ElMessage.success("保存成功");
}
async function saveHobbyData() {
  await saveHobbies(hobbyTags.value, hobbyDescription.value);
  ElMessage.success("保存成功");
}
async function scrollToSection(name: string | number) {
  await nextTick();
  document
    .getElementById(`profile-section-${String(name)}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
onMounted(load);
</script>

<template>
  <div v-loading="loading" class="profile-page">
    <PageHeader
      title="我的资料"
      subtitle="集中管理个人求职信息，方便填写招聘系统和维护个人资料"
      ><span class="completion">资料完整度 {{ completeness }}%</span
      ><el-button :icon="Edit" type="primary" @click="openBasic"
        >编辑资料</el-button
      ></PageHeader
    ><el-alert
      v-if="!isTauriRuntime()"
      title="当前是界面预览；个人资料仅保存在 Windows 客户端本机。"
      type="info"
      show-icon
      :closable="false"
    />
    <AppCard class="tabs-card"
      ><el-tabs v-model="activeTab" @tab-change="scrollToSection"
        ><el-tab-pane v-for="tab in tabs" :key="tab.key" :name="tab.key"
          ><template #label
            ><span class="tab-label"
              ><el-icon><component :is="tab.icon" /></el-icon
              >{{ tab.label }}</span
            ></template
          ></el-tab-pane
        ></el-tabs
      ></AppCard
    >
    <AppCard
      id="profile-section-basic"
      class="content-card basic-card profile-section"
      ><div class="section-head">
        <div>
          <h2 class="section-title">
            <el-icon><User /></el-icon>基本信息
          </h2>
          <p>个人身份、联系方式与求职常用信息</p>
        </div>
        <el-button :icon="Edit" @click="openBasic">编辑</el-button>
      </div>
      <div class="basic-layout">
        <div class="photo-panel">
          <div class="photo-frame">
            <img
              v-if="photoUrl && !photoMissing"
              :src="photoUrl"
              alt="个人照片"
              @error="photoMissing = true"
            /><el-icon v-else><UserFilled /></el-icon>
          </div>
          <el-button
            class="photo-button"
            :icon="Camera"
            type="primary"
            @click="changePhoto"
            >{{ basic.photo_path ? "更换照片" : "上传照片" }}</el-button
          >
          <div class="profile-identity">
            <strong>{{ basic.name || "未填写姓名" }}</strong>
            <span>{{ basic.english_name || "未填写英文名" }}</span>
            <em>求职中</em>
          </div>
          <el-button
            v-if="basic.photo_path"
            :icon="Delete"
            link
            type="danger"
            @click="deletePhoto"
            >删除照片</el-button
          ><small>支持 JPG、JPEG、PNG、WEBP</small>
          <small v-if="photoMissing" class="photo-error"
            >原照片文件不存在，请重新上传。</small
          >
        </div>
        <div class="basic-groups">
          <section
            v-for="group in basicGroups"
            :key="group.title"
            class="basic-group"
            :class="`basic-group-${group.keys[0]}`"
          >
            <header class="group-heading">
              <h3>
                <span class="heading-icon"
                  ><el-icon><component :is="group.icon" /></el-icon></span
                >{{ group.title }}
              </h3>
              <span>{{ group.note }}</span>
            </header>
            <dl class="icon-info-grid">
              <template v-for="key in group.keys" :key="key">
                <div
                  v-if="fieldVisible(basicField(key), basic as any)"
                  class="info-cell"
                  :class="{
                    wide: ['mailing_address', 'specialties'].includes(key),
                  }"
                >
                  <span class="field-icon"
                    ><el-icon
                      ><component :is="fieldIcons[key] || Document" /></el-icon
                  ></span>
                  <div>
                    <dt>{{ basicField(key).label }}</dt>
                    <dd>
                      {{ displayValue(basicField(key), (basic as any)[key]) }}
                    </dd>
                  </div>
                </div>
              </template>
            </dl>
          </section>
        </div>
      </div></AppCard
    >
    <AppCard
      v-for="config in entities"
      :id="`profile-section-${config.key}`"
      :key="config.key"
      class="content-card entity-section profile-section"
      ><div class="section-head">
        <div>
          <h2 class="section-title">
            <el-icon><component :is="entityIcons[config.key]" /></el-icon
            >{{ config.title }}
          </h2>
          <p>
            共
            {{ rows[config.key]?.length || 0 }} 条记录，可编辑、排序和展开查看
          </p>
        </div>
        <el-button :icon="Plus" type="primary" @click="openEntity(config)"
          >新增{{ config.title }}</el-button
        >
      </div>
      <div v-if="rows[config.key]?.length" class="record-list">
        <article
          v-for="(row, index) in rows[config.key]"
          :key="row.id"
          class="record-item"
          :class="[
            `record-${config.key}`,
            { expanded: isExpanded(config.table, row.id) },
          ]"
        >
          <div class="record-main">
            <div class="record-identity">
              <span class="record-hero-icon"
                ><el-icon><component :is="entityIcons[config.key]" /></el-icon
              ></span>
              <div class="record-summary">
                <h3>{{ row[config.primary] || "未填写" }}</h3>
                <p v-if="recordDateText(config, row)" class="record-date">
                  <el-icon><Calendar /></el-icon
                  >{{ recordDateText(config, row) }}
                </p>
                <p v-if="recordSubtitle(config, row)" class="record-subtitle">
                  {{ recordSubtitle(config, row) }}
                </p>
                <div
                  v-if="summaryTags(config, row).length"
                  class="summary-tags"
                >
                  <span v-for="tag in summaryTags(config, row)" :key="tag">{{
                    tag
                  }}</span>
                </div>
                <p
                  v-if="config.key === 'projects' && row.description"
                  class="record-excerpt"
                >
                  {{ row.description }}
                </p>
              </div>
            </div>
            <div class="record-actions">
              <el-button
                :icon="ArrowUp"
                :disabled="index === 0"
                title="上移"
                @click="move(config, row, -1)"
              /><el-button
                :icon="ArrowDown"
                :disabled="index === rows[config.key].length - 1"
                title="下移"
                @click="move(config, row, 1)"
              /><el-button
                :icon="Edit"
                title="编辑"
                @click="openEntity(config, row)"
              /><el-button
                :icon="Delete"
                type="danger"
                title="删除"
                @click="remove(config, row)"
              /><el-button
                class="expand-button"
                :icon="isExpanded(config.table, row.id) ? ArrowUp : ArrowDown"
                type="primary"
                @click="toggleExpanded(config.table, row.id)"
                >{{
                  isExpanded(config.table, row.id) ? "收起详情" : "展开详情"
                }}</el-button
              >
            </div>
          </div>
          <div v-show="isExpanded(config.table, row.id)" class="record-details">
            <section
              v-for="group in entityDetailGroups[config.key]"
              :key="group.title"
              class="detail-section"
              :class="[`tone-${group.tone || 'plain'}`]"
            >
              <h4>
                <span class="heading-icon"
                  ><el-icon><component :is="group.icon" /></el-icon></span
                >{{ group.title }}
              </h4>
              <dl class="detail-grid">
                <template
                  v-for="field in groupFields(config, group)"
                  :key="field.key"
                >
                  <div
                    v-if="fieldVisible(field, row)"
                    class="detail-cell"
                    :class="{
                      wide: field.wide || isNarrativeField(field.key),
                      narrative: isNarrativeField(field.key),
                    }"
                  >
                    <span class="field-icon"
                      ><el-icon
                        ><component
                          :is="fieldIcons[field.key] || Document" /></el-icon
                    ></span>
                    <div>
                      <dt>{{ field.label }}</dt>
                      <dd
                        v-if="['phone', 'reference_phone'].includes(field.key)"
                      >
                        <span>{{
                          phoneVisible(config.table, row.id)
                            ? displayValue(field, row[field.key])
                            : maskPhone(row[field.key])
                        }}</span
                        ><el-button
                          :icon="
                            phoneVisible(config.table, row.id) ? Hide : View
                          "
                          link
                          @click="togglePhone(config.table, row.id)"
                        />
                      </dd>
                      <dd
                        v-else-if="
                          field.key === 'responsibilities' &&
                          detailLines(row[field.key]).length
                        "
                        class="numbered-detail"
                      >
                        <span
                          v-for="(line, lineIndex) in detailLines(
                            row[field.key],
                          )"
                          :key="`${field.key}-${lineIndex}`"
                          ><em>{{ lineIndex + 1 }}</em
                          >{{ line }}</span
                        >
                      </dd>
                      <dd v-else>{{ displayValue(field, row[field.key]) }}</dd>
                    </div>
                  </div>
                </template>
              </dl>
            </section>
          </div>
        </article>
      </div>
      <EmptyState
        v-else
        :title="config.empty"
        :description="`点击上方按钮添加${config.title}。`"
        ><el-button :icon="Plus" type="primary" @click="openEntity(config)"
          >添加{{ config.title }}</el-button
        ></EmptyState
      ></AppCard
    >
    <AppCard
      id="profile-section-evaluation"
      class="content-card text-profile-card profile-section"
      ><div class="section-head">
        <div>
          <h2 class="section-title">
            <el-icon><Edit /></el-icon>自我评价
          </h2>
          <p>用于招聘系统中的个人总结</p>
        </div>
        <span>{{ evaluation.length }} 字</span>
      </div>
      <el-input
        v-model="evaluation"
        type="textarea"
        :rows="5"
        placeholder="填写自我评价"
      />
      <div class="save-row">
        <el-button :icon="Finished" type="primary" @click="saveText"
          >保存</el-button
        >
      </div></AppCard
    >
    <AppCard
      id="profile-section-hobbies"
      class="content-card text-profile-card profile-section"
      ><div class="section-head">
        <div>
          <h2 class="section-title">
            <el-icon><Star /></el-icon>兴趣爱好
          </h2>
          <p>可搜索预设兴趣，也可以直接输入自定义标签</p>
        </div>
      </div>
      <el-select
        v-model="hobbyTags"
        class="hobby-select"
        multiple
        filterable
        allow-create
        default-first-option
        clearable
        placeholder="选择或输入兴趣爱好"
        ><el-option
          v-for="option in hobbyOptions"
          :key="option"
          :label="option"
          :value="option" /></el-select
      ><el-input
        v-model="hobbyDescription"
        type="textarea"
        :rows="4"
        placeholder="补充说明"
      />
      <div class="save-row">
        <el-button :icon="Finished" type="primary" @click="saveHobbyData"
          >保存</el-button
        >
      </div></AppCard
    >
    <el-drawer
      v-model="drawerVisible"
      :title="
        drawerMode === 'basic'
          ? '编辑基本信息'
          : `${editingId ? '编辑' : '新增'}${editingConfig?.title || ''}`
      "
      size="min(640px, 92vw)"
      :before-close="closeDrawer"
      ><el-form label-position="top"
        ><div class="form-grid">
          <template
            v-for="field in drawerMode === 'basic'
              ? basicFields
              : editingConfig?.fields || []"
            :key="field.key"
            ><el-form-item
              v-if="fieldVisible(field, form)"
              :label="field.label"
              :required="field.required"
              :class="{ wide: field.wide }"
              ><el-input
                v-if="!field.type || field.type === 'text'"
                v-model="form[field.key]" /><el-input
                v-else-if="field.type === 'textarea'"
                v-model="form[field.key]"
                type="textarea"
                :rows="4" /><el-input-number
                v-else-if="field.type === 'number'"
                v-model="form[field.key]"
                :min="0" /><el-date-picker
                v-else-if="field.type === 'date'"
                v-model="form[field.key]"
                :disabled="fieldDisabled(field, form)"
                type="date"
                value-format="YYYY-MM-DD" /><el-date-picker
                v-else-if="field.type === 'month'"
                v-model="form[field.key]"
                :disabled="fieldDisabled(field, form)"
                type="month"
                value-format="YYYY-MM" /><el-select
                v-else-if="field.type === 'select'"
                v-model="form[field.key]"
                :multiple="field.multiple"
                filterable
                :allow-create="field.allowCreate"
                :default-first-option="field.allowCreate"
                clearable
                ><el-option
                  v-for="option in field.options"
                  :key="option"
                  :label="option"
                  :value="option" /></el-select
              ><el-switch
                v-else
                v-model="form[field.key]"
                @change="handleSwitchChange(field, $event)" /></el-form-item
          ></template></div></el-form
      ><template #footer
        ><el-button @click="drawerVisible = false">取消</el-button
        ><el-button type="primary" @click="saveDrawer"
          >保存</el-button
        ></template
      ></el-drawer
    >
  </div>
</template>

<style scoped lang="scss">
.profile-page,
.content-card {
  min-width: 0;
}
.profile-section {
  scroll-margin-top: 68px;
}
.tabs-card {
  position: sticky;
  top: 0;
  z-index: 5;
  min-width: 0;
  overflow: hidden;
  background: var(--bg-card);
}
.tabs-card :deep(.el-tabs) {
  min-width: 0;
}
.tabs-card :deep(.el-tabs__nav-wrap) {
  max-width: 100%;
  overflow: hidden !important;
}
</style>

<style scoped lang="scss">
.profile-page {
  display: grid;
  align-items: start;
  gap: 16px;
}
.completion {
  border-radius: 999px;
  padding: 7px 11px;
  color: #6254d9;
  background: #f0edff;
  font-size: 12px;
  font-weight: 700;
}
.tabs-card {
  padding: 0 18px;
}
.tabs-card :deep(.el-tabs__header) {
  margin: 0;
}
.tabs-card :deep(.el-tabs__nav-wrap) {
  overflow: auto;
}
.tabs-card :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}
.tabs-card :deep(.el-tabs__item.is-active) {
  color: #6c5ce7;
}
.tabs-card :deep(.el-tabs__active-bar) {
  height: 2px;
  background: #6c5ce7;
}
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.content-card {
  min-height: 0;
  padding: 22px;
}
.content-card :deep(.empty-state) {
  min-height: 150px;
  padding: 24px;
}
.content-card :deep(.empty-mark) {
  width: 46px;
  height: 46px;
  margin-bottom: 10px;
  border-radius: 8px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.section-head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title .el-icon {
  color: #4f6fea;
  font-size: 19px;
}
.section-head p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}
.section-head > span {
  color: var(--text-secondary);
}
.basic-layout {
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr);
  align-items: stretch;
  gap: 20px;
}
.photo-panel {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 22px 16px;
  border: 1px solid #e5e2fb;
  border-radius: 8px;
  background: #f8f7ff;
}
.photo-frame {
  display: grid;
  width: 148px;
  aspect-ratio: 3/4;
  place-items: center;
  overflow: hidden;
  border: 3px solid #fff;
  border-radius: 8px;
  background: #f1effd;
  box-shadow: 0 4px 16px rgba(79, 70, 170, 0.12);
}
.photo-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-frame .el-icon {
  color: #7564e8;
  font-size: 42px;
}
.photo-button {
  margin-top: -26px;
  border: 0;
  background: #6254d9;
}
.profile-identity {
  display: grid;
  justify-items: center;
  gap: 5px;
  margin-top: 6px;
}
.profile-identity strong {
  color: var(--text-primary);
  font-size: 15px;
}
.profile-identity span {
  color: var(--text-secondary);
  font-size: 13px;
}
.profile-identity em {
  border-radius: 999px;
  padding: 4px 10px;
  color: #159a78;
  background: #e4f7f1;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}
.photo-panel small {
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
}
.photo-panel .photo-error {
  max-width: 170px;
  color: var(--danger);
  line-height: 1.45;
  text-align: center;
}
.basic-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 14px;
}
.basic-group {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #ebe9f8;
  border-radius: 8px;
  background: #fff;
}
.basic-group-name,
.basic-group-household_location,
.basic-group-specialties {
  grid-column: 1 / -1;
}
.group-heading {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: #f8f7ff;
}
.group-heading h3,
.detail-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
}
.group-heading > span {
  border-radius: 999px;
  padding: 3px 8px;
  color: #7768d8;
  background: #efedff;
  font-size: 12px;
}
.heading-icon,
.field-icon,
.record-hero-icon {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  color: #6857df;
  background: #f0edff;
}
.heading-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 16px;
}
.icon-info-grid,
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 0 14px;
  margin: 0;
  padding: 4px 12px 8px;
}
.info-cell,
.detail-cell {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 0;
  border-bottom: 1px solid #f0f1f5;
}
.icon-info-grid .wide,
.detail-grid .wide {
  grid-column: span 2;
}
.field-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  font-size: 18px;
}
.info-cell > div,
.detail-cell > div {
  min-width: 0;
  flex: 1;
}
.icon-info-grid dt,
.detail-grid dt {
  margin-bottom: 4px;
  color: var(--text-tertiary);
  font-size: 12px;
}
.icon-info-grid dd,
.detail-grid dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  line-height: 1.65;
  white-space: pre-line;
}
.record-list {
  display: grid;
  gap: 14px;
}
.record-item {
  overflow: hidden;
  border: 1px solid #e8e5f8;
  border-radius: 8px;
  background: var(--bg-card);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.record-item.expanded {
  border-color: #d9d3fb;
  box-shadow: 0 7px 20px rgba(81, 70, 165, 0.08);
}
.record-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 98px;
  padding: 16px 18px;
  background: #fdfdff;
}
.record-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}
.record-hero-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  font-size: 27px;
}
.record-summary {
  min-width: 0;
}
.record-summary h3 {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 15px;
}
.record-date,
.record-subtitle {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}
.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.summary-tags span {
  border-radius: 999px;
  padding: 4px 8px;
  color: #6857df;
  background: #f0edff;
  font-size: 12px;
}
.record-excerpt {
  display: -webkit-box;
  max-width: 820px;
  margin: 8px 0 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.record-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.record-actions .el-button + .el-button {
  margin-left: 0;
}
.record-actions :deep(.el-button:not(.expand-button)) {
  width: 34px;
  height: 34px;
  padding: 0;
}
.record-actions .expand-button {
  min-width: 104px;
  border-color: #6c5ce7;
  background: #6c5ce7;
}
.record-details {
  border-top: 1px solid var(--border-color);
  padding: 18px;
  background: #fff;
}
.detail-section + .detail-section {
  margin-top: 18px;
}
.detail-section h4 {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebe9f8;
}
.detail-section .detail-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 0;
}
.detail-section.tone-accent .detail-grid,
.detail-section.tone-success .detail-grid {
  border-radius: 8px;
  padding: 6px 12px;
  background: #f8f7ff;
}
.detail-section.tone-success .detail-grid {
  background: #f0faf6;
}
.detail-section.tone-success .field-icon {
  color: #14966f;
  background: #def5ec;
}
.detail-cell.narrative {
  grid-column: 1 / -1;
  align-items: flex-start;
}
.numbered-detail {
  display: grid;
  gap: 7px;
}
.numbered-detail > span {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}
.numbered-detail em {
  display: inline-grid;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  place-items: center;
  border-radius: 50%;
  color: #6254d9;
  background: #e9e5ff;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}
.detail-grid dd .el-button {
  margin-left: 5px;
}
.text-profile-card .section-head {
  border-radius: 8px;
  padding: 12px 14px;
  background: #f8f7ff;
}
.text-profile-card .section-title .el-icon {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: #ebe7ff;
}
.text-profile-card :deep(.el-textarea__inner) {
  line-height: 1.75;
}
.save-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
.hobby-select {
  width: 100%;
  margin-bottom: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.form-grid .wide {
  grid-column: 1/-1;
}
.form-grid .el-select,
.form-grid .el-date-editor,
.form-grid .el-input-number {
  width: 100%;
}
@media (max-width: 1200px) {
  .detail-section .detail-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .basic-layout {
    grid-template-columns: 180px minmax(0, 1fr);
  }
}
@media (max-width: 800px) {
  .basic-layout {
    grid-template-columns: 1fr;
  }
  .basic-groups {
    grid-template-columns: 1fr;
  }
  .basic-group {
    grid-column: auto;
  }
  .detail-section .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .record-main {
    align-items: flex-start;
    flex-direction: column;
  }
  .record-actions {
    flex-wrap: wrap;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-grid .wide {
    grid-column: auto;
  }
}
@media (max-width: 560px) {
  .icon-info-grid,
  .detail-section .detail-grid {
    grid-template-columns: 1fr;
  }
  .icon-info-grid .wide,
  .detail-grid .wide {
    grid-column: auto;
  }
}
</style>
